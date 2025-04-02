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
  await page.goto('https://www.amazon.in/ap/signin', { waitUntil: 'networkidle' });
}

/**
 * Enter username (email or phone)
 * @param page Playwright page instance
 * @param username User's email or phone number
 * @returns Boolean indicating success
 */
export async function enterUsername(page: Page, username: string): Promise<boolean> {
  try {
    await page.waitForSelector('#ap_email');
    await page.fill('#ap_email', username);
    await page.click('#continue');
    // Wait for navigation to password page
    await page.waitForSelector('#ap_password', { timeout: 5000 });
    return true;
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
    await page.fill('#ap_password', password);
    await page.click('#signInSubmit');
    
    // Wait for either homepage or MFA page to load
    await page.waitForNavigation({ waitUntil: 'networkidle' });
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
    // Check for error message
    const errorSelector = '.a-alert-heading, .a-box-inner .a-alert-container';
    const hasError = await page.isVisible(errorSelector, { timeout: 3000 });
    
    if (hasError) {
      const errorText = await page.textContent(errorSelector);
      return errorText?.toLowerCase().includes('problem') || 
             errorText?.toLowerCase().includes('incorrect') || 
             false;
    }
    
    return false;
  } catch (error) {
    // If selector not found, error wasn't present
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
      '#auth-mfa-remember-device' // Remember device checkbox for MFA
    ];
    
    for (const selector of mfaSelectors) {
      if (await page.isVisible(selector, { timeout: 2000 })) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
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
    await page.fill('#auth-mfa-otpcode', mfaCode);
    await page.click('#auth-signin-button');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Check if MFA was incorrect
    const isStillOnMFAPage = await isMFARequired(page);
    return !isStillOnMFAPage;
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
    // Look for "Returns & Orders" link and click it
    await page.click('#nav-orders, .nav-a:has-text("Orders")');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Verify we're on the orders page
    await page.waitForSelector('.order, .your-orders-content', { timeout: 5000 });
    return true;
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
    // Find the time period dropdown and select it
    await page.click('#time-filter, .a-dropdown-container');
    // Select the year option
    await page.click(`a[data-value*="${year}"], .a-dropdown-link:has-text("${year}")`);
    
    // Wait for the page to load with the new year
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    return true;
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
    const orders: OrderItem[] = [];
    
    // Find all order containers on the page
    const orderElements = await page.$$('.order, .a-box-group');
    
    for (const orderElement of orderElements) {
      // Extract product name
      const nameElement = await orderElement.$('.a-link-normal.a-text-bold, .a-link-normal.yohtmlc-product-title');
      if (!nameElement) continue;
      
      const name = await nameElement.textContent() || 'Unknown Item';
      
      // Extract product link
      const linkElement = await orderElement.$('.a-link-normal.a-text-bold, .a-link-normal.yohtmlc-product-title');
      const link = await linkElement?.getAttribute('href') || '';
      const fullLink = link.startsWith('http') ? link : `https://www.amazon.in${link}`;
      
      // Extract price
      const priceElement = await orderElement.$('.a-color-price, .a-price .a-offscreen');
      const price = await priceElement?.textContent() || 'Price not available';
      
      orders.push({
        name: name.trim(),
        price: price.trim(),
        link: fullLink
      });
    }
    
    return orders;
  } catch (error) {
    console.error('Error extracting orders:', error);
    return [];
  }
} 