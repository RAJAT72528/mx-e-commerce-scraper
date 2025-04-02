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
  checkInvalidCredentials,
  isMFARequired,
  submitMFACode,
  navigateToOrderHistory,
  selectOrderYear,
  extractOrders,
  OrderItem
} from './utils/scraper';

async function promptForCredentials(attemptsLeft = 5): Promise<{ username: string; password: string } | null> {
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
        const { isValid, type } = validateCredentials(input);
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

async function promptForMFA(attemptsLeft = 5): Promise<string | null> {
  if (attemptsLeft <= 0) {
    console.error('Maximum MFA attempts reached. Exiting...');
    return null;
  }

  const { mfaCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'mfaCode',
      message: 'Enter the MFA code sent to your device:',
      validate: (input) => {
        return input.trim().length > 0 || 'MFA code cannot be empty.';
      }
    }
  ]);

  return mfaCode;
}

async function handleLogin(): Promise<{ success: boolean; page: any } | null> {
  // Initialize browser
  const { browser, page } = await initBrowser();
  
  try {
    // Navigate to Amazon login page
    await navigateToAmazonLogin(page);
    
    let loginSuccessful = false;
    let attemptsLeft = 5;
    
    while (!loginSuccessful && attemptsLeft > 0) {
      // Get credentials from user
      const credentials = await promptForCredentials(attemptsLeft);
      if (!credentials) {
        await browser.close();
        return null;
      }
      
      // Enter username
      const usernameEntered = await enterUsername(page, credentials.username);
      if (!usernameEntered) {
        console.error('Error entering username. Please try again.');
        attemptsLeft--;
        continue;
      }
      
      // Enter password
      const passwordEntered = await enterPassword(page, credentials.password);
      if (!passwordEntered) {
        console.error('Error entering password. Please try again.');
        attemptsLeft--;
        continue;
      }
      
      // Check if credentials were invalid
      const invalidCredentials = await checkInvalidCredentials(page);
      if (invalidCredentials) {
        console.error('Invalid credentials. Please try again.');
        attemptsLeft--;
        // Refresh page to retry login
        await navigateToAmazonLogin(page);
        continue;
      }
      
      // Check if MFA is required
      const mfaRequired = await isMFARequired(page);
      if (mfaRequired) {
        let mfaAttemptsLeft = 5;
        let mfaSuccessful = false;
        
        while (!mfaSuccessful && mfaAttemptsLeft > 0) {
          // Prompt for MFA code
          const mfaCode = await promptForMFA(mfaAttemptsLeft);
          if (!mfaCode) {
            await browser.close();
            return null;
          }
          
          // Submit MFA code
          mfaSuccessful = await submitMFACode(page, mfaCode);
          if (!mfaSuccessful) {
            console.error('Invalid MFA code. Please try again.');
            mfaAttemptsLeft--;
          }
        }
        
        if (!mfaSuccessful) {
          console.error('Failed to verify MFA. Exiting...');
          await browser.close();
          return null;
        }
      }
      
      // If we reach here, login was successful
      loginSuccessful = true;
    }
    
    if (!loginSuccessful) {
      console.error('Failed to log in after multiple attempts. Exiting...');
      await browser.close();
      return null;
    }
    
    return { success: true, page };
  } catch (error) {
    console.error('Unexpected error during login:', error);
    await browser.close();
    return null;
  }
}

async function scrapeOrders(page: any): Promise<OrderItem[]> {
  // Navigate to order history
  const navigated = await navigateToOrderHistory(page);
  if (!navigated) {
    console.error('Failed to navigate to order history.');
    return [];
  }
  
  const ordersCollected: OrderItem[] = [];
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
    
    // Close browser
    if (loginResult.page.browser) {
      await loginResult.page.browser().close();
    }
    
    console.log('Scraping completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main(); 