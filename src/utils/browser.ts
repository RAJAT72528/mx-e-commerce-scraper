import { Browser } from 'playwright';
import { BrowserContext } from './types';

/**
 * Initialize browser and page
 * @returns Browser and page instances
 */
export async function initBrowser(): Promise<BrowserContext> {
  const playwright = await import('playwright');
  const browser: Browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, page };
} 