/**
 * Retry utility for API calls with exponential backoff
 * Handles retries for network errors, timeouts, and server errors (5xx)
 */

import { errorLog } from './debugLogger';

/**
 * Check if an error should be retried
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error should be retried
 */
export const shouldRetry = (error) => {
  // Don't retry client errors (4xx) - these are usually permanent
  if (error.response) {
    const status = error.response.status;
    // Retry on 5xx server errors
    if (status >= 500 && status < 600) {
      return true;
    }
    // Retry on 408 Request Timeout and 429 Too Many Requests
    if (status === 408 || status === 429) {
      return true;
    }
    // Don't retry other 4xx errors
    return false;
  }

  // Retry on network errors
  if (error.request || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // Retry on connection errors
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('Failed to fetch')
  ) {
    return true;
  }

  return false;
};

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} options - Retry options
 * @returns {number} - Delay in milliseconds
 */
const calculateDelay = (attempt, options = {}) => {
  const { baseDelay = 1000, maxDelay = 30000, backoffMultiplier = 2 } = options;
  const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The function to retry (must return a Promise)
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {number} options.backoffMultiplier - Backoff multiplier (default: 2)
 * @param {Function} options.shouldRetry - Custom function to determine if error should be retried
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise<any>} - The result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry: customShouldRetry = shouldRetry,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxRetries && customShouldRetry(error)) {
        const delay = calculateDelay(attempt, {
          baseDelay,
          maxDelay,
          backoffMultiplier,
        });

        if (onRetry) {
          onRetry(error, attempt + 1, delay);
        } else {
          errorLog(
            'retryUtils',
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
            {
              error: error.message,
              status: error.response?.status,
              code: error.code,
            }
          );
        }

        await sleep(delay);
        continue;
      }

      // Don't retry - throw the error
      throw error;
    }
  }

  // This should never be reached, but TypeScript/ESLint might complain
  throw lastError;
};

/**
 * Create a retry wrapper for axios requests
 * @param {Function} axiosRequest - Axios request function
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<any>} - Axios response
 */
export const retryAxiosRequest = async (axiosRequest, retryOptions = {}) => {
  return retryWithBackoff(
    async () => {
      const response = await axiosRequest();
      return response;
    },
    retryOptions
  );
};

/**
 * Create a retry wrapper for fetch requests
 * @param {Function} fetchRequest - Fetch request function
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} - Fetch response
 */
export const retryFetchRequest = async (fetchRequest, retryOptions = {}) => {
  return retryWithBackoff(
    async () => {
      const response = await fetchRequest();
      
      // Check if response is ok, if not, throw an error that can be retried
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        error.status = response.status;
        throw error;
      }
      
      return response;
    },
    retryOptions
  );
};

/**
 * Default retry options for different request types
 */
export const RETRY_OPTIONS = {
  // Quick requests (metadata, simple API calls)
  QUICK: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
  },
  
  // Standard requests (most API calls)
  STANDARD: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  
  // Long-running requests (file uploads, analysis)
  LONG: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 30000,
  },
  
  // Streaming requests (should retry less aggressively)
  STREAMING: {
    maxRetries: 1,
    baseDelay: 2000,
    maxDelay: 10000,
  },
};

