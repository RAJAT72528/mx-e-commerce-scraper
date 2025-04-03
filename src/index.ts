/**
 * Main entry point for the scraper application
 */
import inquirer from 'inquirer';
import { validateCredentials, validatePassword } from './utils/validators';
import {
  initBrowser,
  navigateToAmazonLogin,
  enterUsername,
  enterPassword,
  isMFARequired,
  submitMFACode,
  navigateToOrderHistory,
  selectOrderYear,
  extractOrders,
  Order,
  LoginResult,
  Credentials,
  Page
} from './utils/scraper';

async function promptForCredentials(attemptsLeft = 5): Promise<Credentials | null> {
  if (attemptsLeft <= 0) {
    console.error('Maximum attempts reached. Exiting...');
    return null;
  }

  const { username } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Enter your Amazon.in email or phone number:',
      validate: (input) => {
        const { isValid } = validateCredentials(input);
        if (isValid) return true;
        return 'Please enter a valid email (with @.com) or a 10-digit phone number.';
      }
    }
  ]);

  const { password } = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message: 'Enter your password:',
      mask: '*',
      validate: (input) => {
        return validatePassword(input) || 'Password cannot be empty.';
      }
    }
  ]);

  return { username, password };
}

/**
 * Prompt user for OTP code
 * @param attemptsLeft Number of attempts remaining
 * @returns OTP code or null if user cancels
 */
async function promptForMFA(attemptsLeft: number): Promise<string | null> {
  const questions = [
    {
      type: 'input',
      name: 'otpCode',
      message: `Enter the OTP sent to your mobile (${attemptsLeft} attempts left):`,
    }
  ];

  try {
    const answers = await inquirer.prompt(questions);
    return answers.otpCode;
  } catch (error) {
    console.error('Error prompting for OTP:', error);
    return null;
  }
}

/**
 * Prompt user for password only
 * @returns Password or null if user cancels
 */
async function promptForPassword(): Promise<string | null> {
  const questions = [
    {
      type: 'password',
      name: 'password',
      message: 'Enter your password:',
      mask: '*'
    }
  ];

  try {
    const answers = await inquirer.prompt(questions);
    return answers.password;
  } catch (error) {
    console.error('Error prompting for password:', error);
    return null;
  }
}

async function handleLogin(): Promise<LoginResult | null> {
  // Initialize browser
  const { browser, page } = await initBrowser();
  
  try {
    // Navigate to Amazon login page
    await navigateToAmazonLogin(page);
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    let loginSuccessful = false;
    
    // Get credentials from user
    const credentials = await promptForCredentials();
    if (!credentials) {
      await browser.close();
      return null;
    }
    
    // First attempt: Enter username
    console.log(`Attempting to log in with ${credentials.username}`);
    let usernameEntered = await enterUsername(page, credentials.username);
    
    // If username is invalid, prompt for a new one up to 3 times
    let usernameAttempts = 3;
    while (!usernameEntered && usernameAttempts > 1) {
      usernameAttempts--;
      console.log(`Invalid username. ${usernameAttempts} attempts remaining.`);
      
      // Take a screenshot to help diagnose
      await page.screenshot({ path: `invalid-username-${usernameAttempts}.png` });
      
      // Prompt for a new username
      const newCredentials = await promptForCredentials();
      if (!newCredentials) {
        await browser.close();
        return null;
      }
      
      // Try with the new username
      console.log(`Retrying with username: ${newCredentials.username}`);
      usernameEntered = await enterUsername(page, newCredentials.username);
    }
    
    if (!usernameEntered) {
      console.error("Failed to enter a valid username after multiple attempts");
      await browser.close();
      return null;
    }
    
    // Username accepted, now enter password
    console.log("Username accepted, proceeding to password entry");
    let passwordEntered = await enterPassword(page, credentials.password);
    
    // If password is incorrect, prompt for a new one up to 3 times
    let passwordAttempts = 3;
    while (!passwordEntered && passwordAttempts > 1) {
      passwordAttempts--;
      console.log(`Incorrect password. ${passwordAttempts} attempts remaining.`);
      
      // Take a screenshot to help diagnose
      await page.screenshot({ path: `incorrect-password-${passwordAttempts}.png` });
      
      // Prompt for a new password
      const newPassword = await promptForPassword();
      if (!newPassword) {
        await browser.close();
        return null;
      }
      
      // Try with the new password
      console.log("Retrying with new password");
      passwordEntered = await enterPassword(page, newPassword);
    }
    
    if (!passwordEntered) {
      console.error("Failed to enter a valid password after multiple attempts");
      await browser.close();
      return null;
    }
    
    // Check if OTP is required after password validation
    const otpRequired = await isMFARequired(page);
    if (otpRequired) {
      console.log("OTP verification required");
      
      let otpSuccess = false;
      let otpAttempts = 3;
      
      while (!otpSuccess && otpAttempts > 0) {
        // Prompt for OTP
        const otpCode = await promptForMFA(otpAttempts);
        if (!otpCode) {
          await browser.close();
          return null;
        }
        
        // Submit OTP
        console.log("Submitting OTP code");
        otpSuccess = await submitMFACode(page, otpCode);
        
        if (!otpSuccess) {
          console.error("Invalid OTP code");
          otpAttempts--;
        }
      }
      
      if (!otpSuccess) {
        console.error("Failed to verify OTP after multiple attempts");
        await browser.close();
        return null;
      }
    }
    
    // Final check to verify we're logged in
    await page.waitForTimeout(3000);
    
    // Check if we're still on any login pages
    const stillOnLoginPage = await page.isVisible('#ap_password, #ap_email, .auth-workflow');
    if (stillOnLoginPage) {
      console.error("Still on login page after all steps. Login failed.");
      await browser.close();
      return null;
    }
    
    console.log("Login successful!");
    loginSuccessful = true;
    
    return { success: loginSuccessful, page };
  } catch (error) {
    console.error('Unexpected error during login:', error);
    // Final error screenshot
    await page.screenshot({ path: 'login-unexpected-error.png' });
    await browser.close();
    return null;
  }
}

