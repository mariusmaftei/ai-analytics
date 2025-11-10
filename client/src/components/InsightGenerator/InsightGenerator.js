import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb, faSpinner, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { chatAboutDocument } from "../../services/documentChatService";
import styles from "./InsightGenerator.module.css";

// Icon mapping for different insight types
const getInsightIcon = (text) => {
  const lowerText = text.toLowerCase();
  
  // Category-specific icons
  if (lowerText.includes('document overview') || lowerText.includes('overview')) {
    return '📄';
  } else if (lowerText.includes('sku insight') || lowerText.includes('sku')) {
    return '🏷️';
  } else if (lowerText.includes('product insight') || lowerText.includes('product')) {
    return '📦';
  } else if (lowerText.includes('table insight') || lowerText.includes('table')) {
    return '🔁';
  } else if (lowerText.includes('data quality') || lowerText.includes('quality')) {
    return '✅';
  }
  
  // General pattern matching
  if (lowerText.includes('size') || lowerText.includes('dimension') || lowerText.includes('mm') || lowerText.includes('inch')) {
    return '📏';
  } else if (lowerText.includes('type') || lowerText.includes('category') || lowerText.includes('kind')) {
    return '⚙️';
  } else if (lowerText.includes('count')) {
    return '🔁';
  } else if (lowerText.includes('row') || lowerText.includes('record') || lowerText.includes('item')) {
    return '🧮';
  } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('$')) {
    return '💰';
  } else if (lowerText.includes('manufacturer') || lowerText.includes('brand') || lowerText.includes('maker')) {
    return '🏭';
  } else if (lowerText.includes('percentage') || lowerText.includes('%') || lowerText.includes('percent')) {
    return '📊';
  } else if (lowerText.includes('average') || lowerText.includes('mean') || lowerText.includes('avg')) {
    return '📈';
  } else if (lowerText.includes('total') || lowerText.includes('sum')) {
    return '🔢';
  }
  return '💡';
};

