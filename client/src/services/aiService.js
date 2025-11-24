// AI Service - Handles communication with Gemini AI backend

import api, { API_BASE_URL } from './api';

/**
 * Generate text response from AI (non-streaming)
 * @param {string} prompt - The user's message/prompt
 * @param {object} options - Optional parameters (temperature, max_tokens)
 * @returns {Promise<string>} AI response text
 */
export const generateAIResponse = async (message, options = {}) => {
  try {
    const { data } = await api.post('/api/ai/generate', {
      message: message,
      user_name: options.user_name || "User",
      is_greeting: options.is_greeting || false,
      temperature: options.temperature || 0.7,
      max_output_tokens: options.max_tokens || 8192,
    });

    if (data.status === "error") {
      throw new Error(data.message || "AI generation failed");
    }

    return data.response;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

/**
 * Generate text response from AI with streaming (Server-Sent Events)
 * @param {string} prompt - The user's message/prompt
 * @param {function} onChunk - Callback for each text chunk received
 * @param {object} options - Optional parameters
 * @returns {Promise<string>} Complete AI response text
 */
export const generateAIResponseStream = async (
  message,
  onChunk,
  options = {}
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,  // Send as 'message' not 'prompt'
        user_name: options.user_name || "User",  // Send user context
        is_greeting: options.is_greeting || false,  // Is this the first message?
        temperature: options.temperature || 0.7,
        max_output_tokens: options.max_tokens || 8192,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });

      // Parse SSE format (data: text\n\n)
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const text = line.slice(6); // Remove 'data: ' prefix

          if (text.startsWith("[ERROR]")) {
            throw new Error(text);
          }

          fullText += text;

          // Call the callback with the new chunk
          if (onChunk && text) {
            onChunk(text);
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error("AI Streaming Error:", error);
    throw error;
  }
};

/**
 * Analyze content using AI
 * @param {string} content - Content to analyze
 * @param {string} analysisType - Type of analysis (general, sentiment, summary, keywords, insights)
 * @returns {Promise<string>} Analysis result
 */
export const analyzeContent = async (content, analysisType = "general") => {
  try {
    const { data } = await api.post('/api/ai/analyze', {
      content,
      type: analysisType,
    });

    if (data.status === "error") {
      throw new Error(data.message || "Analysis failed");
    }

    return data.analysis;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

/**
 * Test AI connection
 * @returns {Promise<object>} Test result
 */
export const testAIConnection = async () => {
  try {
    const { data } = await api.get('/api/ai/test');
    return data;
  } catch (error) {
    console.error("AI Test Error:", error);
    throw error;
  }
};
