import { Page } from 'playwright';
import { Order, OrderItem } from './types';

/**
 * Extract orders from the current page
 * @param page Playwright page instance
 * @returns Array of Order objects
 */
export async function extractOrders(page: Page): Promise<Order[]> {
  try {
    // Extract orders directly using page.evaluate to handle multiple items per order
    const orders = await page.evaluate(() => {
      const result: Array<Order> = [];
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
        const orderEntry: Order = {
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
              const href = productElement.getAttribute('href') || '';
              // Make link absolute
              link = href.startsWith('http') ? href : `${baseUrl}${href}`;
            }
            
            // Only add if we found a product name
            if (productName) {
              orderEntry.items.push({
                productName,
                link
              } as OrderItem);
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
            const href = productElement.getAttribute('href') || '';
            // Make link absolute
            link = href.startsWith('http') ? href : `${baseUrl}${href}`;
          } else {
            // Try for movie/digital content
            const movieElement = orderGroup.querySelector('.yohtmlc-item a');
            if (movieElement && movieElement.textContent) {
              productName = movieElement.textContent.trim();
              const href = movieElement.getAttribute('href') || '';
              // Make link absolute
              link = href.startsWith('http') ? href : `${baseUrl}${href}`;
            }
          }
          
          // Only add if we found a product name
          if (productName) {
            orderEntry.items.push({
              productName,
              link
            } as OrderItem);
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