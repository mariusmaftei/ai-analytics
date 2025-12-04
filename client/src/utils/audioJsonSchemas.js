/**
 * JSON Schemas for Audio Analysis Data
 * Used for validation and type checking of AI-generated JSON responses
 */

/**
 * Schema for Keywords Extraction
 */
export const KEYWORDS_SCHEMA = {
  keywords: {
    type: 'array',
    required: true,
    items: {
      keyword: { type: 'string', required: true },
      relevanceScore: { type: 'number', required: true, min: 0, max: 1 },
      frequency: { type: 'number', required: true, min: 0 },
      firstOccurrence: { type: 'string', required: false }, // MM:SS format
    },
  },
  keyPhrases: {
    type: 'array',
    required: false,
    items: {
      phrase: { type: 'string', required: true },
      relevanceScore: { type: 'number', required: false, min: 0, max: 1 },
      frequency: { type: 'number', required: false, min: 0 },
    },
  },
  namedEntities: {
    type: 'array',
    required: false,
    items: {
      entity: { type: 'string', required: true },
      type: { type: 'string', required: false }, // PERSON, ORGANIZATION, LOCATION, etc.
      frequency: { type: 'number', required: false, min: 0 },
    },
  },
  keywordClusters: {
    type: 'array',
    required: false,
    items: {
      clusterName: { type: 'string', required: true },
      keywords: { type: 'array', required: true, items: { type: 'string' } },
      description: { type: 'string', required: false },
    },
  },
};

/**
 * Schema for Speaker Analysis
 */
export const SPEAKERS_SCHEMA = {
  speakers: {
    type: 'array',
    required: true,
    items: {
      speakerId: { type: 'string', required: true },
      speakerLabel: { type: 'string', required: false },
      speakingTime: { type: 'number', required: true, min: 0 }, // seconds
      percentage: { type: 'number', required: true, min: 0, max: 100 },
      segments: { type: 'number', required: false, min: 0 },
      avgSegmentLength: { type: 'number', required: false, min: 0 },
      notes: { type: 'string', required: false },
    },
  },
  timeline: {
    type: 'array',
    required: false,
    items: {
      startTime: { type: 'number', required: true, min: 0 }, // seconds
      endTime: { type: 'number', required: true, min: 0 },
      speakerId: { type: 'string', required: true },
      transcript: { type: 'string', required: false },
    },
  },
  conversationPatterns: {
    type: 'array',
    required: false,
    items: { type: 'string' },
  },
};

/**
 * Schema for Sentiment Analysis
 */
export const SENTIMENT_SCHEMA = {
  overallSentiment: {
    type: 'object',
    required: true,
    properties: {
      label: { type: 'string', required: true }, // Positive, Negative, Neutral
      score: { type: 'number', required: true, min: 0, max: 1 },
    },
  },
  emotionBreakdown: {
    type: 'array',
    required: false,
    items: {
      emotion: { type: 'string', required: true },
      percentage: { type: 'number', required: true, min: 0, max: 100 },
      intensity: { type: 'number', required: false, min: 0, max: 1 },
    },
  },
  sentimentTimeline: {
    type: 'array',
    required: false,
    items: {
      timestamp: { type: 'string', required: true }, // MM:SS format
      sentiment: { type: 'string', required: true },
      score: { type: 'number', required: false, min: 0, max: 1 },
      transcript: { type: 'string', required: false },
    },
  },
};

/**
 * Schema for Action Items
 */
export const ACTION_ITEMS_SCHEMA = {
  actionItems: {
    type: 'array',
    required: true,
    items: {
      task: { type: 'string', required: true },
      assignedTo: { type: 'string', required: false },
      deadline: { type: 'string', required: false },
      priority: { type: 'string', required: false }, // High, Medium, Low
      timestamp: { type: 'string', required: false }, // MM:SS format
      notes: { type: 'string', required: false },
    },
  },
  decisions: {
    type: 'array',
    required: false,
    items: {
      decision: { type: 'string', required: true },
      timestamp: { type: 'string', required: false }, // MM:SS format
    },
  },
  deadlines: {
    type: 'array',
    required: false,
    items: {
      deadline: { type: 'string', required: true },
      date: { type: 'string', required: false },
      timestamp: { type: 'string', required: false }, // MM:SS format
    },
  },
};

