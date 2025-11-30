/**
 * Insight Generation Service
 * Calls backend endpoint that builds prompts server-side for security
 */

import { API_BASE_URL } from './api';

/**
 * Generate insights for a document/CSV file
 * @param {Object} params - Parameters for insight generation
 * @param {Function} onChunk - Callback for streaming chunks
 * @returns {Promise<string>} Complete AI response
 */
export const generateInsights = async (params, onChunk) => {
  try {
    const {
      fileType,
      csvData,
      columns,
      metadata,
      text,
      tables,
      temperature = 0.7,
      max_tokens = 2048,
    } = params;

    console.log('Generating insights with params:', {
      fileType,
      hasCsvData: !!csvData,
      csvDataLength: csvData?.length,
      hasColumns: !!columns,
      columnsLength: columns?.length,
      hasText: !!text,
      textLength: text?.length,
      hasMetadata: !!metadata,
    });

    // Prepare request payload
    const payload = {
      fileType: fileType,
      temperature,
      max_tokens,
    };

    // Add file-type specific data
    if (fileType === 'CSV') {
      if (!csvData || !columns) {
        throw new Error('CSV data and columns are required for CSV files');
      }
      payload.data = csvData;
      payload.columns = columns;
      payload.metadata = metadata || {};
      payload.analysisType = params.analysisType || 'overview';
    } else {
      // For non-CSV files, text is required
      if (!text) {
        throw new Error('Document text is required for non-CSV files');
      }
      payload.text = text;
      payload.metadata = metadata || {};
      payload.tables = tables || [];
      payload.analysisType = params.analysisType || 'overview';
    }

    console.log('Sending request to:', `${API_BASE_URL}/api/ai/generate-insights-stream`);
    console.log('Payload:', {
      ...payload,
      data: payload.data ? `[${payload.data.length} rows]` : undefined,
      text: payload.text ? `[${payload.text.length} chars]` : undefined,
    });

    const response = await fetch(`${API_BASE_URL}/api/ai/generate-insights-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (e2) {
          // Ignore
        }
      }
      console.error('API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let hasReceivedData = false;

    console.log('Starting to read stream...');

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('Stream finished. Total text length:', fullText.length);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6).trim();

          if (text.startsWith('[ERROR]')) {
            const errorMsg = text.replace('[ERROR]', '').trim();
            console.error('Stream error:', errorMsg);
            throw new Error(errorMsg);
          }

          if (text) {
            hasReceivedData = true;
            fullText += text;

            if (onChunk) {
              onChunk(text);
            }
          }
        } else if (line.trim() && !line.startsWith('data:')) {
          // Handle cases where data might not have "data: " prefix
          const text = line.trim();
          if (text && !text.startsWith('[ERROR]')) {
            hasReceivedData = true;
            fullText += text;

            if (onChunk) {
              onChunk(text);
            }
          }
        }
      }
    }

    if (!hasReceivedData) {
      console.warn('No data received from stream');
      throw new Error('No data received from the server. Please check the backend logs.');
    }

    console.log('Stream complete. Final text length:', fullText.length);
    return fullText;
  } catch (error) {
    console.error('Insight Generation Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

