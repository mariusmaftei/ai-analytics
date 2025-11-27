/**
 * Image Analysis Service - Real backend integration
 * Handles image upload and AI analysis using Gemini Vision
 */

import api, { API_BASE_URL } from './api';

/**
 * Upload and analyze image file with real backend
 * @param {File} file - The image file to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeImageFile = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add analysis type if specified
    if (options.analysisType) {
      formData.append('analysis_type', options.analysisType);
    }
    
    // Add custom prompt if specified
    if (options.customPrompt) {
      formData.append('custom_prompt', options.customPrompt);
    }
    
    // Add save to DB flag if specified
    if (options.saveToDb) {
      formData.append('save_to_db', 'true');
    }

    const { data } = await api.post('/api/image/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (data.status === 'error') {
      throw new Error(data.message || 'Image analysis failed');
    }

    // Transform backend response to match frontend expectations
    return transformImageResponse(data);

  } catch (error) {
    console.error('Image Analysis Error:', error);
    throw error;
  }
};

/**
 * Transform backend response to match AnalysisPage expectations
 */
function transformImageResponse(backendData) {
  const rawResult = backendData.analysis?.result ?? '';
  const cleanedResult = backendData.analysis?.cleaned ?? rawResult;

  return {
    fileType: 'IMAGE',
    metadata: {
      ...backendData.metadata,
      totalPages: 1, // Images are single "page"
      wordCount: 0, // Images don't have word count
    },
    text: cleanedResult,
    insights: {
      summary: cleanedResult || 'Image analysis complete',
      patterns: [],
      analysisType: backendData.analysis?.type || 'general',
    },
    textContext: backendData.analysis?.textContext || null,
    analysis: rawResult,
    cleanedAnalysis: cleanedResult,
    imageUrl: null, // Will be set from file object URL
    width: backendData.metadata?.width || 0,
    height: backendData.metadata?.height || 0,
    format: backendData.metadata?.format || 'Unknown',
  };
}

/**
 * Get image metadata only (no AI analysis)
 * @param {File} file - The image file
 * @returns {Promise<Object>} Image metadata
 */
export const getImageMetadata = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/api/image/metadata', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (data.status === 'error') {
      throw new Error(data.message || 'Metadata extraction failed');
    }

    return data.metadata;

  } catch (error) {
    console.error('Image Metadata Error:', error);
    throw error;
  }
};

/**
 * Analyze image with streaming response
 * @param {File} file - The image file
 * @param {Object} options - Analysis options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} Full analysis text
 */
export const analyzeImageStream = async (
  file,
  options = {},
  onChunk = null,
  onMetadata = null,
  onRawText = null,
  onObjectsJson = null
) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.analysisType) {
      formData.append('analysis_type', options.analysisType);
    }
    
    if (options.customPrompt) {
      formData.append('custom_prompt', options.customPrompt);
    }

    const response = await fetch(`${API_BASE_URL}/api/image/analyze-stream`, {
      method: 'POST',
      body: formData,
    });

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
    let rawText = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return { text: fullText, rawText: rawText || fullText };
          }
          
          if (data.startsWith('[ERROR]')) {
            throw new Error(data);
          }

          if (data.startsWith('[RAW_TEXT]')) {
            rawText = data.slice('[RAW_TEXT]'.length);
            continue;
          }

          if (data.startsWith('[TEXT_CONTEXT]')) {
            const payload = data.slice('[TEXT_CONTEXT]'.length);
            try {
              const parsed = JSON.parse(payload);
              if (onMetadata) {
                onMetadata(parsed);
              }
            } catch (err) {
              console.error('Failed to parse OCR context payload:', err);
            }
            continue;
          }

          if (data.startsWith('[OBJECTS_JSON]')) {
            const payload = data.slice('[OBJECTS_JSON]'.length);
            try {
              const parsed = JSON.parse(payload);
              console.log('[imageAnalysisService] Parsed objects JSON:', parsed);
              if (onObjectsJson) {
                onObjectsJson(parsed);
              }
              // Set as fullText so component can access it
              fullText = JSON.stringify(parsed);
            } catch (err) {
              console.error('Failed to parse objects JSON payload:', err, 'Payload:', payload.substring(0, 200));
            }
            continue;
          }

          if (data.startsWith('[GENERAL_JSON]')) {
            const payload = data.slice('[GENERAL_JSON]'.length);
            try {
              const parsed = JSON.parse(payload);
              console.log('[imageAnalysisService] Parsed general analysis JSON:', parsed);
              // Store structured data for component access
              if (onObjectsJson) {
                // Reuse onObjectsJson callback for general structured data
                onObjectsJson(parsed);
              }
            } catch (err) {
              console.error('Failed to parse general JSON payload:', err, 'Payload:', payload.substring(0, 200));
            }
            continue;
          }

          if (data.startsWith('[SCENE_JSON]')) {
            const payload = data.slice('[SCENE_JSON]'.length);
            try {
              const parsed = JSON.parse(payload);
              console.log('[imageAnalysisService] Parsed scene analysis JSON:', parsed);
              if (onObjectsJson) {
                // Reuse onObjectsJson callback for scene structured data
                onObjectsJson(parsed);
              }
              // Set as fullText so component can access it
              fullText = JSON.stringify(parsed);
            } catch (err) {
              console.error('Failed to parse scene JSON payload:', err, 'Payload:', payload.substring(0, 200));
            }
            continue;
          }

          if (data.startsWith('[CHART_JSON]')) {
            const payload = data.slice('[CHART_JSON]'.length);
            try {
              const parsed = JSON.parse(payload);
              console.log('[imageAnalysisService] Parsed chart analysis JSON:', parsed);
              if (onObjectsJson) {
                onObjectsJson(parsed);
              }
              fullText = JSON.stringify(parsed);
            } catch (err) {
              console.error('Failed to parse chart JSON payload:', err, 'Payload:', payload.substring(0, 200));
            }
            continue;
          }

          if (data.startsWith('[DOCUMENT_JSON]')) {
            const payload = data.slice('[DOCUMENT_JSON]'.length);
            try {
              const parsed = JSON.parse(payload);
              console.log('[imageAnalysisService] Parsed document analysis JSON:', parsed);
              if (onObjectsJson) {
                onObjectsJson(parsed);
              }
              fullText = JSON.stringify(parsed);
            } catch (err) {
              console.error('Failed to parse document JSON payload:', err, 'Payload:', payload.substring(0, 200));
            }
            continue;
          }
          
          fullText += data;
          
          if (onChunk) {
            onChunk(data);
          }
        }
      }
    }

    return { text: fullText, rawText: rawText || fullText };

  } catch (error) {
    console.error('Image Streaming Analysis Error:', error);
    throw error;
  }
};