/**
 * Schema for Timeline
 */
export const TIMELINE_SCHEMA = {
  timeline: {
    type: 'array',
    required: true,
    items: {
      startTime: { type: 'string', required: true }, // MM:SS format
      endTime: { type: 'string', required: true }, // MM:SS format
      speaker: { type: 'string', required: false },
      topic: { type: 'string', required: false },
      transcript: { type: 'string', required: false },
    },
  },
  keyMoments: {
    type: 'array',
    required: false,
    items: {
      timestamp: { type: 'string', required: true }, // MM:SS format
      type: { type: 'string', required: false }, // Decision, Action, Emotional, Topic Shift
      description: { type: 'string', required: true },
      transcript: { type: 'string', required: false },
    },
  },
  topicTransitions: {
    type: 'array',
    required: false,
    items: {
      timestamp: { type: 'string', required: true }, // MM:SS format
      fromTopic: { type: 'string', required: false },
      toTopic: { type: 'string', required: true },
      trigger: { type: 'string', required: false },
    },
  },
  transcriptHighlights: {
    type: 'array',
    required: false,
    items: {
      timestamp: { type: 'string', required: true }, // MM:SS format
      text: { type: 'string', required: true },
      type: { type: 'string', required: false },
      iconLabel: { type: 'string', required: false },
    },
  },
};

/**
 * Schema for Summary
 */
export const SUMMARY_SCHEMA = {
  executiveSummary: {
    type: 'string',
    required: true,
  },
  keyPoints: {
    type: 'array',
    required: true,
    items: { type: 'string' },
  },
};

/**
 * Schema for Content Analysis
 */
export const CONTENT_ANALYSIS_SCHEMA = {
  topicClusters: {
    type: 'array',
    required: false,
    items: {
      topic: { type: 'string', required: true },
      description: { type: 'string', required: false },
      keywords: { type: 'array', required: false, items: { type: 'string' } },
    },
  },
  discussionFlow: {
    type: 'array',
    required: false,
    items: {
      timestamp: { type: 'string', required: false }, // MM:SS format
      topic: { type: 'string', required: true },
      description: { type: 'string', required: false },
    },
  },
  keyConcepts: {
    type: 'array',
    required: false,
    items: { type: 'string' },
  },
};

/**
 * Schema for Overview
 */
export const OVERVIEW_SCHEMA = {
  fileInfo: {
    type: 'object',
    required: true,
    properties: {
      fileType: { type: 'string', required: true },
      format: { type: 'string', required: true },
      duration: { type: 'string', required: true },
      fileSize: { type: 'string', required: true },
      language: { type: 'string', required: true },
      wordCount: { type: 'number', required: false },
      speakersDetected: { type: 'number', required: false },
      contentType: { type: 'string', required: false },
    },
  },
  description: {
    type: 'object',
    required: false,
    properties: {
      artist: { type: 'string', required: false },
      album: { type: 'string', required: false },
      typeOfMusic: { type: 'string', required: false },
      genre: { type: 'string', required: false },
      description: { type: 'string', required: false },
    },
  },
  keyThemes: {
    type: 'array',
    required: false,
    items: { type: 'string' },
  },
  statistics: {
    type: 'object',
    required: false,
    properties: {
      speakingRate: { type: 'string', required: false },
      averageWordsPerMinute: { type: 'string', required: false },
      totalSpeakingTime: { type: 'string', required: false },
      pausesAndSilence: { type: 'string', required: false },
    },
  },
};

/**
 * Schema for Metadata
 */
