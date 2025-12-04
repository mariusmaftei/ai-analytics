/**
 * Audio Analysis Service - Backend integration
 * Handles audio upload, transcription, and AI analysis
 */

import api, { API_BASE_URL } from './api';
import { RETRY_OPTIONS, retryFetchRequest } from '../utils/retryUtils';
import { errorLog } from '../utils/debugLogger';

/**
 * Upload and analyze audio file with real backend
 * @param {File} file - The audio file to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeAudioFile = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add analysis type if specified
    if (options.analysisType) {
      formData.append('analysis_type', options.analysisType);
    }
    
    // Add save to DB flag if specified
    if (options.saveToDb) {
      formData.append('save_to_db', 'true');
    }

    const response = await api.post('/api/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes for audio uploads (transcription can take time)
      _retryConfig: RETRY_OPTIONS.LONG, // Use long-running retry config
    });

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Audio analysis failed');
    }

    // Transform backend response to match frontend expectations
    return transformAudioResponse(data);

  } catch (error) {
    errorLog('audioAnalysisService', 'Audio Analysis Error', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }
};

/**
 * Transform backend response to match AnalysisPage expectations
 */
function transformAudioResponse(backendData) {
  return {
    fileType: 'AUDIO',
    success: true,
    
    // Metadata
    metadata: {
      duration: backendData.metadata?.duration || 0,
      format: backendData.metadata?.format || 'unknown',
      fileSize: backendData.metadata?.file_size || 0,
      sampleRate: backendData.metadata?.sample_rate || null,
      channels: backendData.metadata?.channels || null,
      bitrate: backendData.metadata?.bitrate || null,
      // Audio analysis metrics
      loudness: backendData.metadata?.loudness || null,
      peak_level: backendData.metadata?.peak_level || null,
      noise_level: backendData.metadata?.noise_level || null,
      dynamic_range: backendData.metadata?.dynamic_range || null,
    },
    
    // Transcription
    transcription: {
      text: backendData.transcription?.text || '',
      segments: backendData.transcription?.segments || [],
      language: backendData.transcription?.language || 'unknown',
      wordCount: backendData.transcription?.word_count || 0,
      sentiment: backendData.transcription?.sentiment || [],
      duration: backendData.transcription?.duration || 0,
    },
    
    // Extracted content (use transcript as text)
    text: backendData.transcription?.text || '',
    
    // AI Analysis
    insights: {
      summary: backendData.analysis?.result || 
               `Audio transcription complete. ${backendData.transcription?.word_count || 0} words transcribed.`,
      patterns: generatePatterns(backendData),
    },
    
    // Additional data
    uploadedAt: backendData.uploaded_at,
    filename: backendData.filename,
    dbId: backendData.db_id || null,
    
    // Analysis data
    analysis: backendData.analysis?.result || null,
    analysisType: backendData.analysis?.type || 'overview',
  };
}

/**
 * Generate insight patterns from audio data
 */
function generatePatterns(data) {
  const patterns = [];
  
  if (data.metadata?.duration) {
    const minutes = Math.floor(data.metadata.duration / 60);
    const seconds = Math.floor(data.metadata.duration % 60);
    patterns.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  }
  
  if (data.transcription?.word_count) {
    patterns.push(`${data.transcription.word_count} words transcribed`);
  }
  
  if (data.transcription?.language && data.transcription.language !== 'unknown') {
    patterns.push(`Language: ${data.transcription.language.toUpperCase()}`);
  }
  
  if (data.metadata?.format) {
    patterns.push(`Format: ${data.metadata.format.toUpperCase()}`);
  }
  
  return patterns;
}

/**
 * Get audio metadata only (faster, no transcription)
 */
export const getAudioMetadata = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/api/audio/metadata', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      _retryConfig: RETRY_OPTIONS.QUICK, // Use quick retry config for metadata
    });

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return data.metadata;

  } catch (error) {
    errorLog('audioAnalysisService', 'Audio Metadata Error', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }
};

/**
 * Analyze audio with streaming response
 * @param {File} file - The audio file
 * @param {Object} options - Analysis options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} Full analysis text
 */
export const analyzeAudioStream = async (
  file,
  options = {},
  onChunk = null
) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.analysisType) {
      formData.append('analysis_type', options.analysisType);
    }

    const response = await retryFetchRequest(
      () =>
        fetch(`${API_BASE_URL}/api/audio/analyze-stream`, {
          method: 'POST',
          body: formData,
        }),
      RETRY_OPTIONS.STREAMING
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorMessage = `Streaming analysis failed: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return { text: fullText };
          }
          
          if (data.startsWith('[ERROR]')) {
            throw new Error(data);
          }
          
          fullText += data;
          
          if (onChunk) {
            onChunk(data);
          }
        }
      }
    }

    return { text: fullText };

  } catch (error) {
    errorLog('audioAnalysisService', 'Audio Streaming Analysis Error', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }
};

