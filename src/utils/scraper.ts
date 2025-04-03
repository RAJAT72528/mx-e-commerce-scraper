/**
 * Main scraper module - exports all functionality from sub-modules
 */

// Export types from Playwright
import { Page as PlaywrightPage } from 'playwright';
export type Page = PlaywrightPage;

// Re-export types
export * from './types';

// Re-export browser utilities
export * from './browser';

// Re-export login utilities
export * from './login';

// Re-export authentication utilities
export * from './auth';

// Re-export navigation utilities
export * from './navigation';

// Re-export extraction utilities
export * from './extraction';

// Re-export configuration
export * from './config';