export const METADATA_SCHEMA = {
  fileInfo: {
    type: 'object',
    required: false,
    properties: {
      fileName: { type: 'string', required: false },
      fileType: { type: 'string', required: false },
      fileSize: { type: 'string', required: false },
      duration: { type: 'string', required: false }, // MM:SS format
      uploadedOn: { type: 'string', required: false },
    },
  },
  technicalDetails: {
    type: 'object',
    required: false,
    properties: {
      format: { type: 'string', required: false },
      sampleRate: { type: 'string', required: false },
      bitrate: { type: 'string', required: false },
      channels: { type: 'string', required: false },
      encoding: { type: 'string', required: false },
      loudness: { type: 'string', required: false },
      peakLevel: { type: 'string', required: false },
      noiseLevel: { type: 'string', required: false },
      dynamicRange: { type: 'string', required: false },
    },
  },
  audioProperties: {
    type: 'object',
    required: false,
    properties: {
      channelBreakdown: { type: 'string', required: false },
      waveformCharacteristics: { type: 'string', required: false },
    },
  },
  aiQuality: {
    type: 'object',
    required: false,
    properties: {
      analysisConfidence: { type: 'number', required: false, min: 0, max: 1 },
      audioClarity: { type: 'string', required: false },
      speechDetection: { type: 'string', required: false }, // Percentage as string
    },
  },
  transcriptionMetadata: {
    type: 'object',
    required: false,
    properties: {
      language: { type: 'string', required: false },
      wordCount: { type: 'number', required: false },
      speakerLabels: { type: 'string', required: false },
      transcriptionMethod: { type: 'string', required: false },
    },
  },
  optionalMetadata: {
    type: 'object',
    required: false,
    properties: {
      artist: { type: 'string', required: false },
      album: { type: 'string', required: false },
      title: { type: 'string', required: false },
      genre: { type: 'string', required: false },
      recordingDevice: { type: 'string', required: false },
      gpsLocation: { type: 'string', required: false },
    },
  },
};

/**
 * Validate data against a schema
 * @param {*} data - Data to validate
 * @param {Object} schema - Schema definition
 * @param {string} componentName - Component name for error logging
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateSchema = (data, schema, componentName = 'Unknown') => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data is not an object'] };
  }

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field];

    // Check if required field is missing
    if (fieldSchema.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    // Skip validation if field is optional and missing
    if (!fieldSchema.required && (value === undefined || value === null)) {
      continue;
    }

    // Validate type
    if (fieldSchema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`Field ${field} must be an array`);
        continue;
      }

      // Validate array items if schema provided
      if (fieldSchema.items) {
        value.forEach((item, index) => {
          if (fieldSchema.items.type === 'string' && typeof item !== 'string') {
            errors.push(`Field ${field}[${index}] must be a string`);
          } else if (fieldSchema.items.type === 'object') {
            const itemErrors = validateObject(item, fieldSchema.items, `${field}[${index}]`);
            errors.push(...itemErrors);
          }
        });
      }
    } else if (fieldSchema.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`Field ${field} must be an object`);
        continue;
      }

      // Validate object properties
      if (fieldSchema.properties) {
        const propErrors = validateObject(value, fieldSchema.properties, field);
        errors.push(...propErrors);
      }
    } else if (fieldSchema.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`Field ${field} must be a string`);
      }
    } else if (fieldSchema.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Field ${field} must be a number`);
      } else {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
          errors.push(`Field ${field} must be >= ${fieldSchema.min}`);
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
          errors.push(`Field ${field} must be <= ${fieldSchema.max}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate object properties
 * @param {Object} obj - Object to validate
 * @param {Object} propertiesSchema - Properties schema
 * @param {string} prefix - Field prefix for error messages
 * @returns {string[]} - Array of error messages
 */
const validateObject = (obj, propertiesSchema, prefix = '') => {
  const errors = [];

  for (const [prop, propSchema] of Object.entries(propertiesSchema)) {
    const value = obj[prop];

    if (propSchema.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${prefix ? `${prefix}.` : ''}${prop}`);
      continue;
    }

    if (!propSchema.required && (value === undefined || value === null)) {
      continue;
    }

    if (propSchema.type === 'string' && typeof value !== 'string') {
      errors.push(`Field ${prefix ? `${prefix}.` : ''}${prop} must be a string`);
    } else if (propSchema.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
      errors.push(`Field ${prefix ? `${prefix}.` : ''}${prop} must be a number`);
    } else if (propSchema.type === 'array' && !Array.isArray(value)) {
      errors.push(`Field ${prefix ? `${prefix}.` : ''}${prop} must be an array`);
    }
  }

  return errors;
};

