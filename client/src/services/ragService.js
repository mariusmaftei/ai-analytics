/**
 * RAG Service - Retrieval-Augmented Generation for document queries
 */

import api, { API_BASE_URL } from './api';

/**
 * Query documents using RAG (streaming)
 * @param {string} query - User's question
 * @param {string} documentId - Optional document ID to filter by
 * @param {Function} onChunk - Callback for streaming chunks
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Complete AI response
 */
export const ragQuery = async (query, documentId = null, onChunk, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        document_id: documentId,
        top_k: options.top_k || 5,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6);

          if (text.startsWith('[ERROR]')) {
            throw new Error(text);
          }

          fullText += text;

          if (onChunk && text) {
            onChunk(text);
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('RAG Query Error:', error);
    throw error;
  }
};

/**
 * Query documents using RAG (non-streaming)
 * @param {string} query - User's question
 * @param {string} documentId - Optional document ID to filter by
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Complete AI response
 */
export const ragQuerySync = async (query, documentId = null, options = {}) => {
  try {
    const { data } = await api.post('/api/rag/query-sync', {
      query: query,
      document_id: documentId,
      top_k: options.top_k || 5,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
    });

    if (data.status === 'error') {
      throw new Error(data.message || 'RAG query failed');
    }

    return data.answer;
  } catch (error) {
    console.error('RAG Query Error:', error);
    throw error;
  }
};

