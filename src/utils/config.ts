/**
 * Configuration constants for the scraper
 */

// URLs
export const URLS = {
  LOGIN: 'https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
  ORDER_HISTORY: 'https://www.amazon.in/gp/css/order-history',
  ORDER_HISTORY_YEAR: (year: number) => `https://www.amazon.in/your-orders/orders?timeFilter=year-${year}`,
  BASE_URL: 'https://www.amazon.in'
};

// Selectors
export const SELECTORS = {
  LOGIN: {
    EMAIL_FIELD: '#ap_email',
    CONTINUE_BUTTON: '#continue',
    PASSWORD_FIELD: '#ap_password',
    SIGN_IN_BUTTON: '#signInSubmit',
    INVALID_MOBILE_ERROR: '.a-alert-content:has-text("Invalid mobile number")',
    ALERT_CONTENT: '.a-alert-content',
    ERROR_CONTAINER: '.a-alert-content, .a-box-inner .a-alert-container',
    AUTH_WORKFLOW: '#ap_password, #ap_email, .auth-workflow'
  },
  MFA: {
    OTP_INPUT_SELECTORS: [
      '#auth-mfa-otpcode',
      'input[name="otpCode"]',
      'input[id*="mfa"]',
      'input[id*="otp"]',
      'input[name*="mfa"]',
      'input[name*="otp"]',
      'input[placeholder*="code"]',
      '[data-a-target="mfa-otp-field"]',
      'input[type="tel"]',
      'input[type="text"]',
      'input.a-input-text'
    ],
    SUBMIT_BUTTON_SELECTORS: [
      '#auth-signin-button',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Verify")',
      'button:has-text("Submit")',
      'button:has-text("Continue")',
      '.a-button-input',
      '[aria-labelledby*="submit"]',
      'form .a-button-primary',
      'input.a-button-input'
    ],
    OTP_TEXT_INDICATORS: [
      'verification code',
      'two-step verification',
      'two-factor authentication',
      'security code',
      'enter the code',
      'otp',
      'one-time password',
      'authentication code',
      'mobile number we have on record',
      'enter the otp',
      'sent to your mobile'
    ],
    MFA_SELECTORS: [
      '#auth-mfa-otpcode',
      '.auth-mfa-form',
      '#auth-mfa-remember-device',
      'input[name="otpCode"]',
      'form:has-text("Two-Step Verification")',
      'form:has-text("Two-Factor Authentication")',
      'form:has-text("Enter the OTP")',
      '#auth-mfa-form',
      '[data-a-target="mfa-otp-field"]',
      'input[placeholder*="verification"]',
      'input[type="tel"]'
    ]
  },
  ORDERS: {
    ORDER_BUTTON: '#nav-orders, a[href*="order-history"]',
    ORDER_PAGE_INDICATORS: [
      '.your-orders-content',
      '.order-card',
      '.a-box-group',
      'a:has-text("Buy it again")',
      '#ordersContainer',
      '#yourOrders',
      'h1:has-text("Your Orders")',
      'text=Your Orders',
      '.shipping-address',
      'text=Buy Again',
      'text=Not Yet Shipped',
      'text=orders placed in',
      '#orderTypeMenuContainer',
      '.a-pagination',
      '.order',
      '.time-filter-dropdown',
      '#nav-orders'
    ],
    ORDER_CARD: '.order-card.js-order-card',
    BOX_GROUP: '.a-box-group',
    PRICE_ELEMENT: '.a-column.a-span2 .a-size-base',
    DATE_ELEMENT: '.a-column.a-span3 .a-size-base',
    DELIVERY_BOX: '.a-box.delivery-box',
    PRODUCT_TITLE: '.yohtmlc-product-title a',
    MOVIE_ITEM: '.yohtmlc-item a'
  }
};

// Timeouts
export const TIMEOUTS = {
  PAGE_LOAD: 1000,
  NAVIGATION: 3000,
  ELEMENT_WAIT: 2000,
  PASSWORD_FIELD: 5000,
  SIGN_IN_NAVIGATION: 45000,
  OTP_NAVIGATION: 15000,
  ORDER_PAGE_CHECK: 3000,
  ORDER_PAGE_LOAD: 30000,
  YEAR_NAVIGATION: 5000,
  ORDER_CONTENT: 8000
}; 