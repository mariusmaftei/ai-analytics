/**
 * Audio Parsing Helpers
 * Utility functions for safely parsing audio analysis data with error handling
 */

import { errorLog, warnLog } from "./debugLogger";

/**
 * Safely parse a value with error handling
 * @param {Function} parseFn - Parsing function to execute
 * @param {*} defaultValue - Default value if parsing fails
 * @param {string} componentName - Component name for logging
 * @param {string} fieldName - Field name for logging
 * @returns {*} Parsed value or default
 */
export const safeParse = (parseFn, defaultValue, componentName, fieldName) => {
  try {
    return parseFn();
  } catch (error) {
    errorLog(
      componentName,
      `Failed to parse ${fieldName}:`,
      error
    );
    return defaultValue;
  }
};

/**
 * Validate parsed data structure
 * @param {*} data - Data to validate
 * @param {Object} schema - Expected schema { field: type }
 * @param {string} componentName - Component name for logging
 * @returns {boolean} True if valid
 */
export const formatLanguage = (langCode) => {
  if (!langCode || langCode === "UNKNOWN" || langCode === "N/A") {
    return langCode === "UNKNOWN" ? "Unknown" : "N/A";
  }

  const languageMap = {
    LA: "Latin",
    EN: "English",
    EN_US: "English (US)",
    ES: "Spanish",
    FR: "French",
    DE: "German",
    IT: "Italian",
    PT: "Portuguese",
    RU: "Russian",
    ZH: "Chinese",
    JA: "Japanese",
    KO: "Korean",
    AR: "Arabic",
    HI: "Hindi",
    NL: "Dutch",
    PL: "Polish",
    TR: "Turkish",
    SV: "Swedish",
    DA: "Danish",
    NO: "Norwegian",
    FI: "Finnish",
    EL: "Greek",
    HE: "Hebrew",
    TH: "Thai",
    VI: "Vietnamese",
    CS: "Czech",
    HU: "Hungarian",
    RO: "Romanian",
    BG: "Bulgarian",
    HR: "Croatian",
    SK: "Slovak",
    SL: "Slovenian",
    ET: "Estonian",
    LV: "Latvian",
    LT: "Lithuanian",
    UK: "Ukrainian",
    SR: "Serbian",
    MK: "Macedonian",
    SQ: "Albanian",
    BS: "Bosnian",
    IS: "Icelandic",
    GA: "Irish",
    MT: "Maltese",
    CY: "Welsh",
    CA: "Catalan",
    EU: "Basque",
    GL: "Galician",
  };

  const upperCode = langCode.toUpperCase();
  if (languageMap[upperCode]) {
    return languageMap[upperCode];
  }

  const baseCode = upperCode.split("_")[0];
  if (languageMap[baseCode]) {
    return languageMap[baseCode];
  }

  return langCode;
};

export const validateParsedData = (data, schema, componentName) => {
  if (!data || typeof data !== "object") {
    warnLog(componentName, "Parsed data is not an object");
    return false;
  }

  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in data)) {
      warnLog(componentName, `Missing required field: ${field}`);
      return false;
    }

    const actualType = Array.isArray(data[field]) ? "array" : typeof data[field];
    if (actualType !== expectedType) {
      warnLog(
        componentName,
        `Field ${field} has wrong type. Expected: ${expectedType}, Got: ${actualType}`
      );
      return false;
    }
  }

  return true;
};

/**
 * Parse timestamp string (MM:SS) to seconds
 * @param {string} timestamp - Timestamp string (e.g., "01:23")
 * @returns {number} Seconds or 0 if invalid
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp !== "string") return 0;

  try {
    const parts = timestamp.split(":");
    if (parts.length !== 2) return 0;

    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds)) return 0;

    return minutes * 60 + seconds;
  } catch (error) {
    return 0;
  }
};

/**
 * Format seconds to MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Safely extract section from text using regex
 * @param {string} text - Text to search
 * @param {RegExp} pattern - Regex pattern
 * @param {string} componentName - Component name for logging
 * @param {string} sectionName - Section name for logging
 * @returns {string|null} Extracted section text or null
 */
export const extractSection = (text, pattern, componentName, sectionName) => {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  } catch (error) {
    errorLog(
      componentName,
      `Failed to extract ${sectionName} section:`,
      error
    );
    return null;
  }
};

/**
 * Safely parse array from text
 * @param {string} text - Text to parse
 * @param {RegExp} pattern - Regex pattern to match items
 * @param {Function} parseItem - Function to parse each match
 * @param {string} componentName - Component name for logging
 * @param {string} itemName - Item name for logging
 * @returns {Array} Parsed array
 */
export const parseArray = (
  text,
  pattern,
  parseItem,
  componentName,
  itemName
) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  try {
    const matches = [...text.matchAll(pattern)];
    const items = [];

    for (const match of matches) {
      try {
        const item = parseItem(match);
        if (item) {
          items.push(item);
        }
      } catch (error) {
        warnLog(
          componentName,
          `Failed to parse ${itemName} item:`,
          error
        );
      }
    }

    return items;
  } catch (error) {
    errorLog(
      componentName,
      `Failed to parse ${itemName} array:`,
      error
    );
    return [];
  }
};

/**
 * Clean and validate string value
 * @param {*} value - Value to clean
 * @param {string} defaultValue - Default if invalid
 * @returns {string} Cleaned string
 */
export const cleanString = (value, defaultValue = "") => {
  if (value === null || value === undefined || value === "—" || value === "N/A") {
    return defaultValue;
  }

  const cleaned = String(value).trim();
  if (cleaned === "" || cleaned.toLowerCase() === "none") {
    return defaultValue;
  }

  return cleaned;
};

/**
 * Clean and validate number value
 * @param {*} value - Value to clean
 * @param {number} defaultValue - Default if invalid
 * @returns {number} Valid number
 */
export const cleanNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "—" || value === "N/A") {
    return defaultValue;
  }

  const num = typeof value === "number" ? value : parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

