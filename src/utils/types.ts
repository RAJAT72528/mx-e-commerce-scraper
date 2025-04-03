import { Page, Browser } from 'playwright';

/**
 * Custom error class for scraper-specific errors
 */
export class ScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScraperError';
  }
}

/**
 * Represents a product item in an order
 */
export interface OrderItem {
  productName: string;
  link?: string;
}

/**
 * Represents a complete order with multiple items
 */
export interface Order {
  orderDate: string;
  price: string;
  items: OrderItem[];
}

/**
 * Browser initialization result
 */
export interface BrowserContext {
  browser: Browser;
  page: Page;
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  page: Page;
}

/**
 * Types of user credentials
 */
export type CredentialType = 'email' | 'phone' | 'unknown';

/**
 * Validation result for credentials
 */
export interface ValidationResult {
  isValid: boolean;
  type: CredentialType;
}

/**
 * User credentials
 */
export interface Credentials {
  username: string;
  password: string;
} 