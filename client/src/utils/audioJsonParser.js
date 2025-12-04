/**
 * JSON Parser for Audio Analysis Data
 * Parses AI-generated JSON responses with fallback to text parsing
 */

import { errorLog, warnLog } from './debugLogger';
import { validateSchema } from './audioJsonSchemas';

/**
 * Extract JSON from AI response text
 * Handles cases where AI returns JSON wrapped in markdown code blocks or plain text
 * @param {string} text - Raw AI response text
 * @returns {Object|null} - Parsed JSON object or null if parsing fails
 */
export const extractJsonFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Try to find JSON in markdown code blocks (non-greedy to get first complete block)
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      return parsed;
    } catch (e) {
      warnLog('audioJsonParser', 'Failed to parse JSON from code block', e);
    }
  }

  // Try to find JSON object directly (use non-greedy match to avoid capturing too much)
  // Look for the first complete JSON object
  let braceCount = 0;
  let startIndex = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (startIndex === -1) startIndex = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        // Found complete JSON object
        const jsonStr = text.substring(startIndex, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          warnLog('audioJsonParser', 'Failed to parse JSON object', e);
        }
        // Reset and continue looking
        startIndex = -1;
      }
    }
  }
  
  // Fallback: try simple regex match (but this might capture too much)
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch (e) {
      warnLog('audioJsonParser', 'Failed to parse JSON object', e);
    }
  }

  // Try parsing the entire text as JSON
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
  } catch (e) {
    warnLog('audioJsonParser', 'Failed to parse text as JSON', e);
  }

  return null;
};

/**
 * Parse audio analysis data from AI response
 * Attempts JSON parsing first, falls back to text parsing if needed
 * @param {string} rawText - Raw AI response text
 * @param {Object} schema - Schema to validate against
 * @param {Function} textParser - Fallback text parser function
 * @param {string} componentName - Component name for logging
 * @returns {{ data: Object, isValid: boolean, errors: string[], rawText: string }}
 */
export const parseAudioAnalysisData = (
  rawText,
  schema,
  textParser = null,
  componentName = 'Unknown'
) => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      data: null,
      isValid: false,
      errors: ['No raw text provided'],
      rawText: rawText || '',
    };
  }

  // Try JSON parsing first
  const jsonData = extractJsonFromText(rawText);

  if (jsonData) {
    // Validate against schema
    const validation = validateSchema(jsonData, schema, componentName);

    if (validation.valid) {
      return {
        data: jsonData,
        isValid: true,
        errors: [],
        rawText,
        format: 'json',
      };
    } else {
      warnLog(
        componentName,
        'JSON parsed but validation failed',
        validation.errors
      );
      
      // If validation fails but we have data, return it with warnings
      // This allows graceful degradation
      return {
        data: jsonData,
        isValid: false,
        errors: validation.errors,
        rawText,
        format: 'json',
      };
    }
  }

  // Fallback to text parsing if JSON parsing fails
  if (textParser) {
    try {
      const parsedData = textParser(rawText);
      return {
        data: parsedData,
        isValid: false, // Mark as invalid since we had to use fallback
        errors: ['JSON parsing failed, using text parser fallback'],
        rawText,
        format: 'text',
      };
    } catch (error) {
      errorLog(componentName, 'Text parser fallback failed', error);
      return {
        data: null,
        isValid: false,
        errors: [
          'JSON parsing failed',
          'Text parser fallback failed',
          error.message,
        ],
        rawText,
        format: 'text',
      };
    }
  }

  // No parser available
  return {
    data: null,
    isValid: false,
    errors: ['JSON parsing failed and no text parser available'],
    rawText,
    format: 'text',
  };
};

/**
 * Check if response is likely JSON
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export const isJsonResponse = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    /```(?:json)?\s*\{/.test(text)
  );
};

