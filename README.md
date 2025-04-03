# Amazon Order Scraper

A TypeScript application that logs into Amazon.in, handles Multi-Factor Authentication (MFA), and extracts order information including product names, prices, and links.

## Table of Contents

- [Amazon Order Scraper](#amazon-order-scraper)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running the Application](#running-the-application)
    - [Login Process](#login-process)
    - [Output](#output)
  - [Program Workflow](#program-workflow)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Diagnostic Files](#diagnostic-files)

## Features

- ✅ Command-line interface for entering credentials (email/phone and password)
- ✅ Support for both email and phone number login methods
- ✅ Secure password entry with masking
- ✅ Multiple login attempt handling (3 retries for username, password, and OTP)
- ✅ Automatic detection of Multi-Factor Authentication (MFA/OTP) requirements
- ✅ Support for OTP verification during login
- ✅ Intelligent error handling for various login scenarios
- ✅ Automatic navigation to order history pages
- ✅ Year-by-year order extraction (up to 5 years back)
- ✅ Extraction of order details including:
  - Product name
  - Price
  - Link to the product
- ✅ Support for multiple items per order
- ✅ JSON output for easy integration with other systems
- ✅ Diagnostic screenshot capture for troubleshooting
- ✅ Robust browser session handling and cleanup

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Internet connection
- Valid Amazon.in account credentials

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd mx-scrapper-assignment
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

### Running the Application

To run the application:

```bash
npm start
```

For development mode (using ts-node):

```bash
npm run dev
```

### Login Process

When you run the application:

1. You'll be prompted to enter your Amazon.in email or phone number
2. Then you'll be asked to enter your password (masked for security)
3. If incorrect credentials are provided, the application will allow up to 3 retries
4. If MFA is required, you'll be prompted to enter the OTP sent to your device

### Output

The application outputs:
- JSON data to the console showing the extracted orders
- A file named `order-history-extract.json` with the same data
- Diagnostic screenshots in the project root for troubleshooting

Example output format:
```json
[
  {
    "name": "Product Name",
    "price": "₹XXX.XX",
    "link": "https://www.amazon.in/product-page"
  },
  ...
]
```

## Program Workflow

1. **Initialization**: The program starts by initializing a headless browser instance using Playwright
2. **Login Process**:
   - Navigate to Amazon.in login page
   - Prompt user for email/phone and password
   - Handle login errors with retry mechanisms
   - Detect and handle OTP/MFA if required
   - Verify successful login

3. **Order Extraction**:
   - Navigate to order history page
   - Start with current year's orders
   - Extract order details (name, price, link)
   - If fewer than 10 orders found, move to previous years (up to 5 years back)
   - Handle multiple items per order
   - Collect up to 10 items total

4. **Output Generation**:
   - Format collected orders as JSON
   - Output to console
   - Save to order-history-extract.json file

5. **Cleanup**:
   - Close browser sessions
   - Release resources


## Troubleshooting

### Common Issues

1. **Login Failures**: 
   - Check if your credentials are correct
   - Ensure you're using an Amazon.in account
   - Review the screenshot files generated during login attempts

2. **No Orders Extracted**: 
   - Verify your account has orders in the past 5 years
   - Check if you can view your orders when logged in manually

### Diagnostic Files

The application generates several screenshot files to help diagnose issues:
- `login-page-state.png` - Initial login page
- `after-password-submit.png` - After password submission
- `possible-otp-page.png` - Potential OTP page detection
- `order-page-check.png` - Order history page 