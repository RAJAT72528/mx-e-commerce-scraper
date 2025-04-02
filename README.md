# Amazon Order Scraper

A TypeScript application that logs into Amazon.in, handles MFA, and scrapes the latest 10 order purchases (or as many as found up to 5 years).

## Features

- Command-line interface for entering credentials (email/phone and password)
- Supports both email and phone number login methods
- Handles Multi-Factor Authentication (MFA) when required
- Scrapes order history for the latest 10 purchases
- Falls back to older years (up to 5 years) if fewer than 10 orders found in current year
- Outputs order details (name, price, link) in JSON format

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

Run the application with:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### Login Process

1. Enter your Amazon.in email or phone number when prompted
2. Enter your password
3. If MFA is required, you'll be prompted to enter the code sent to your device
4. The application will automatically scrape your order history

## Development

This project uses:
- TypeScript for type-safe code
- Playwright for browser automation
- Inquirer for command-line prompts

## Notes

- Only works with Amazon.in accounts
- Does not store any credentials or personal information
- Uses a non-headless browser by default for development (can be changed in the code) 