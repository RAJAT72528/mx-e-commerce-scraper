import { Page, Browser } from 'playwright';

// Define the OrderItem interface
export interface OrderItem {
  productName: string;
  price: string;
  orderDate: string;
  link?: string;
}

/**
 * Initialize browser and page
 * @returns Browser and page instances
 */
export async function initBrowser(): Promise<{ browser: Browser; page: Page }> {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, page };
}

/**
 * Navigate to Amazon login page
 * @param page Playwright page instance
 */
export async function navigateToAmazonLogin(page: Page): Promise<void> {
  await page.goto('https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0', { 
    waitUntil: 'load'
  });
  
  // Add a short delay after page load for any JS to initialize
  await page.waitForTimeout(1000);
}

/**
 * Enter username (email or phone)
 * @param page Playwright page instance
 * @param username User's email or phone number
 * @returns Boolean indicating success
 */
export async function enterUsername(page: Page, username: string): Promise<boolean> {
  try {
    // Check the current state of login form
    console.log("Checking current state of login form...");
    
    // Take a screenshot to debug
    await page.screenshot({ path: 'login-page-state.png' });
    
    // Debug - log the current URL
    console.log(`Current URL: ${page.url()}`);
    
    // Check specifically for the "Invalid mobile number" error
    const hasInvalidMobileError = await page.isVisible('.a-alert-content:has-text("Invalid mobile number")');
    if (hasInvalidMobileError) {
      console.error('Invalid mobile number detected');
      await page.screenshot({ path: 'invalid-mobile-error.png' });
      return false;
    }
    
    // Wait for the visible email field
    await page.fill('#ap_email', username);
    console.log(`Entered username: ${username}`);
    
    // Click the continue button
    await page.click('#continue');
    console.log('Clicked continue button');
    
    // Wait briefly for any navigation or DOM changes
    await page.waitForTimeout(2000);
    
    // Check specifically for the "Invalid mobile number" error
    const hasInvalidMobileErrorAfterContinue = await page.isVisible('.a-alert-content:has-text("Invalid mobile number")');
    if (hasInvalidMobileErrorAfterContinue) {
      console.error('Invalid mobile number detected');
      await page.screenshot({ path: 'invalid-mobile-error.png' });
      return false;
    }
    
    // Check for any other alert messages
    const hasOtherAlert = await page.isVisible('.a-alert-content');
    if (hasOtherAlert) {
      const errorText = await page.textContent('.a-alert-content') || '';
      console.log(`Alert found after continuing: "${errorText}"`);
      
      // Check for specific error messages that indicate credential problems
      if (errorText.toLowerCase().includes('find') || 
          errorText.toLowerCase().includes('cannot') || 
          errorText.toLowerCase().includes('problem') ||
          errorText.toLowerCase().includes('invalid')) {
        console.error(`Username error: ${errorText}`);
        await page.screenshot({ path: 'username-error.png' });
        return false;
      }
    }
    
    // Look for the password field to confirm we've moved to the next step
    const onPasswordPage = await page.isVisible('#ap_password', { timeout: 5000 });
    if (onPasswordPage) {
      console.log('Successfully transitioned to password page');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error entering username:', error);
    return false;
  }
}

/**
 * Enter password 
 * @param page Playwright page instance
 * @param password User's password
 * @returns Boolean indicating success
 */
export async function enterPassword(page: Page, password: string): Promise<boolean> {
  try {
    // Fill in the password
    await page.fill('#ap_password', password);
    
    // Click sign-in button
    console.log("Clicking sign-in button...");
    await page.click('#signInSubmit');
    
    // Wait briefly for error message or navigation
    await page.waitForTimeout(2000);
    
    // First check specifically for the "Your password is incorrect" error message
    const incorrectPasswordError = await page.isVisible('.a-alert-content:has-text("Your password is incorrect")');
    if (incorrectPasswordError) {
      console.error('Incorrect password detected');
      await page.screenshot({ path: 'incorrect-password-error.png' });
      return false;
    }
    
    // Check for other error messages
    const otherErrorVisible = await page.isVisible('.a-alert-content, .a-box-inner .a-alert-container');
    if (otherErrorVisible) {
      const errorText = await page.textContent('.a-alert-content, .a-box-inner .a-alert-container') || '';
      console.error(`Login error: ${errorText.trim()}`);
      return false;
    }
    
    // If no error, wait for navigation to complete
    console.log("Waiting for navigation after sign-in...");
    await page.waitForNavigation({ 
      waitUntil: 'load',
      timeout: 45000 // Increased timeout to 45 seconds for slower connections
    });
    
    return true;
  } catch (error) {
    console.error('Error entering password:', error);
    return false;
  }
}

/**
 * Check if credentials were invalid
 * @param page Playwright page instance
 * @returns Boolean indicating if credentials were invalid
 */
export async function checkInvalidCredentials(page: Page): Promise<boolean> {
  try {
    // Check for error messages
    const hasError = await page.isVisible('.a-alert-content');
    if (hasError) {
      const errorText = await page.textContent('.a-alert-content') || '';
      console.error(`Login error: ${errorText}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking invalid credentials:', error);
    return false;
  }
}

/**
 * Check if OTP/MFA is required
 * @param page Playwright page instance
 * @returns Boolean indicating if OTP/MFA is required
 */
export async function isMFARequired(page: Page): Promise<boolean> {
  try {
    // Check the current URL to see if we're on the OTP page
    const currentUrl = page.url();
    console.log(`Checking if OTP is required. Current URL: ${currentUrl}`);
    
    // Take a screenshot to help debug
    await page.screenshot({ path: 'possible-otp-page.png' });
    
    // Check if we're on the OTP page by URL pattern
    if (currentUrl.includes('/ap/signin') && 
        currentUrl.includes('openid.pape.max_auth_age=0')) {
      console.log('Potential OTP page detected by URL pattern');
      
      // Look for OTP input field or MFA-related text
      const mfaSelectors = [
        '#auth-mfa-otpcode', // OTP input field
        '.auth-mfa-form', // MFA form container
        '#auth-mfa-remember-device', // Remember device checkbox for MFA
        'input[name="otpCode"]', // Generic OTP input
        'form:has-text("Two-Step Verification")', // Text-based detection
        'form:has-text("Two-Factor Authentication")', // Text-based detection
        'form:has-text("Enter the OTP")', // Text-based detection for India
        '#auth-mfa-form', // Another possible MFA form ID
        '[data-a-target="mfa-otp-field"]', // Possible attribute for OTP field
        'input[placeholder*="verification"]', // Input with verification in placeholder
        'input[type="tel"]' // Often used for OTP inputs
      ];
      
      for (const selector of mfaSelectors) {
        // Use a shorter timeout for each individual selector check
        if (await page.isVisible(selector, { timeout: 2000 })) {
          console.log(`OTP requirement detected with selector: ${selector}`);
          return true;
        }
      }
      
      // Look for specific text content that would indicate OTP
      const pageText = await page.textContent('body');
      if (pageText) {
        const otpTextIndicators = [
          'verification code',
          'two-step verification',
          'two-factor authentication',
          'security code',
          'enter the code',
          'otp',
          'one-time password',
          'authentication code',
          'mobile number we have on record',
          'enter the otp',
          'sent to your mobile'
        ];
        
        for (const indicator of otpTextIndicators) {
          if (pageText.toLowerCase().includes(indicator)) {
            console.log(`OTP requirement detected from text: "${indicator}"`);
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking OTP requirement:', error);
    return false;
  }
}

/**
 * Submit OTP code
 * @param page Playwright page instance
 * @param otpCode OTP code provided by user
 * @returns Boolean indicating success
 */
export async function submitMFACode(page: Page, otpCode: string): Promise<boolean> {
  try {
    // Take a screenshot of the OTP page
    await page.screenshot({ path: 'otp-page.png' });
    
    // Check if we're on the expected OTP page
    const currentUrl = page.url();
    console.log(`Submitting OTP on page: ${currentUrl}`);
    
    // Check for Amazon's specific OTP URL pattern
    if (currentUrl.includes('/ap/signin') && 
        currentUrl.includes('openid.pape.max_auth_age=0')) {
      console.log('Detected Amazon signin OTP page');
    }
    
    // Try different possible OTP input fields
    const otpInputSelectors = [
      '#auth-mfa-otpcode',
      'input[name="otpCode"]',
      'input[id*="mfa"]',
      'input[id*="otp"]',
      'input[name*="mfa"]',
      'input[name*="otp"]',
      'input[placeholder*="code"]',
      '[data-a-target="mfa-otp-field"]',
      'input[type="tel"]', // Sometimes OTP fields use tel type
      'input[type="text"]', // Generic text input
      'input.a-input-text' // Amazon's generic input class
    ];
    
    let inputField = null;
    for (const selector of otpInputSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 2000 });
      if (isVisible) {
        inputField = selector;
        console.log(`Found OTP input field with selector: ${selector}`);
        break;
      }
    }
    
    if (!inputField) {
      console.error('Could not find OTP input field');
      return false;
    }
    
    // Clear the field first in case it has any content
    await page.fill(inputField, '');
    
    // Fill in the OTP code
    await page.fill(inputField, otpCode);
    console.log(`Entered OTP code: ${otpCode.replace(/./g, '*')}`);
    
    // Try different submit button selectors
    const submitButtonSelectors = [
      '#auth-signin-button',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Verify")',
      'button:has-text("Submit")',
      'button:has-text("Continue")',
      '.a-button-input',
      '[aria-labelledby*="submit"]',
      'form .a-button-primary',
      'input.a-button-input'
    ];
    
    let submitButton = null;
    for (const selector of submitButtonSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 2000 });
      if (isVisible) {
        submitButton = selector;
        console.log(`Found OTP submit button with selector: ${selector}`);
        break;
      }
    }
    
    if (!submitButton) {
      console.error('Could not find OTP submit button');
      return false;
    }
    
    // Click the submit button
    await page.click(submitButton);
    console.log('Clicked OTP submit button');
    
    // Wait for navigation to complete
    await page.waitForNavigation({ 
      waitUntil: 'load',
      timeout: 15000 
    });
    
    // Take a screenshot after OTP submission
    await page.screenshot({ path: 'after-otp-submission.png' });
    
    // Check if OTP was incorrect by seeing if we're still on the OTP page
    const stillOnOTPPage = await isMFARequired(page);
    
    // Check for error messages
    const hasError = await page.isVisible('.a-alert-content, .a-box-inner .a-alert-container', { timeout: 2000 });
    
    if (stillOnOTPPage || hasError) {
      const errorText = await page.textContent('.a-alert-content, .a-box-inner .a-alert-container') || 'Invalid OTP code';
      console.error(`OTP error: ${errorText.trim()}`);
      return false;
    }
    
    console.log('OTP verification successful');
    return true;
  } catch (error) {
    console.error('Error submitting OTP code:', error);
    return false;
  }
}

/**
 * Navigate to Amazon order history
 * @param page Playwright page instance
 * @returns Boolean indicating success
 */
export async function navigateToOrderHistory(page: Page): Promise<boolean> {
  try {
    // Look for and click on Orders link
    const orderButton = await page.$('#nav-orders, a[href*="order-history"]');
    if (orderButton) {
      // Click on the orders link if found
      await orderButton.click();
      
      // Instead of waiting for navigation, wait for order page content to appear
      console.log('Waiting for order page elements to appear...');
      try {
        // Add selectors matching exactly what we see in the screenshot
        const orderPageIndicators = [
          '.your-orders-content',
          '.order-card',
          '.a-box-group',
          'a:has-text("Buy it again")',
          '#ordersContainer',
          '#yourOrders',
          'h1:has-text("Your Orders")',
          // Add these specific selectors from the screenshot
          'text=Your Orders',
          '.shipping-address',
          'text=Buy Again',
          'text=Not Yet Shipped',
          'text=orders placed in',
          '#orderTypeMenuContainer',
          '.a-pagination',
          '.order',
          '.time-filter-dropdown',
          '#nav-orders'
        ];
        
        // Wait longer and check more frequently
        let orderPageLoaded = false;
        for (let attempt = 0; attempt < 10 && !orderPageLoaded; attempt++) {
          console.log(`Order page check attempt ${attempt + 1}...`);
          
          // Check the URL first as the most reliable indicator
          const currentUrl = page.url();
          if (currentUrl.includes('order-history') || 
              currentUrl.includes('your-orders') || 
              currentUrl.includes('gp/css/order-history')) {
            console.log(`Order page URL detected: ${currentUrl}`);
            await page.waitForTimeout(3000); // Give page content time to load
            orderPageLoaded = true;
            break;
          }
          
          // Check each selector
          for (const selector of orderPageIndicators) {
            try {
              const isVisible = await page.isVisible(selector, { timeout: 3000 });
              if (isVisible) {
                console.log(`Order page loaded, found indicator: ${selector}`);
                orderPageLoaded = true;
                break;
              }
            } catch (e) {
              // Continue checking other selectors
            }
          }
          
          if (!orderPageLoaded) {
            await page.waitForTimeout(2000); // Wait before next attempt
          }
        }
        
        // Take a screenshot of the current state
        await page.screenshot({ path: 'order-page-check.png' });
        
        if (orderPageLoaded) {
          return true;
        }
        
        console.error('Timed out waiting for orders page content');
        return false;
      } catch (error) {
        console.error('Error while waiting for orders page:', error);
        
        // Take a screenshot to see what's on the page
        await page.screenshot({ path: 'orders-page-error.png' });
        
        // Check if we're on the orders page despite the error
        const url = page.url();
        if (url.includes('order-history') || url.includes('your-orders')) {
          console.log('URL indicates we might be on the orders page, proceeding');
          return true;
        }
        
        return false;
      }
    }
    
    // Direct navigation as last resort
    console.log('Using direct URL navigation to orders page...');
    await page.goto('https://www.amazon.in/gp/css/order-history', { 
      waitUntil: 'load',
      timeout: 30000
    });
    
    // Wait for any order page elements after direct navigation
    console.log('Checking for order page elements after direct navigation...');
    const orderPageIndicators = [
      '.your-orders-content',
      '.order-card',
      '.a-box-group',
      'a:has-text("Buy it again")',
      '#ordersContainer',
      '#yourOrders',
      'h1:has-text("Your Orders")'
    ];
    
    // Look for any order page indicators
    for (const selector of orderPageIndicators) {
      try {
        const isVisible = await page.isVisible(selector, { timeout: 5000 });
        if (isVisible) {
          console.log(`Order page loaded after direct navigation, found: ${selector}`);
          return true;
        }
      } catch (error) {
        // Continue trying other selectors
      }
    }
    
    // If we got here, check the URL as a last resort
    const currentUrl = page.url();
    if (currentUrl.includes('order-history') || currentUrl.includes('your-orders')) {
      console.log('URL indicates we might be on the orders page, proceeding');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error navigating to order history:', error);
    return false;
  }
}

/**
 * Select a specific year for orders
 * @param page Playwright page instance
 * @param year Year to select
 * @returns Boolean indicating success
 */
export async function selectOrderYear(page: Page, year: number): Promise<boolean> {
  try {
    // Amazon uses query parameters or path segments for year filtering
    await page.goto(`https://www.amazon.in/your-orders/orders?timeFilter=year-${year}`, {
      waitUntil: 'load',
      timeout: 30000
    });
    
    // Wait for order content after direct navigation
    console.log('Waiting for order content after direct year navigation...');
    await page.waitForTimeout(5000);
    
    // Check if we see any orders
    const orderElementsVisible = await page.isVisible(
      '.your-orders-content, .order-card, .a-box-group, div[class*="order"]',
      { timeout: 8000 }
    );
    
    if (orderElementsVisible) {
      console.log(`Successfully accessed ${year} orders via direct URL`);
      return true;
    } else {
      // Take a screenshot to see what's happening
      await page.screenshot({ path: `year-direct-navigation-${year}.png` });
      console.warn(`Direct navigation to ${year} shows no visible orders, but continuing`);
      return true; // Return true anyway to allow scraping to continue
    }
  } catch (error) {
    console.error(`Error selecting year ${year}:`, error);
    return false;
  }
}

/**
 * Extract orders from the current page
 * @param page Playwright page instance
 * @returns Array of OrderItem objects
 */
export async function extractOrders(page: Page): Promise<any[]> {
  try {
    // Extract orders directly using page.evaluate to handle multiple items per order
    const orders = await page.evaluate(() => {
      const result: Array<any> = [];
      const baseUrl = 'https://www.amazon.in';
      
      // Find all order cards
      const orderCards = Array.from(document.querySelectorAll('.order-card.js-order-card'));
      
      orderCards.forEach(orderCard => {
        // Extract common information for the order
        const orderGroup = orderCard.querySelector('.a-box-group');
        if (!orderGroup) return;
        
        // Extract price - same for all items in the order
        const priceElement = orderGroup.querySelector('.a-column.a-span2 .a-size-base');
        const price = priceElement && priceElement.textContent ? priceElement.textContent.trim() : 'N/A';
        
        // Extract the actual date using the correct selector
        const dateElement = orderGroup.querySelector('.a-column.a-span3 .a-size-base');
        const orderDate = dateElement && dateElement.textContent ? dateElement.textContent.trim() : 'N/A';
        
        // Check for multiple delivery boxes (multiple items in one order)
        const deliveryBoxes = orderGroup.querySelectorAll('.a-box.delivery-box');
        
        // Create order object with common data
        const orderEntry: any = {
          orderDate,
          price,
          items: [] // Will hold all items in this order
        };
        
        if (deliveryBoxes.length > 0) {
          // Multiple items case: iterate through each delivery box
          deliveryBoxes.forEach(box => {
            // Try to extract product info
            let productName = '';
            let link = '';
            
            // Try for regular product
            const productElement = box.querySelector('.yohtmlc-product-title a');
            if (productElement && productElement.textContent) {
              productName = productElement.textContent.trim();
              let href = productElement.getAttribute('href') || '';
              // Make link absolute
              link = href.startsWith('http') ? href : `${baseUrl}${href}`;
            }
            
            // Only add if we found a product name
            if (productName) {
              orderEntry.items.push({
                productName,
                link
              });
            }
          });
        } else {
          // Single item case or movie/digital content
          let productName = '';
          let link = '';
          
          // Try for regular product first
          const productElement = orderGroup.querySelector('.yohtmlc-product-title a');
          if (productElement && productElement.textContent) {
            productName = productElement.textContent.trim();
            let href = productElement.getAttribute('href') || '';
            // Make link absolute
            link = href.startsWith('http') ? href : `${baseUrl}${href}`;
          } else {
            // Try for movie/digital content
            const movieElement = orderGroup.querySelector('.yohtmlc-item a');
            if (movieElement && movieElement.textContent) {
              productName = movieElement.textContent.trim();
              let href = movieElement.getAttribute('href') || '';
              // Make link absolute
              link = href.startsWith('http') ? href : `${baseUrl}${href}`;
            }
          }
          
          // Only add if we found a product name
          if (productName) {
            orderEntry.items.push({
              productName,
              link
            });
          }
        }
        
        // Only add orders that have items
        if (orderEntry.items.length > 0) {
          result.push(orderEntry);
        }
      });
      
      return result;
    });
    
    console.log(`Extracted ${orders.length} orders with a total of ${orders.reduce((sum, order) => sum + order.items.length, 0)} items`);
    return orders;
  } catch (error) {
    console.error('Error extracting orders:', error);
    return [];
  }
}