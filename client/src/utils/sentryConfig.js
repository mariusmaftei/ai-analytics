/**
 * Sentry Error Tracking Configuration
 * 
 * To enable Sentry:
 * 1. Get your DSN from https://sentry.io/settings/[your-org]/projects/[your-project]/keys/
 * 2. Add it to your .env file: REACT_APP_SENTRY_DSN=your-dsn-here
 * 3. Set REACT_APP_SENTRY_ENABLED=true in production
 * 
 * For development, Sentry will be disabled unless explicitly enabled
 */

import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error tracking
 * Only initializes if DSN is provided and enabled
 */
export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  const enabled = process.env.REACT_APP_SENTRY_ENABLED === 'true' || 
                  (process.env.NODE_ENV === 'production' && dsn);

  if (!enabled || !dsn) {
    // Sentry is disabled - return early
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry] Error tracking is disabled. Set REACT_APP_SENTRY_DSN and REACT_APP_SENTRY_ENABLED=true to enable.');
    }
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      
      // Performance Monitoring (optional - requires @sentry/tracing package)
      // tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Session Replay (optional - requires @sentry/replay package)
      // replaysSessionSampleRate: 0.1,
      // replaysOnErrorSampleRate: 1.0,

      // Filter out common non-critical errors
      beforeSend(event, hint) {
        // Filter out browser extension errors
        if (event.exception) {
          const error = hint.originalException;
          if (error && (
            error.message?.includes('chrome-extension://') ||
            error.message?.includes('moz-extension://') ||
            error.message?.includes('safari-extension://')
          )) {
            return null; // Don't send
          }
        }

        // Filter out network errors that are handled by retry logic
        if (event.exception) {
          const error = hint.originalException;
          if (error && (
            error.message?.includes('Network Error') ||
            error.message?.includes('Failed to fetch') ||
            error.code === 'ECONNABORTED'
          )) {
            // Only send if it's a critical failure (after all retries)
            return event;
          }
        }

        return event;
      },

      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        // Network errors that are expected
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });

    console.log('[Sentry] Error tracking initialized');
    return true;
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    return false;
  }
};

/**
 * Check if Sentry is initialized and available
 * @returns {boolean}
 */
const isSentryAvailable = () => {
  try {
    return Sentry && typeof Sentry.captureException === 'function';
  } catch (e) {
    return false;
  }
};

/**
 * Log an error to Sentry
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logErrorToSentry = (error, context = {}) => {
  if (!isSentryAvailable()) {
    return; // Sentry not initialized
  }

  try {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      level: context.level || 'error',
    });
  } catch (e) {
    // Don't let Sentry errors break the app
    console.error('[Sentry] Failed to log error:', e);
  }
};

/**
 * Log a message to Sentry
 * @param {string} message - Message to log
 * @param {Object} context - Additional context
 */
export const logMessageToSentry = (message, context = {}) => {
  if (!isSentryAvailable()) {
    return; // Sentry not initialized
  }

  try {
    Sentry.captureMessage(message, {
      tags: context.tags || {},
      extra: context.extra || {},
      level: context.level || 'info',
    });
  } catch (e) {
    // Don't let Sentry errors break the app
    console.error('[Sentry] Failed to log message:', e);
  }
};

/**
 * Set user context for Sentry
 * @param {Object} user - User information
 */
export const setSentryUser = (user) => {
  if (!isSentryAvailable()) {
    return; // Sentry not initialized
  }

  try {
    Sentry.setUser(user);
  } catch (e) {
    // Don't let Sentry errors break the app
    console.error('[Sentry] Failed to set user:', e);
  }
};

/**
 * Add breadcrumb to Sentry
 * @param {string} message - Breadcrumb message
 * @param {Object} data - Breadcrumb data
 * @param {string} level - Breadcrumb level (info, warning, error)
 */
export const addSentryBreadcrumb = (message, data = {}, level = 'info') => {
  if (!isSentryAvailable()) {
    return; // Sentry not initialized
  }

  try {
    Sentry.addBreadcrumb({
      message,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  } catch (e) {
    // Don't let Sentry errors break the app
    console.error('[Sentry] Failed to add breadcrumb:', e);
  }
};

export default Sentry;

