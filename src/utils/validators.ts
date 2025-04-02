/**
 * Validators for user input
 */

/**
 * Validates if the input is a valid email or phone number
 * @param input User input for validation
 * @returns Object with validation result and type
 */
export function validateCredentials(input: string): { isValid: boolean; type: 'email' | 'phone' | 'unknown' } {
  // Check if input is an email (contains @ and .com)
  if (input.includes('@') && input.includes('.com')) {
    return { isValid: true, type: 'email' };
  }
  
  // Check if input is a 10-digit phone number
  if (/^\d{10}$/.test(input)) {
    return { isValid: true, type: 'phone' };
  }
  
  // Input is neither a valid email nor a valid phone number
  return { isValid: false, type: 'unknown' };
}

/**
 * Checks if password is not empty
 * @param password User input password
 * @returns Boolean indicating if password is valid
 */
export function validatePassword(password: string): boolean {
  return password.trim().length > 0;
} 