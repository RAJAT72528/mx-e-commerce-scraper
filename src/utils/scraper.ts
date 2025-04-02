/**
 * Scraper utility functions
 */

import { Page, Browser, chromium } from 'playwright';

/**
 * Launch browser and create new page
 * @returns Object containing browser and page instances
 */
export async function initBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({
    headless: false, // Set to true in production
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, page };
}

/**
 * Navigate to Amazon login page
 * @param page Playwright page instance
 */
export async function navigateToAmazonLogin(page: Page): Promise<void> {
  await page.goto('https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0', { waitUntil: 'networkidle' });
}

/**
 * Check if the page has CAPTCHA verification
 * @param page Playwright page instance
 * @returns Boolean indicating if CAPTCHA is present
 */
export async function checkForCaptcha(page: Page): Promise<boolean> {
  try {
    // Look for common CAPTCHA elements
    const captchaSelectors = [
      '.captcha-container',
      '#captchacharacters',
      'img[src*="captcha"]',
      'input[name="captchacharacters"]',
      '.a-box-inner:has-text("characters you see")'
    ];
    
    for (const selector of captchaSelectors) {
      if (await page.isVisible(selector, { timeout: 3000 })) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // If error occurs, assume no CAPTCHA for safety
    return false;
  }
}

/**
 * Prompt user to solve CAPTCHA
 * @param page Playwright page instance
 * @returns Boolean indicating success
 */
export async function handleCaptcha(page: Page): Promise<boolean> {
  console.log('\n⚠️ CAPTCHA detected! ⚠️');
  console.log('Please solve the CAPTCHA in the browser window.');
  console.log('The program will continue automatically after you solve it.');
  console.log('Press Enter in the browser after completing the CAPTCHA.\n');
  
  try {
    // Wait for user to solve CAPTCHA and press Enter/Continue
    await Promise.race([
      page.waitForNavigation({ timeout: 120000 }), // 2 minutes timeout
      page.waitForSelector('#ap_password', { timeout: 120000 })
    ]);
    
    return true;
  } catch (error) {
    console.error('CAPTCHA handling timed out or failed:', error);
    return false;
  }
}

/**
 * Enter username (email or phone)
 * @param page Playwright page instance
 * @param username User's email or phone number
 * @returns Boolean indicating success
 */
export async function enterUsername(page: Page, username: string): Promise<boolean> {
  try {
    // Check for CAPTCHA before proceeding
    const hasCaptcha = await checkForCaptcha(page);
    if (hasCaptcha) {
      const captchaSolved = await handleCaptcha(page);
      if (!captchaSolved) {
        return false;
      }
      
      // After CAPTCHA is solved, we might already be at password page
      // Check if we need to enter username
      const needUsername = await page.isVisible('#ap_email', { timeout: 3000 });
      if (!needUsername) {
        return true; // Already passed username page
      }
    }
    
    // Wait for the email field to be available
    await page.waitForSelector('#ap_email', { timeout: 10000 });
    
    // Fill in the username
    await page.fill('#ap_email', username);
    
    // Click the continue button
    await page.click('#continue');
    
    // Wait for either password field or an error
    try {
      await page.waitForSelector('#ap_password, .a-alert-content', { timeout: 5000 });
      
      // Check if there was an error with the username
      const hasError = await page.isVisible('.a-alert-content');
      if (hasError) {
        const errorText = await page.textContent('.a-alert-content');
        console.error(`Username error: ${errorText}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Timeout waiting for password field or error message:', error);
      return false;
    }
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
    // Check if we need to handle CAPTCHA
    const hasCaptcha = await checkForCaptcha(page);
    if (hasCaptcha) {
      const captchaSolved = await handleCaptcha(page);
      if (!captchaSolved) {
        return false;
      }
    }
    
    // Wait for password field with a longer timeout
    await page.waitForSelector('#ap_password', { timeout: 10000 });
    
    // Fill password field
    await page.fill('#ap_password', password);
    
    // Check for "Keep me signed in" checkbox and ensure it's unchecked
    // This ensures more consistent behavior across sessions
    try {
      const rememberMeSelector = '#rememberMe';
      const isVisible = await page.isVisible(rememberMeSelector);
      if (isVisible) {
        const isChecked = await page.$eval(rememberMeSelector, el => (el as HTMLInputElement).checked);
        if (isChecked) {
          await page.click(rememberMeSelector);
        }
      }
    } catch (error) {
      // Not critical if this fails, continue with login
      console.warn('Could not manage "Remember me" checkbox:', error);
    }
    
    // Click sign-in button
    await page.click('#signInSubmit');
    
    // Wait for navigation to complete
    await page.waitForNavigation({ 
      waitUntil: 'networkidle',
      timeout: 30000 // Longer timeout for potential slow connections
    });
    
    // Check for various outcomes after login attempt
    const errorVisible = await page.isVisible('.a-alert-content, .a-box-inner .a-alert-container', { timeout: 3000 });
    if (errorVisible) {
      const errorText = await page.textContent('.a-alert-content, .a-box-inner .a-alert-container') || '';
      console.error(`Login error: ${errorText.trim()}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error entering password:', error);
    return false;
  }
}

/**
 * Check if credentials are invalid
 * @param page Playwright page instance
 * @returns Boolean indicating if credentials are invalid
 */
export async function checkInvalidCredentials(page: Page): Promise<boolean> {
  try {
    // Check for various error selectors and messages
    const errorSelectors = [
      '.a-alert-heading',
      '.a-box-inner .a-alert-container',
      '.a-alert-content',
      '#auth-error-message-box',
      '.auth-error-message-box',
      '#auth-warning-message-box'
    ];
    
    // Check each selector for visibility
    for (const selector of errorSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 1000 });
      if (isVisible) {
        const errorText = await page.textContent(selector) || '';
        const errorLower = errorText.toLowerCase();
        
        // Check for common error keywords
        const errorKeywords = [
          'problem',
          'incorrect',
          'wrong',
          'invalid',
          'error',
          'not recognized',
          'failed',
          'couldn\'t find'
        ];
        
        // If any error keywords are found, consider credentials invalid
        if (errorKeywords.some(keyword => errorLower.includes(keyword))) {
          console.error(`Credential error detected: ${errorText.trim()}`);
          return true;
        }
      }
    }
    
    // Check if we're still on login page when we should have navigated away
    const stillOnLoginPage = await page.isVisible('#ap_password, #ap_email', { timeout: 1000 });
    const isOnHomePage = await page.isVisible('#nav-logo-sprites, #nav-belt', { timeout: 1000 });
    
    if (stillOnLoginPage && !isOnHomePage) {
      console.error('Still on login page - possible invalid credentials');
      return true;
    }
    
    return false;
  } catch (error) {
    // If selector not found or other error, assume no error for safety
    console.warn('Error checking invalid credentials:', error);
    return false;
  }
}

/**
 * Check if MFA is required
 * @param page Playwright page instance
 * @returns Boolean indicating if MFA is required
 */
export async function isMFARequired(page: Page): Promise<boolean> {
  try {
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
      'input[placeholder*="verification"]' // Input with verification in placeholder
    ];
    
    for (const selector of mfaSelectors) {
      // Use a shorter timeout for each individual selector check
      if (await page.isVisible(selector, { timeout: 1000 })) {
        console.log('MFA requirement detected');
        return true;
      }
    }
    
    // Check for text content indicating MFA
    try {
      const pageText = await page.textContent('body');
      if (pageText) {
        const mfaTextIndicators = [
          'verification code',
          'two-step verification',
          'two-factor authentication',
          'security code',
          'enter the code',
          'otp',
          'authentication code'
        ];
        
        if (mfaTextIndicators.some(text => pageText.toLowerCase().includes(text))) {
          console.log('MFA requirement detected from page text');
          return true;
        }
      }
    } catch (err) {
      console.warn('Error checking page text for MFA indicators:', err);
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking MFA requirement:', error);
    return false;
  }
}

/**
 * Submit MFA code
 * @param page Playwright page instance
 * @param mfaCode MFA code provided by user
 * @returns Boolean indicating success
 */
export async function submitMFACode(page: Page, mfaCode: string): Promise<boolean> {
  try {
    // Try different possible MFA input fields
    const mfaInputSelectors = [
      '#auth-mfa-otpcode',
      'input[name="otpCode"]',
      'input[id*="mfa"]',
      'input[id*="otp"]',
      'input[name*="mfa"]',
      'input[name*="otp"]',
      'input[placeholder*="code"]',
      '[data-a-target="mfa-otp-field"]',
      'input[type="tel"]', // Sometimes OTP fields use tel type
      '#auth-mfa-otpcode' // Fallback to the most common one again
    ];
    
    let inputField = null;
    for (const selector of mfaInputSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 1000 });
      if (isVisible) {
        inputField = selector;
        break;
      }
    }
    
    if (!inputField) {
      console.error('Could not find MFA input field');
      return false;
    }
    
    // Clear the field first in case it has any content
    await page.fill(inputField, '');
    
    // Fill in the MFA code
    await page.fill(inputField, mfaCode);
    
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
      'form .a-button-primary'
    ];
    
    let submitButton = null;
    for (const selector of submitButtonSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 1000 });
      if (isVisible) {
        submitButton = selector;
        break;
      }
    }
    
    if (!submitButton) {
      console.error('Could not find MFA submit button');
      return false;
    }
    
    // Click the submit button
    await page.click(submitButton);
    
    // Wait for navigation to complete
    await page.waitForNavigation({ 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Check if MFA was incorrect by seeing if we're still on the MFA page
    const stillOnMFAPage = await isMFARequired(page);
    
    // Check for error messages
    const hasError = await page.isVisible('.a-alert-content, .a-box-inner .a-alert-container', { timeout: 2000 });
    
    if (stillOnMFAPage || hasError) {
      const errorText = await page.textContent('.a-alert-content, .a-box-inner .a-alert-container') || 'Invalid MFA code';
      console.error(`MFA error: ${errorText.trim()}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error submitting MFA code:', error);
    return false;
  }
}

/**
 * Order item structure
 */
export interface OrderItem {
  name: string;
  price: string;
  link: string;
}

/**
 * Navigate to order history page
 * @param page Playwright page instance
 * @returns Boolean indicating success
 */
export async function navigateToOrderHistory(page: Page): Promise<boolean> {
  try {
    console.log('Navigating to order history page...');
    
    // Handle potential "personalized content" popup if it appears
    try {
      const popupSelector = 'div[id*="personalized-content"] button';
      const hasPopup = await page.isVisible(popupSelector, { timeout: 3000 });
      if (hasPopup) {
        await page.click(popupSelector);
        await page.waitForTimeout(1000); // Short wait after closing popup
      }
    } catch (error) {
      // Ignore errors with popup handling - it's optional
      console.warn('No personalization popup found');
    }
    
    // Try multiple possible selectors for the Orders link
    const orderButtonSelectors = [
      '#nav-orders',
      '.nav-a:has-text("Orders")',
      '[data-nav-ref="nav_youraccount_orders"]',
      'a:has-text("Returns & Orders")',
      'a[href*="/gp/css/order-history"]',
      'a[href*="order-history"]',
      '#nav-orders-sprite'
    ];
    
    // First check if we're already on the orders page
    const alreadyOnOrdersPage = await page.isVisible(
      '.your-orders-content, .order-card, .a-box-group, a:has-text("Buy it again")',
      { timeout: 2000 }
    );
    
    if (alreadyOnOrdersPage) {
      console.log('Already on orders page');
      return true;
    }
    
    // Try each selector until we find a visible one
    let orderButton = null;
    for (const selector of orderButtonSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 1000 });
      if (isVisible) {
        orderButton = selector;
        break;
      }
    }
    
    if (!orderButton) {
      // If we can't find the orders link in the nav, try going to account first
      console.log('Orders link not found in main nav, trying via account page...');
      
      const accountButtonSelectors = [
        '#nav-link-accountList',
        '#nav-hamburger-menu',
        'a:has-text("Account")',
        'a:has-text("Hello, Sign in")'
      ];
      
      // Try each selector until we find a visible one
      let accountButton = null;
      for (const selector of accountButtonSelectors) {
        const isVisible = await page.isVisible(selector, { timeout: 1000 });
        if (isVisible) {
          accountButton = selector;
          break;
        }
      }
      
      if (accountButton) {
        await page.click(accountButton);
        await page.waitForTimeout(2000); // Wait for dropdown/menu
        
        // Now look for orders link in the account menu
        const menuOrderSelectors = [
          'a:has-text("Your Orders")',
          'a[href*="order-history"]',
          'a:has-text("Orders")'
        ];
        
        for (const selector of menuOrderSelectors) {
          const isVisible = await page.isVisible(selector, { timeout: 1000 });
          if (isVisible) {
            await page.click(selector);
            break;
          }
        }
      } else {
        // Direct navigation as last resort
        console.log('Using direct URL navigation to orders page...');
        await page.goto('https://www.amazon.in/gp/css/order-history', { 
          waitUntil: 'networkidle',
          timeout: 30000
        });
      }
    } else {
      // Click on the orders link if found
      await page.click(orderButton);
    }
    
    // Wait for navigation and order page to load
    await page.waitForNavigation({ 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Verify we're on the orders page by checking for key elements
    const orderPageSelectors = [
      '.your-orders-content',
      '.order-card',
      '.a-box-group',
      'a:has-text("Buy it again")',
      '#ordersContainer',
      '#yourOrders',
      'h1:has-text("Your Orders")'
    ];
    
    // Check each selector to confirm we're on the orders page
    for (const selector of orderPageSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 2000 });
      if (isVisible) {
        console.log('Successfully navigated to orders page');
        return true;
      }
    }
    
    console.error('Could not confirm we are on the orders page');
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
    console.log(`Selecting orders for year: ${year}`);
    
    // First try to find the time filter dropdown - there are multiple possible selectors
    const dropdownSelectors = [
      '#time-filter',
      '.a-dropdown-container',
      'select[name="timeFilter"]',
      'span:has-text("Last 30 days")',
      'span:has-text("past 3 months")',
      'span:has-text("past orders")',
      '[id*="dropdown"]',
      '[id*="timefilter"]',
      '.time-filter-dropdown',
      'button:has-text("Last")'
    ];
    
    // Try each selector to find the dropdown
    let dropdownSelected = false;
    for (const selector of dropdownSelectors) {
      const isVisible = await page.isVisible(selector, { timeout: 2000 });
      if (isVisible) {
        await page.click(selector);
        console.log(`Clicked dropdown with selector: ${selector}`);
        dropdownSelected = true;
        
        // Short wait for dropdown to open
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    if (!dropdownSelected) {
      console.error('Could not find time filter dropdown');
      
      // Last resort - try to directly navigate to the year's order page
      try {
        console.log('Attempting direct navigation to year-specific orders page...');
        
        // Amazon uses query parameters or path segments for year filtering
        await page.goto(`https://www.amazon.in/your-orders/orders?timeFilter=year-${year}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // Wait and check if we got any orders
        const orderElementsVisible = await page.isVisible('.your-orders-content, .order-card, .a-box-group', { timeout: 5000 });
        if (orderElementsVisible) {
          console.log(`Successfully accessed ${year} orders via direct URL`);
          return true;
        }
        
        return false;
      } catch (directNavError) {
        console.error('Direct navigation to year-specific orders failed:', directNavError);
        return false;
      }
    }
    
    // Now that dropdown is open, look for the year option
    const yearSelectors = [
      `a[data-value*="${year}"]`,
      `.a-dropdown-link:has-text("${year}")`,
      `li:has-text("${year}")`,
      `a:has-text("${year}")`,
      `option[value*="${year}"]`
    ];
    
    // Try each selector to find the year option
    let yearSelected = false;
    for (const selector of yearSelectors) {
      try {
        const isVisible = await page.isVisible(selector, { timeout: 2000 });
        if (isVisible) {
          await page.click(selector);
          console.log(`Selected year ${year} with selector: ${selector}`);
          yearSelected = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
        console.warn(`Year selector ${selector} not found, trying next...`);
      }
    }
    
    if (!yearSelected) {
      // If year not found in dropdown, try alternative methods
      
      // Check if there's a date range picker instead
      const datePickerSelectors = [
        'input[type="date"]',
        'input[placeholder*="date"]',
        'button:has-text("Custom")'
      ];
      
      for (const selector of datePickerSelectors) {
        const isVisible = await page.isVisible(selector, { timeout: 1000 });
        if (isVisible) {
          // Use date range to select the entire year
          await page.click(selector);
          
          // Wait for date picker to appear
          await page.waitForTimeout(1000);
          
          // Try to set start date (Jan 1 of selected year)
          await page.fill('input[name="startDate"], input[placeholder*="start"]', `01/01/${year}`);
          
          // Try to set end date (Dec 31 of selected year)
          await page.fill('input[name="endDate"], input[placeholder*="end"]', `12/31/${year}`);
          
          // Look for apply/submit button
          await page.click('button:has-text("Apply"), button:has-text("Submit"), button[type="submit"]');
          
          // Wait for results to load
          await page.waitForNavigation({
            waitUntil: 'networkidle',
            timeout: 30000
          });
          
          console.log(`Selected date range for year ${year} using date picker`);
          return true;
        }
      }
      
      console.error(`Could not select year ${year} from dropdown`);
      return false;
    }
    
    // Wait for navigation and page to load with new year's orders
    try {
      await page.waitForNavigation({
        waitUntil: 'networkidle',
        timeout: 30000
      });
    } catch (navError) {
      // Sometimes Amazon doesn't do a full page navigation, just updates content
      console.warn('Navigation timeout - checking if content updated instead');
      
      // Wait a bit longer for potential AJAX updates
      await page.waitForTimeout(5000);
      
      // Check if orders section is visible
      const ordersVisible = await page.isVisible('.your-orders-content, .order-card, .a-box-group');
      if (!ordersVisible) {
        console.error('Could not confirm order content was updated');
        return false;
      }
    }
    
    // Confirm year selection was applied
    try {
      // Look for indicators that year filter is active
      const yearIndicators = [
        `text=${year}`,
        `.a-dropdown-prompt:has-text("${year}")`,
        `[aria-label*="${year}"]`,
        `span:has-text("${year}")`
      ];
      
      for (const indicator of yearIndicators) {
        const isVisible = await page.isVisible(indicator, { timeout: 2000 });
        if (isVisible) {
          console.log(`Confirmed year ${year} is selected`);
          return true;
        }
      }
      
      // If we can't confirm, but there's no error, assume it worked
      console.warn(`Could not confirm year ${year} selection, but proceeding`);
      return true;
    } catch (error) {
      console.error(`Error confirming year ${year} selection:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Error selecting year ${year}:`, error);
    return false;
  }
}

/**
 * Extract orders from the current page
 * @param page Playwright page instance
 * @returns Array of order items
 */
export async function extractOrders(page: Page): Promise<OrderItem[]> {
  try {
    console.log('Extracting orders from current page...');
    const orders: OrderItem[] = [];
    
    // First check if there are any orders on this page
    const noOrdersSelectors = [
      'text=No orders',
      'text=No Order History',
      'text=You have not placed any orders',
      '.a-box-inner:has-text("We couldn\'t find")'
    ];
    
    // Check for empty state indicators
    for (const selector of noOrdersSelectors) {
      const noOrders = await page.isVisible(selector, { timeout: 2000 });
      if (noOrders) {
        console.log('No orders found for this time period');
        return [];
      }
    }
    
    // Wait a bit to ensure the page is fully loaded
    await page.waitForTimeout(2000);
    
    // Find all order containers on the page
    // Amazon's order page has various layouts - try different selectors
    const orderContainerSelectors = [
      '.order, .a-box-group',
      '.js-order-card',
      '.order-card',
      '.a-box.shipment',
      '.yo-shipment',
      '.a-fixed-left-grid-inner',
      '.a-section.a-padding-small.a-text-center.order',
      'div[data-testid="yo-order-card"]'
    ];
    
    // Try each selector to find order elements
    let orderElements: any[] = [];
    for (const selector of orderContainerSelectors) {
      orderElements = await page.$$(selector);
      if (orderElements.length > 0) {
        console.log(`Found ${orderElements.length} orders with selector: ${selector}`);
        break;
      }
    }
    
    if (orderElements.length === 0) {
      console.warn('No order elements found with standard selectors, trying alternative approach');
      
      // Alternative approach - look for product name links directly
      const productLinkSelectors = [
        '.a-link-normal.a-text-bold[href*="/gp/product/"]',
        '.a-link-normal[href*="/dp/"]',
        '.a-link-normal.yohtmlc-product-title',
        'a[href*="/product/"]',
        'a.a-link-normal[href*="dp"]'
      ];
      
      for (const selector of productLinkSelectors) {
        const productLinks = await page.$$(selector);
        if (productLinks.length > 0) {
          console.log(`Found ${productLinks.length} product links with selector: ${selector}`);
          
          // Extract information directly from product links
          for (const link of productLinks) {
            const name = await link.textContent() || 'Unknown Item';
            const href = await link.getAttribute('href') || '';
            const fullLink = href.startsWith('http') ? href : `https://www.amazon.in${href}`;
            
            // Look for nearby price element - several hops up and down the DOM
            let price = 'Price not available';
            try {
              // First try to find price near the link
              const parentElement = await link.evaluateHandle(node => node.closest('.a-fixed-right-grid, .a-box, .a-section, .a-row'));
              if (parentElement) {
                const priceElement = await parentElement.asElement()?.$(
                  '.a-color-price, .a-price .a-offscreen, span:has-text("₹"), .order-total, .a-price'
                );
                if (priceElement) {
                  price = await priceElement.textContent() || price;
                }
              }
            } catch (priceError) {
              console.warn('Error extracting price:', priceError);
            }
            
            orders.push({
              name: name.trim(),
              price: price.trim(),
              link: fullLink
            });
          }
          
          break;
        }
      }
      
      if (orders.length === 0) {
        console.error('Could not find any orders or product links');
        return [];
      }
    } else {
      // Process each order container
      for (const orderElement of orderElements) {
        // Try different selectors for product name
        const nameSelectors = [
          '.a-link-normal.a-text-bold',
          '.a-link-normal.yohtmlc-product-title',
          '.yohtmlc-item .a-link-normal',
          '.a-link-normal[href*="/dp/"]',
          '.a-link-normal[href*="/gp/product/"]',
          '.a-row a.a-link-normal',
          'a[href*="product-detail"]',
          '.product-name'
        ];
        
        let name = 'Unknown Item';
        let link = '';
        let nameElement = null;
        
        // Try each name selector
        for (const selector of nameSelectors) {
          nameElement = await orderElement.$(selector);
          if (nameElement) {
            name = await nameElement.textContent() || name;
            link = await nameElement.getAttribute('href') || '';
            
            // If name is too long, trim it to a reasonable length
            if (name.length > 100) {
              name = name.substring(0, 97) + '...';
            }
            
            break;
          }
        }
        
        if (!nameElement) {
          // If we couldn't find a product name, this might be a multi-item order
          // Look for a "View or edit order" link, which would indicate a multi-item order
          const viewOrderLink = await orderElement.$('a:has-text("View order"), a:has-text("Order details")');
          if (viewOrderLink) {
            name = 'Multiple items - see order details';
            link = await viewOrderLink.getAttribute('href') || '';
          } else {
            // Skip this order if we can't find product info
            continue;
          }
        }
        
        // Convert relative link to absolute
        const fullLink = link.startsWith('http') ? link : `https://www.amazon.in${link}`;
        
        // Try different selectors for price
        const priceSelectors = [
          '.a-color-price',
          '.a-price .a-offscreen',
          '.yohtmlc-price',
          '.a-span-last',
          'span:has-text("₹")',
          '.order-total',
          '.a-price',
          '.price'
        ];
        
        let price = 'Price not available';
        for (const selector of priceSelectors) {
          const priceElement = await orderElement.$(selector);
          if (priceElement) {
            price = await priceElement.textContent() || price;
            break;
          }
        }
        
        // Clean up the price string - keep only the first occurrence of price
        // Sometimes Amazon includes multiple prices (discount, etc.)
        price = price.trim();
        
        // Check for INR symbol (₹) and make sure it's included
        if (!price.includes('₹') && price !== 'Price not available') {
          price = `₹${price}`;
        }
        
        orders.push({
          name: name.trim(),
          price: price.trim(),
          link: fullLink
        });
      }
    }
    
    console.log(`Extracted ${orders.length} orders`);
    return orders;
  } catch (error) {
    console.error('Error extracting orders:', error);
    return [];
  }
} 