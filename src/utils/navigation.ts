import { Page } from 'playwright';
import { URLS, SELECTORS, TIMEOUTS } from './config';

/**
 * Navigate to Amazon order history
 * @param page Playwright page instance
 * @returns Boolean indicating success
 */
export async function navigateToOrderHistory(page: Page): Promise<boolean> {
  try {
    // Look for and click on Orders link
    const orderButton = await page.$(SELECTORS.ORDERS.ORDER_BUTTON);
    if (orderButton) {
      // Click on the orders link if found
      await orderButton.click();
      
      // Instead of waiting for navigation, wait for order page content to appear
      console.log('Waiting for order page elements to appear...');
      try {
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
            await page.waitForTimeout(TIMEOUTS.ORDER_PAGE_CHECK); // Give page content time to load
            orderPageLoaded = true;
            break;
          }
          
          // Check each selector
          for (const selector of SELECTORS.ORDERS.ORDER_PAGE_INDICATORS) {
            try {
              const isVisible = await page.isVisible(selector, { timeout: TIMEOUTS.ORDER_PAGE_CHECK });
              if (isVisible) {
                console.log(`Order page loaded, found indicator: ${selector}`);
                orderPageLoaded = true;
                break;
              }
            } catch {
              // Continue checking other selectors
            }
          }
          
          if (!orderPageLoaded) {
            await page.waitForTimeout(TIMEOUTS.ELEMENT_WAIT); // Wait before next attempt
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
    await page.goto(URLS.ORDER_HISTORY, { 
      waitUntil: 'load',
      timeout: TIMEOUTS.ORDER_PAGE_LOAD
    });
    
    // Wait for any order page elements after direct navigation
    console.log('Checking for order page elements after direct navigation...');
    
    // Look for any order page indicators
    for (const selector of SELECTORS.ORDERS.ORDER_PAGE_INDICATORS) {
      try {
        const isVisible = await page.isVisible(selector, { timeout: TIMEOUTS.ORDER_PAGE_CHECK });
        if (isVisible) {
          console.log(`Order page loaded after direct navigation, found: ${selector}`);
          return true;
        }
      } catch {
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
    await page.goto(URLS.ORDER_HISTORY_YEAR(year), {
      waitUntil: 'load',
      timeout: TIMEOUTS.ORDER_PAGE_LOAD
    });
    
    // Wait for order content after direct navigation
    console.log('Waiting for order content after direct year navigation...');
    await page.waitForTimeout(TIMEOUTS.YEAR_NAVIGATION);
    
    // Check if we see any orders
    const orderElementsVisible = await page.isVisible(
      '.your-orders-content, .order-card, .a-box-group, div[class*="order"]',
      { timeout: TIMEOUTS.ORDER_CONTENT }
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