import { Page as PlaywrightPage, Browser } from 'playwright';

export type Page = PlaywrightPage;

export class ScraperError extends Error {
  constructor(message: string);
}

export interface OrderItem {
  productName: string;
  link?: string;
}

export interface Order {
  orderDate: string;
  price: string;
  items: OrderItem[];
}

export interface BrowserContext {
  browser: Browser;
  page: Page;
}

export interface LoginResult {
  success: boolean;
  page: Page;
}

export type CredentialType = 'email' | 'phone' | 'unknown';

export interface ValidationResult {
  isValid: boolean;
  type: CredentialType;
}

export interface Credentials {
  username: string;
  password: string;
}

export function initBrowser(): Promise<BrowserContext>;
export function navigateToAmazonLogin(page: Page): Promise<void>;
export function enterUsername(page: Page, username: string): Promise<boolean>;
export function enterPassword(page: Page, password: string): Promise<boolean>;
export function checkInvalidCredentials(page: Page): Promise<boolean>;
export function isMFARequired(page: Page): Promise<boolean>;
export function submitMFACode(page: Page, otpCode: string): Promise<boolean>;
export function navigateToOrderHistory(page: Page): Promise<boolean>;
export function selectOrderYear(page: Page, year: number): Promise<boolean>;
export function extractOrders(page: Page): Promise<Order[]>;