async function scrapeOrders(page: Page): Promise<Order[]> {
  // Navigate to order history
  console.log('Navigating to order history page...');
  const navigatedToOrderHistory = await navigateToOrderHistory(page);
  if (!navigatedToOrderHistory) {
    console.error('Failed to navigate to order history.');
    
    // Take a screenshot to see the current state
    await page.screenshot({ path: 'orders-page-state.png' });
    
    // Check URL to see if we might be on orders page despite detection failure
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const possibleOrderUrls = [
      'order-history',
      'your-orders',
      'gp/css/order-history',
      'gp/your-account/order-history'
    ];
    
    const mightBeOnOrdersPage = possibleOrderUrls.some(urlPart => currentUrl.includes(urlPart));
    
    if (mightBeOnOrdersPage) {
      console.log('URL suggests we might be on the orders page, proceeding with extraction attempt...');
      const orders = await extractOrders(page);
      console.log(orders);
      return orders;
    }
    
    return [];
  }
  
  const ordersCollected: Order[] = [];
  const currentYear = new Date().getFullYear();
  let yearsScraped = 0;
  
  // Iterate through years until we have 10 orders or have gone back 5 years
  for (let year = currentYear; year >= currentYear - 4 && ordersCollected.length < 10 && yearsScraped < 5; year--) {
    // Select the year in the dropdown
    const yearSelected = await selectOrderYear(page, year);
    if (!yearSelected) {
      console.error(`Failed to select year ${year}. Continuing with next year...`);
      continue;
    }
    
    // Extract orders from the current page
    const orders = await extractOrders(page);
    
    // Add orders to our collection
    ordersCollected.push(...orders);
    
    yearsScraped++;
  }
  
  // Return up to 10 orders
  return ordersCollected.slice(0, 10);
}

async function main() {
  console.log('Amazon Order Scraper initialized');
  
  try {
    // Handle login process
    const loginResult = await handleLogin();
    if (!loginResult || !loginResult.success) {
      console.error('Login failed. Exiting...');
      process.exit(1);
    }
    
    console.log('Login successful. Scraping orders...');
    
    // Scrape orders
    const orders = await scrapeOrders(loginResult.page);
    
    // Output orders as JSON
    console.log(JSON.stringify(orders, null, 2));
    
    // Save orders to file
    const fs = await import('fs');
    const outputFile = 'order-history-extract.json';
    
    try {
      // Write the JSON data to file, overwriting if it exists
      fs.writeFileSync(outputFile, JSON.stringify(orders, null, 2));
      console.log(`Order data saved to ${outputFile}`);
    } catch (fileError: unknown) {
      const error = fileError as Error;
      console.error(`Error saving to file: ${error.message}`);
    }
    
    // Close browser
    const result = loginResult as { success: boolean; page: any };
    if (result.page.browser && typeof result.page.browser === 'function') {
      await result.page.browser().close();
    } else if (result.page.context && typeof result.page.context === 'function') {
      // Alternative way to close the browser via context
      const context = await result.page.context();
      const browser = context.browser();
      if (browser) {
        await browser.close();
      }
    }
    
    console.log('Scraping completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main(); 