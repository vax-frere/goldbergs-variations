/**
 * Centralized logger utility for the application.
 */

// Global configuration for verbosity. Set to true to enable detailed logs, false to disable.
const isVerbose = false; // Default verbosity level

/**
 * Logs messages to the console only if global verbosity is enabled.
 * @param {...any} args Arguments to pass to console.log
 */
export const log = (...args) => {
  if (isVerbose) {
    console.log(...args);
  }
};

// You can potentially add more logging levels here later (e.g., logWarn, logError)
// export const logWarn = (...args) => { ... };
// export const logError = (...args) => { ... }; 