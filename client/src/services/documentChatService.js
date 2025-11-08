/**
 * Document Chat Service - AI chat with document context
 * Allows users to ask questions about their uploaded documents
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Chat with AI about a document
 * @param {string} message - User's question
 * @param {string} documentText - The extracted text from the document
 * @param {Object} metadata - Document metadata (title, author, pages, etc.)
 * @param {Function} onChunk - Callback for streaming chunks
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Complete AI response
 */
export const chatAboutDocument = async (
  message,
  documentText,
  metadata = {},
  onChunk,
  options = {}
) => {
  try {
    // Build context-aware prompt
    const contextPrompt = buildDocumentPrompt(message, documentText, metadata);

    const response = await fetch(`${API_BASE_URL}/api/ai/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: contextPrompt,
        user_name: options.user_name || 'User',
        is_greeting: options.is_greeting || false,
        temperature: options.temperature || 0.7,
        max_output_tokens: options.max_tokens || 2048,
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
    console.error('Document Chat Error:', error);
    throw error;
  }
};

/**
 * Build a context-aware prompt that includes document information
 */
function buildDocumentPrompt(userMessage, documentText, metadata) {
  // If document text is too long, use a summary or first portion
  const maxTextLength = 8000; // Characters to include
  const documentExcerpt = documentText.length > maxTextLength
    ? documentText.substring(0, maxTextLength) + '...[document continues]'
    : documentText;

  return `You are analyzing a document for the user. Here's the document information:

DOCUMENT METADATA:
- Filename: ${metadata.filename || 'Unknown'}
- Pages: ${metadata.totalPages || 'Unknown'}
- Words: ${metadata.wordCount || 'Unknown'}
- Title: ${metadata.title || 'Unknown'}
- Author: ${metadata.author || 'Unknown'}

DOCUMENT CONTENT:
${documentExcerpt}

---

User's question about this document: "${userMessage}"

Provide a helpful, accurate answer based ONLY on the document content above. If the information isn't in the document, say so. Be specific and reference relevant parts of the document.`;
}

/**
 * Generate quick summary of document
 */
export const getDocumentSummary = async (documentText, metadata) => {
  try {
    const prompt = `Summarize this document in 2-3 sentences:

Title: ${metadata.title || 'Unknown'}
Pages: ${metadata.totalPages || 'Unknown'}

Content:
${documentText.substring(0, 8000)}

Provide a clear, concise summary:`;

    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        temperature: 0.7,
        max_output_tokens: 500,
      }),
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return data.response;
  } catch (error) {
    console.error('Summary Error:', error);
    throw error;
  }
};

/**
 * Ask specific question about document sections
 */
export const askAboutSection = async (question, sectionText, sectionTitle) => {
  try {
    const prompt = `Based on the following section of a document:

Section: ${sectionTitle}
Content: ${sectionText.substring(0, 4000)}

Question: ${question}

Answer:`;

    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        temperature: 0.7,
        max_output_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return data.response;
  } catch (error) {
    console.error('Section Question Error:', error);
    throw error;
  }
};