const InsightGenerator = ({ fileData, analysisData, tables = [] }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [structuredInsights, setStructuredInsights] = useState([]);
  const [insightMetrics, setInsightMetrics] = useState({});
  const [documentDescription, setDocumentDescription] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState(null);

  // Extract document description/title from text
  const extractDocumentDescription = (text) => {
    if (!text) return null;
    
    // Remove common AI response preamble
    const cleanedText = text
      .replace(/^(okay|ok|alright|well|so|now|here|let me|i've|i have|i'll|i will)[^.!?]*[.!?]\s*/i, '')
      .replace(/^(i've analyzed|i have analyzed|here are|here's|this is|these are)[^.!?]*[.!?]\s*/i, '')
      .replace(/formatted as requested[^.!?]*[.!?]\s*/i, '')
      .replace(/and here are the insights[^.!?]*[.!?]\s*/i, '')
      .replace(/:\s*/g, '. ')
      .trim();
    
    // Look for patterns like "product catalog", "price list", "manual", etc.
    const descriptionPatterns = [
      /(?:this\s+document\s+is\s+(?:a\s+|an\s+)?)([^\.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^\.]{0,80})/i,
      /(?:this\s+is\s+(?:a\s+|an\s+)?)([^\.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^\.]{0,80})/i,
      /(?:a\s+|an\s+)([^\.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^\.]{0,80})/i,
      /([^\.]*(?:price\s+list|product\s+catalog|product\s+list)[^\.]{0,100})/i,
      /([^\.]*(?:focused\s+on|about|containing|including|for)[^\.]{0,100}(?:catalog|list|manual|report|guide|document|components|products|supplies|tools|equipment)[^\.]{0,50})/i,
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = cleanedText.match(pattern);
      if (match) {
        let description = match[1] || match[0];
        
        // Clean up the description
        description = description
          .replace(/^(this\s+document\s+is\s+(?:a\s+|an\s+)?|this\s+is\s+(?:a\s+|an\s+)?)/i, 'This document is a ')
          .replace(/^(a\s+|an\s+)/i, 'This document is a ')
          .replace(/^([a-z])/, (match) => match.toUpperCase()) // Capitalize first letter
          .trim();
        
        // Ensure it starts with "This document is" if it doesn't already
        if (!description.toLowerCase().startsWith('this document')) {
          // Check if it already starts with a capital letter and looks like a sentence
          if (description.match(/^[A-Z]/) && !description.match(/^(Price|Product|A|An)/)) {
            description = 'This document is a ' + description.toLowerCase();
          } else if (description.match(/^(Price|Product)/)) {
            description = 'This document is a ' + description.toLowerCase();
          }
        }
        
        // Clean up trailing punctuation and extra spaces
        description = description
          .replace(/\s+/g, ' ')
          .replace(/[.,;:]+$/, '')
          .trim();
        
        // Limit length
        if (description.length > 150) {
          // Try to cut at a natural break point
          const cutPoint = description.substring(0, 147).lastIndexOf(' ');
          if (cutPoint > 100) {
            description = description.substring(0, cutPoint) + '...';
          } else {
            description = description.substring(0, 147) + '...';
          }
        }
        
        if (description.length > 20) {
          return description;
        }
      }
    }
    
    // Fallback: try to extract first meaningful sentence after cleaning
    const sentences = cleanedText.split(/[.!?]\s+/);
    for (const sentence of sentences) {
      if (sentence.length > 30 && sentence.length < 200) {
        const lowerSentence = sentence.toLowerCase();
        if (lowerSentence.includes('catalog') || 
            lowerSentence.includes('list') || 
            lowerSentence.includes('manual') || 
            lowerSentence.includes('document') ||
            lowerSentence.includes('focused') ||
            lowerSentence.includes('about') ||
            lowerSentence.includes('product') ||
            lowerSentence.includes('price')) {
          let cleanSentence = sentence.trim();
          // Ensure it starts properly
          if (!cleanSentence.toLowerCase().startsWith('this document')) {
            if (cleanSentence.match(/^[a-z]/)) {
              cleanSentence = 'This document is a ' + cleanSentence.toLowerCase();
            } else if (!cleanSentence.match(/^This/)) {
              cleanSentence = 'This document is a ' + cleanSentence.toLowerCase();
            }
          }
          return cleanSentence;
        }
      }
    }
    
    return null;
  };

  // Extract key metrics from text
  const extractMetrics = (text) => {
    const metrics = {};
    
    // Extract author
    const authorMatch = text.match(/(?:author|by|created by|written by)[:\s]+([^\n,\.]{3,50})/i);
    if (authorMatch) {
      metrics.author = authorMatch[1].trim();
    }
    
    // Extract pages
    const pagesMatch = text.match(/(\d+)\s*(?:pages?|page)/i);
    if (pagesMatch) {
      metrics.pages = pagesMatch[1];
    }
    
    // Extract words
    const wordsMatch = text.match(/(\d+(?:,\d+)?)\s*(?:words?|word)/i);
    if (wordsMatch) {
      metrics.words = wordsMatch[1].replace(/,/g, '');
    }
    
    // Extract SKUs
    const skuMatch = text.match(/(\d+(?:,\d+)?)\s*(?:skus?|sku)/i);
    if (skuMatch) {
      metrics.skus = skuMatch[1].replace(/,/g, '');
    }
    
    return metrics;
  };

  // Parse insights into structured format with categories
  const parseInsights = (text) => {
    if (!text) return { categories: [], metrics: {}, description: null };
    
    const metrics = extractMetrics(text);
    const description = extractDocumentDescription(text);
    const categories = [];
    const lines = text.split('\n');
    
    let currentCategory = null;
    let currentSummary = null;
    let currentDetails = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for category headers (e.g., **Document Overview:** or **SKU Insights:**)
      const categoryMatch = trimmed.match(/^\*\*([^*]+):\*\*/);
      if (categoryMatch) {
        // Save previous category if exists
        if (currentCategory) {
          categories.push({
            category: currentCategory,
            summary: currentSummary || '',
            details: currentDetails,
            icon: getInsightIcon(currentCategory),
          });
        }
        
        // Start new category
        currentCategory = categoryMatch[1].trim();
        currentSummary = null;
        currentDetails = [];
      }
      // Check for summary line
      else if (trimmed.match(/^Summary:\s*/i)) {
        currentSummary = trimmed.replace(/^Summary:\s*/i, '').trim();
      }
      // Check for details section
      else if (trimmed.match(/^Details?:/i)) {
        // Details header, continue to next lines
      }
      // Check for bullet points or dash items (details)
      else if (trimmed.match(/^[-•*]\s*(.+)$/)) {
        const detail = trimmed.replace(/^[-•*]\s*/, '').trim();
        if (detail && detail.length < 200) { // Limit detail length
          currentDetails.push(detail);
        }
      }
      // Check for numbered items
      else if (trimmed.match(/^\d+[\.\)]\s*(.+)$/)) {
        const detail = trimmed.replace(/^\d+[\.\)]\s*/, '').trim();
        if (detail && detail.length < 200) {
          currentDetails.push(detail);
        }
      }
      // Check for simple label: value format
      else if (trimmed.match(/^([^:]+):\s*(.+)$/)) {
        const match = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const label = match[1].trim();
          const value = match[2].trim();
          
          // If we're in a category, add as detail
          if (currentCategory) {
            if (value.length < 200) {
              currentDetails.push(`${label}: ${value}`);
            }
          } else {
            // Standalone insight
            categories.push({
              category: label,
              summary: value.length > 150 ? value.substring(0, 150) + '...' : value,
              details: [],
              icon: getInsightIcon(label + ' ' + value),
            });
          }
        }
      }
      // If we have a category and no summary yet, and line looks like a summary
      else if (currentCategory && !currentSummary && trimmed.length > 20 && trimmed.length < 250) {
        // Might be a summary without "Summary:" prefix
        if (!trimmed.startsWith('**') && !trimmed.startsWith('-') && !trimmed.match(/^\d+[\.\)]/)) {
          // Truncate long summaries
          currentSummary = trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
        }
      }
    });
    
    // Save last category
    if (currentCategory) {
      categories.push({
        category: currentCategory,
        summary: currentSummary || '',
        details: currentDetails.slice(0, 10), // Limit to 10 details per category
        icon: getInsightIcon(currentCategory),
      });
    }
    
    // If no categories found, try to parse as simple format
    if (categories.length === 0) {
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          const colonMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
          if (colonMatch) {
            const value = colonMatch[2].trim();
            categories.push({
              category: colonMatch[1].trim(),
              summary: value.length > 150 ? value.substring(0, 150) + '...' : value,
              details: [],
              icon: getInsightIcon(trimmed),
            });
          }
        }
      });
    }
    
    return { categories, metrics, description };
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    setError(null);
    setIsExpanded(true);

    try {
      // Build comprehensive prompt for insight generation
      let documentContext = '';
      
      // Add text content if available
      if (analysisData.text) {
        documentContext += `Document Text:\n${analysisData.text.substring(0, 10000)}\n\n`;
      }
      
      // Add table data if available
      if (tables && tables.length > 0) {
        documentContext += `Tables Found:\n`;
        tables.forEach((table, idx) => {
          if (table.data && table.data.length > 0) {
            // Include headers and first few rows
            const headers = table.data[0] || [];
            const sampleRows = table.data.slice(1, 6); // First 5 data rows
            
            documentContext += `\nTable ${idx + 1} (Page ${table.page || 'N/A'}):\n`;
            documentContext += `Headers: ${headers.join(', ')}\n`;
            documentContext += `Sample Data:\n`;
            sampleRows.forEach((row, rowIdx) => {
              const rowData = row.map((cell, colIdx) => {
                const header = headers[colIdx] || `Col${colIdx + 1}`;
                return `${header}: ${cell || ''}`;
              }).join(', ');
              documentContext += `Row ${rowIdx + 1}: ${rowData}\n`;
            });
            documentContext += `\nTotal rows in this table: ${table.rows || table.data.length}\n`;
          }
        });
      }

      const insightPrompt = `Examine this document and identify its type (e.g., catalog, technical manual, report, safety guide, etc.).

Start your response with a single, clean sentence describing what this document is. Format it EXACTLY as: "This document is a [type] for [purpose/topic]." or "This document is a [type] focused on [topic]." Keep it concise and clear (max 100 characters).

Then extract and summarize insights in **five key categories**:

1. **Document Overview:** General purpose, word count, page insights, document type.

2. **SKU Insights:** Detect patterns, structure, and naming conventions in SKUs. Count total SKUs, identify patterns.

3. **Product Insights:** Identify major product categories, materials, measurement ranges, sizes, types, manufacturers.

4. **Table Insights:** Describe the number of tables, average row count, column consistency, data structure.

5. **Data Quality:** Report missing data, duplicates, irregular formatting, data completeness.

For each category, provide:
- A **short summary** (1–2 sentences)
- **Details** section with specific data points, lists, or patterns

Format your response as follows:

**Document Overview:**
Summary: [1-2 sentence summary]
Details:
- [Specific data point 1]
- [Specific data point 2]

**SKU Insights:**
Summary: [1-2 sentence summary]
Details:
- [Specific insight 1]
- [Specific insight 2]

**Product Insights:**
Summary: [1-2 sentence summary]
Details:
- [Specific insight 1]
- [Specific insight 2]

**Table Insights:**
Summary: [1-2 sentence summary]
Details:
- [Specific insight 1]
- [Specific insight 2]

**Data Quality:**
Summary: [1-2 sentence summary]
Details:
- [Specific insight 1]
- [Specific insight 2]

Be specific with numbers, percentages, ranges, and counts. Extract quantifiable insights from the data.

${documentContext}

Generate structured insights:`;

      let fullResponse = '';
      
      await chatAboutDocument(
        insightPrompt,
        analysisData.text || '',
        {
          filename: fileData.fileName,
          totalPages: analysisData.metadata?.totalPages,
          wordCount: analysisData.metadata?.wordCount,
          title: analysisData.metadata?.title,
          author: analysisData.metadata?.author,
        },
        (chunk) => {
          fullResponse += chunk;
          setInsights(fullResponse);
          // Parse insights in real-time as they come in
          const parsed = parseInsights(fullResponse);
          setStructuredInsights(parsed.categories);
          setInsightMetrics(parsed.metrics);
          setDocumentDescription(parsed.description);
        },
        {
          user_name: 'User',
          temperature: 0.7,
          max_tokens: 1024,
        }
      );

      setInsights(fullResponse);
      // Final parse of complete response
      const finalParsed = parseInsights(fullResponse);
      setStructuredInsights(finalParsed.categories);
      setInsightMetrics(finalParsed.metrics);
      setDocumentDescription(finalParsed.description);
    } catch (error) {
      console.error('Insight generation error:', error);
      setError('Failed to generate insights. Please try again.');
      setInsights(null);
      setStructuredInsights([]);
      setInsightMetrics({});
      setDocumentDescription(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faLightbulb} className={styles.icon} />
          <h3>Insight Generator</h3>
        </div>
        {insights && (
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
          </button>
        )}
      </div>

      {!insights && !isGenerating && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            Generate intelligent insights and summaries from your document data, including statistics, patterns, and key findings.
          </p>
          <button
            className={styles.generateButton}
            onClick={generateInsights}
            disabled={isGenerating}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>Generate Insights</span>
          </button>
        </div>
      )}

      {isGenerating && (
        <div className={styles.loadingSection}>
          <FontAwesomeIcon icon={faSpinner} spin className={styles.spinner} />
          <p>Analyzing document and generating insights...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorSection}>
          <p>{error}</p>
          <button
            className={styles.retryButton}
            onClick={generateInsights}
          >
            Try Again
          </button>
        </div>
      )}

      {insights && isExpanded && (
        <div className={styles.insightsContent}>
          {/* Document Overview Section - Document Description and Key Metrics */}
          {(documentDescription || insightMetrics.pages || insightMetrics.words || insightMetrics.skus || analysisData.metadata) && (
            <div className={styles.aboutSection}>
              <h4 className={styles.aboutTitle}>Document Overview</h4>
              
              {/* Document Description/Title */}
              {documentDescription && (
                <div className={styles.documentDescription}>
                  {documentDescription}
                </div>
              )}
              
              <div className={styles.metricsGrid}>
                {(insightMetrics.author || analysisData.metadata?.author) && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Author</span>
                    <span className={`${styles.metricValue} ${styles.authorValue}`}>{insightMetrics.author || analysisData.metadata.author}</span>
                  </div>
                )}
                {insightMetrics.pages && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Pages</span>
                    <span className={styles.metricValue}>{insightMetrics.pages}</span>
                  </div>
                )}
                {insightMetrics.words && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Words</span>
                    <span className={styles.metricValue}>{parseInt(insightMetrics.words).toLocaleString()}</span>
                  </div>
                )}
                {tables && tables.length > 0 && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Tables</span>
                    <span className={styles.metricValue}>{tables.length}</span>
                  </div>
                )}
                {analysisData.metadata?.totalPages && !insightMetrics.pages && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Pages</span>
                    <span className={styles.metricValue}>{analysisData.metadata.totalPages}</span>
                  </div>
                )}
                {analysisData.metadata?.wordCount && !insightMetrics.words && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Words</span>
                    <span className={styles.metricValue}>{analysisData.metadata.wordCount.toLocaleString()}</span>
                  </div>
                )}
                {insightMetrics.skus && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>SKUs</span>
                    <span className={styles.metricValue}>{parseInt(insightMetrics.skus).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {structuredInsights.length > 0 ? (
            <div className={styles.categoriesContainer}>
              {structuredInsights.map((category, index) => (
                <div key={index} className={styles.categoryCard}>
                  <div className={styles.categoryHeader}>
                    <div className={styles.categoryIcon}>{category.icon}</div>
                    <h4 className={styles.categoryTitle}>{category.category}</h4>
                  </div>
                  
                  {category.summary && (
                    <div className={styles.categorySummary}>
                      {category.summary.split(/[.!?]\s+/).filter(s => s.trim().length > 0).map((sentence, idx, arr) => (
                        <div key={idx} className={styles.summaryBullet}>
                          <span className={styles.bulletPoint}>•</span>
                          <span>{sentence.trim()}{idx < arr.length - 1 ? '.' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {category.details && category.details.length > 0 && (
                    <div className={styles.categoryDetails}>
                      <ul className={styles.detailsList}>
                        {category.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className={styles.detailItem}>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.insightsText}>
              {insights.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < insights.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}
          <button
            className={styles.regenerateButton}
            onClick={generateInsights}
            disabled={isGenerating}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>Regenerate Insights</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InsightGenerator;

