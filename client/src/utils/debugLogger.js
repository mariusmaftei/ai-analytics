/**
 * Debug Logger Utility
 * Centralized logging that only works in development mode
 * Prevents sensitive data from being logged in production
 */

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Log debug messages (only in development)
 * @param {string} component - Component name
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 */
export const debugLog = (component, message, data = null) => {
  if (DEBUG) {
    if (data !== null) {
      console.log(`[${component}] ${message}`, data);
    } else {
      console.log(`[${component}] ${message}`);
    }
  }
};

/**
 * Log warnings (always logged)
 * @param {string} component - Component name
 * @param {string} message - Warning message
 * @param {*} data - Optional data to log
 */
export const warnLog = (component, message, data = null) => {
  if (data !== null) {
    console.warn(`[${component}] ${message}`, data);
  } else {
    console.warn(`[${component}] ${message}`);
  }
};

/**
 * Log errors (always logged)
 * @param {string} component - Component name
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
export const errorLog = (component, message, error = null) => {
  if (error) {
    console.error(`[${component}] ${message}`, error);
  } else {
    console.error(`[${component}] ${message}`);
  }
};

/**
 * Log info messages (only in development)
 * @param {string} component - Component name
 * @param {string} message - Info message
 * @param {*} data - Optional data to log
 */
export const infoLog = (component, message, data = null) => {
  if (DEBUG) {
    if (data !== null) {
      console.info(`[${component}] ${message}`, data);
    } else {
      console.info(`[${component}] ${message}`);
    }
  }
};

/**
 * Sanitize sensitive data before logging
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized data
 */
export const sanitizeForLogging = (data) => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Truncate long strings (like transcripts)
    if (data.length > 500) {
      return data.substring(0, 500) + '... (truncated)';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    // Remove sensitive fields
    const sensitiveFields = ['transcript', 'text', 'password', 'token', 'apiKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    return sanitized;
  }
  
  return data;
};

/**
 * Safe debug log that sanitizes sensitive data
 * @param {string} component - Component name
 * @param {string} message - Log message
 * @param {*} data - Data to log (will be sanitized)
 */
export const safeDebugLog = (component, message, data = null) => {
  if (DEBUG) {
    const sanitized = sanitizeForLogging(data);
    debugLog(component, message, sanitized);
  }
};

