import { Page } from 'playwright';
import { SELECTORS, TIMEOUTS } from './config';

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
    
    // Primary check: Look for /ap/mfa in the URL (most reliable indicator)
    if (currentUrl.includes('/ap/mfa')) {
      console.log('OTP requirement detected: Found /ap/mfa in URL');
      return true;
    }
    
    // Secondary check: Look for Two-Step Verification in title or heading
    const pageTitle = await page.title();
    const hasVerificationTitle = pageTitle.includes('Verification') || pageTitle.includes('OTP');
    if (hasVerificationTitle) {
      console.log(`OTP requirement detected: Page title indicates verification: "${pageTitle}"`);
      return true;
    }
    
    // Fallback check: Check if we're on the OTP page by older URL pattern
    if (currentUrl.includes('/ap/signin') && 
        currentUrl.includes('openid.pape.max_auth_age=0')) {
      console.log('Potential OTP page detected by older URL pattern - checking page elements');
      
      // Look for OTP input field or MFA-related text
      for (const selector of SELECTORS.MFA.MFA_SELECTORS) {
        // Use a shorter timeout for each individual selector check
        if (await page.isVisible(selector, { timeout: TIMEOUTS.ELEMENT_WAIT })) {
          console.log(`OTP requirement detected with selector: ${selector}`);
          return true;
        }
      }
      
      // Look for specific text content that would indicate OTP
      const pageText = await page.textContent('body');
      if (pageText) {
        for (const indicator of SELECTORS.MFA.OTP_TEXT_INDICATORS) {
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
    
    // Check for Amazon's specific OTP URL patterns
    if (currentUrl.includes('/ap/mfa')) {
      console.log('Detected Amazon MFA page (/ap/mfa)');
    } else if (currentUrl.includes('/ap/signin') && 
        currentUrl.includes('openid.pape.max_auth_age=0')) {
      console.log('Detected Amazon signin OTP page (older pattern)');
    }
    
    // Try different possible OTP input fields
    let inputField = null;
    for (const selector of SELECTORS.MFA.OTP_INPUT_SELECTORS) {
      const isVisible = await page.isVisible(selector, { timeout: TIMEOUTS.ELEMENT_WAIT });
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
    let submitButton = null;
    for (const selector of SELECTORS.MFA.SUBMIT_BUTTON_SELECTORS) {
      const isVisible = await page.isVisible(selector, { timeout: TIMEOUTS.ELEMENT_WAIT });
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
      timeout: TIMEOUTS.OTP_NAVIGATION 
    });
    
    // Take a screenshot after OTP submission
    await page.screenshot({ path: 'after-otp-submission.png' });
    
    // Check if OTP was incorrect by seeing if we're still on the OTP page
    const stillOnOTPPage = await isMFARequired(page);
    
    // Check for error messages
    const hasError = await page.isVisible(SELECTORS.LOGIN.ERROR_CONTAINER, { timeout: TIMEOUTS.ELEMENT_WAIT });
    
    if (stillOnOTPPage || hasError) {
      const errorText = await page.textContent(SELECTORS.LOGIN.ERROR_CONTAINER) || 'Invalid OTP code';
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