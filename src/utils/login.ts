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
      return false;
    }
    
    // If no error, wait for navigation to complete
    console.log("Waiting for navigation after sign-in...");
    await page.waitForNavigation({ 
      waitUntil: 'load',
      timeout: TIMEOUTS.SIGN_IN_NAVIGATION
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