/**
 * PDF Analysis Service - Real backend integration
 * Replaces dummy data with actual PDF extraction and AI analysis
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Upload and analyze PDF file with real backend
 * @param {File} file - The PDF file to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
export const analyzePDFFile = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add analysis type if specified
    if (options.includeAI) {
      formData.append('analysis_type', options.analysisType || 'summary');
    }
    
    // Add save to DB flag if specified
    if (options.saveToDb) {
      formData.append('save_to_db', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'PDF analysis failed');
    }

    // Transform backend response to match frontend expectations
    return transformPDFResponse(data);

  } catch (error) {
    console.error('PDF Analysis Error:', error);
    throw error;
  }
};

/**
 * Transform backend response to match AnalysisPage expectations
 */
function transformPDFResponse(backendData) {
  return {
    fileType: 'PDF',
    success: true,
    
    // Metadata
    metadata: {
      totalPages: backendData.page_count || 0,
      wordCount: backendData.word_count || 0,
      characterCount: backendData.character_count || 0,
      author: backendData.metadata?.author || 'Unknown',
      title: backendData.metadata?.title || backendData.filename,
      createdDate: backendData.metadata?.creation_date || '',
    },
    
    // Extracted content
    text: backendData.text || '',
    
    // AI Analysis
    insights: {
      summary: backendData.ai_analysis?.result || 
               `This PDF contains ${backendData.page_count} pages with ${backendData.word_count} words.`,
      patterns: generatePatterns(backendData),
    },
    
    // Additional data
    extractedAt: backendData.extracted_at,
    filename: backendData.filename,
    dbId: backendData.db_id || null,
    
    // Note: Chapters would require additional processing
    // For now, we'll simulate basic chapter detection
    hasChapters: false,
    chapters: [],
  };
}

/**
 * Generate insight patterns from PDF data
 */
function generatePatterns(data) {
  const patterns = [];
  
  if (data.page_count) {
    patterns.push(`Document contains ${data.page_count} pages`);
  }
  
  if (data.word_count) {
    const readingTime = Math.ceil(data.word_count / 200);
    patterns.push(`Estimated reading time: ${readingTime} minutes`);
  }
  
  if (data.metadata?.author && data.metadata.author !== 'Unknown') {
    patterns.push(`Author: ${data.metadata.author}`);
  }
  
  if (data.metadata?.title && data.metadata.title !== 'Unknown') {
    patterns.push(`Title: ${data.metadata.title}`);
  }
  
  return patterns;
}

/**
 * Get PDF metadata only (faster, no full extraction)
 */
export const getPDFMetadata = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/pdf/metadata`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return data.metadata;

  } catch (error) {
    console.error('PDF Metadata Error:', error);
    throw error;
  }
};

/**
 * Upload PDF with AI analysis directly
 */
export const analyzePDFWithAI = async (file, analysisType = 'summary') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('analysis_type', analysisType);

    const response = await fetch(`${API_BASE_URL}/api/pdf/analyze`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return {
      success: true,
      analysis: data.analysis,
      analysisType: data.analysis_type,
      pageCount: data.page_count,
      wordCount: data.word_count,
      filename: data.filename,
    };

  } catch (error) {
    console.error('PDF AI Analysis Error:', error);
    throw error;
  }
};

