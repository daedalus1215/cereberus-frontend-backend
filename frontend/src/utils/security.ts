/**
 * Security utilities for frontend
 * Implements additional security measures to protect against common attacks
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  message: string;
} => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

/**
 * Check if the current environment is secure (HTTPS in production)
 * @returns boolean indicating if environment is secure
 */
export const isSecureEnvironment = (): boolean => {
  if (typeof window === 'undefined') {
    return true; // Server-side rendering
  }
  
  // In development, allow HTTP
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, require HTTPS
  return window.location.protocol === 'https:';
};

/**
 * Generate a secure random string for CSRF protection
 * @param length - Length of the random string
 * @returns Random string
 */
export const generateSecureRandomString = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Mask sensitive data for logging
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(8);
  }
  
  const maskedLength = Math.max(8, data.length - visibleChars);
  return '*'.repeat(maskedLength) + data.slice(-visibleChars);
};

/**
 * Check if the application is running in a secure context
 * @returns boolean indicating if running in secure context
 */
export const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') {
    return true; // Server-side rendering
  }
  
  return window.isSecureContext;
};

/**
 * Security headers configuration for API requests
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};
