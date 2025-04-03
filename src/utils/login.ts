import { Page } from 'playwright';
import { URLS, SELECTORS, TIMEOUTS } from './config';

/**
 * Navigate to Amazon login page
 * @param page Playwright page instance
 */
export async function navigateToAmazonLogin(page: Page): Promise<void> {
  await page.goto(URLS.LOGIN, { 
    waitUntil: 'load'
  });
  
  // Add a short delay after page load for any JS to initialize
  await page.waitForTimeout(TIMEOUTS.PAGE_LOAD);
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
    const hasInvalidMobileError = await page.isVisible(SELECTORS.LOGIN.INVALID_MOBILE_ERROR);
    if (hasInvalidMobileError) {
      console.error('Invalid mobile number detected');
      await page.screenshot({ path: 'invalid-mobile-error.png' });
      return false;
    }
    
    // Wait for the visible email field
    await page.fill(SELECTORS.LOGIN.EMAIL_FIELD, username);
    console.log(`Entered username: ${username}`);
    
    // Click the continue button
    await page.click(SELECTORS.LOGIN.CONTINUE_BUTTON);
    console.log('Clicked continue button');
    
    // Wait briefly for any navigation or DOM changes
    await page.waitForTimeout(TIMEOUTS.ELEMENT_WAIT);
    
    // Check specifically for the "Invalid mobile number" error
    const hasInvalidMobileErrorAfterContinue = await page.isVisible(SELECTORS.LOGIN.INVALID_MOBILE_ERROR);
    if (hasInvalidMobileErrorAfterContinue) {
      console.error('Invalid mobile number detected');
      await page.screenshot({ path: 'invalid-mobile-error.png' });
      return false;
    }
    
    // Check for any other alert messages
    const hasOtherAlert = await page.isVisible(SELECTORS.LOGIN.ALERT_CONTENT);
    if (hasOtherAlert) {
      const errorText = await page.textContent(SELECTORS.LOGIN.ALERT_CONTENT) || '';
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
    const onPasswordPage = await page.isVisible(SELECTORS.LOGIN.PASSWORD_FIELD, { timeout: TIMEOUTS.PASSWORD_FIELD });
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
    await page.fill(SELECTORS.LOGIN.PASSWORD_FIELD, password);
    
    // Click sign-in button
    console.log("Clicking sign-in button...");
    await page.click(SELECTORS.LOGIN.SIGN_IN_BUTTON);
    
    // Wait briefly for error message or navigation
    await page.waitForTimeout(TIMEOUTS.ELEMENT_WAIT);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'after-password-submit.png' });
    
    // Check if we're on the OTP verification page
    // Import the isMFARequired function from auth.ts
    const { isMFARequired } = require('./auth');
    const isOnOTPPage = await isMFARequired(page);
    
    if (isOnOTPPage) {
      console.log("OTP verification required. This is not a password error.");
      // Return true as the password was correct, we just need OTP now
      return true;
    }
    
    // First check specifically for the "Your password is incorrect" error message
    const incorrectPasswordError = await page.isVisible('.a-alert-content:has-text("Your password is incorrect")');
    if (incorrectPasswordError) {
      console.error('Incorrect password detected');
      await page.screenshot({ path: 'incorrect-password-error.png' });
      return false;
    }
    
    // Check for other error messages
    const otherErrorVisible = await page.isVisible(SELECTORS.LOGIN.ERROR_CONTAINER);
    if (otherErrorVisible) {
      const errorText = await page.textContent(SELECTORS.LOGIN.ERROR_CONTAINER) || '';
      console.error(`Login error: ${errorText.trim()}`);
      
      // Skip checking password errors if the error is about OTP
      if (errorText.toLowerCase().includes('code') || 
          errorText.toLowerCase().includes('verification') || 
          errorText.toLowerCase().includes('otp') ||
          errorText.toLowerCase().includes('wait 60 seconds')) {
        console.log("Detected OTP-related message, not treating as password error");
        return true;
      }
      
      return false;
    }
    
    // If no error, wait for navigation to complete
    console.log("Checking for successful login...");
    
    // Take screenshot before navigation check
    await page.screenshot({ path: 'pre-navigation-check.png' });
    
    try {
      // Check current URL to see if we've already navigated
      const currentUrl = page.url();
      
      // If we're already navigated to a non-login URL, we're successful
      if (!currentUrl.includes('/ap/signin') && !currentUrl.includes('/ap/password')) {
        console.log(`Already navigated to: ${currentUrl}`);
        return true;
      }
      
      // Use Promise.race with timeout instead of waitForNavigation
      const navigationCheck = Promise.race([
        // Option 1: Check for successful navigation via event
        page.waitForNavigation({ 
          waitUntil: 'load',
          timeout: TIMEOUTS.SIGN_IN_NAVIGATION 
        }).then(() => 'navigation-event'),
        
        // Option 2: Check for elements that indicate successful login
        page.waitForSelector('#nav-logo, #navbar, #nav-belt, #nav-main', { 
          timeout: TIMEOUTS.SIGN_IN_NAVIGATION 
        }).then(() => 'logged-in-element'),
        
        // Option 3: Fail-safe timeout
        new Promise(resolve => setTimeout(() => resolve('timeout'), TIMEOUTS.SIGN_IN_NAVIGATION))
      ]);
      
      const result = await navigationCheck;
      console.log(`Login navigation result: ${result}`);
      
      // Take post-navigation screenshot
      await page.screenshot({ path: 'post-navigation-check.png' });
      
      // Final verification that we're not on login page
      const stillOnLoginPage = await page.isVisible(SELECTORS.LOGIN.AUTH_WORKFLOW, { timeout: 5000 })
        .catch(() => false);
      
      if (stillOnLoginPage) {
        console.log("Still detected on login page, login may have failed");
        return false;
      }
      
      // If we're on a non-login URL, we're successful
      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);
      return !finalUrl.includes('/ap/signin') && !finalUrl.includes('/ap/password');
      
    } catch (error) {
      console.error('Error during navigation check:', error);
      
      // Check if we landed on the homepage despite the error
      const homePageCheck = await page.isVisible('#nav-logo, #navbar', { timeout: 5000 })
        .catch(() => false);
      
      if (homePageCheck) {
        console.log("Detected Amazon homepage elements, considering login successful");
        return true;
      }
      
      return false;
    }
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
    const hasError = await page.isVisible(SELECTORS.LOGIN.ALERT_CONTENT);
    if (hasError) {
      const errorText = await page.textContent(SELECTORS.LOGIN.ALERT_CONTENT) || '';
      console.error(`Login error: ${errorText}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking invalid credentials:', error);
    return false;
  }
} 