import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faChevronDown,
  faChevronUp,
  faUsers,
  faBuilding,
  faMapMarkerAlt,
  faTags,
  faTable,
  faImage,
  faSmile,
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PDFContentAnalysis.module.css";

const PDFContentAnalysis = ({ data, rawText, analysisData }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedTables, setExpandedTables] = useState({});

  const extractSectionBreakdown = () => {
    if (!rawText) {
      return [];
    }

    // Multiple patterns to try - be very flexible
    const patterns = [
      /SECTION\s+A[:\s]+SECTION[_\s]*BREAKDOWN\s*\n([\s\S]*?)(?=\n\s*SECTION\s+[BCDE]:|$)/i,
      /SECTION\s+A[:\s]+SECTION[_\s]*BREAKDOWN\s*\n([\s\S]*?)(?=\n\s*Section\s+[BCDE]:|$)/i,
      /Section\s+A[:\s]+Section[_\s]*Breakdown\s*\n([\s\S]*?)(?=\n\s*Section\s+[BCDE]:|$)/i,
      /SECTION\s+A[:\s]*BREAKDOWN\s*\n([\s\S]*?)(?=\n\s*SECTION\s+[BCDE]:|$)/i,
      // Try without "SECTION_BREAKDOWN" label
      /SECTION\s+A[:\s]+\n([\s\S]*?)(?=\n\s*SECTION\s+[BCDE]:|$)/i,
    ];

    let breakdownText = null;
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        breakdownText = match[1].trim();
        // Remove any section markers that might be inside
        breakdownText = breakdownText.replace(/^SECTION\s+[A-Z]:/gmi, '');
        break;
      }
    }
    
    // Fallback: if no section header found, try to find content that looks like section breakdown
    if (!breakdownText) {
      // Look for patterns like "Section Name: Description" anywhere in the text
      const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
      const potentialSections = [];
      for (const line of lines) {
        // Skip section headers
        if (line.match(/^SECTION\s+[A-Z]:/i)) continue;
        // Look for "Name: Description" pattern
        const match = line.match(/^([A-Z][^:]{5,50}):\s*(.{20,})$/);
        if (match) {
          potentialSections.push({ name: match[1].trim(), description: match[2].trim() });
        }
      }
      if (potentialSections.length >= 2) {
        console.log('[PDFContentAnalysis] Using fallback section breakdown extraction');
        return potentialSections;
      }
    }

    if (breakdownText) {
      const sections = [];
      const lines = breakdownText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
      
      for (const line of lines) {
        // Skip lines that are clearly section headers
        if (line.match(/^SECTION [A-Z]:/i) || line.match(/^Section [A-Z]:/i)) {
          continue;
        }
        
        // Look for pattern: "Section Name: Description"
        const sectionMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (sectionMatch) {
          const sectionName = sectionMatch[1].trim();
          const description = sectionMatch[2].trim();
          if (sectionName.length > 0 && description.length > 10) {
            sections.push({ name: sectionName, description });
          }
        } else if (line.length > 30 && !line.toLowerCase().includes('section') && !line.match(/^\[/)) {
          // Fallback: treat substantial line as section
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0 && colonIndex < line.length - 10) {
            sections.push({ 
              name: line.substring(0, colonIndex).trim(), 
              description: line.substring(colonIndex + 1).trim() 
            });
          }
        }
      }
      
      if (sections.length > 0) {
        console.log('[PDFContentAnalysis] Extracted section breakdown:', sections);
        return sections;
      }
    }

    // Fallback: try to extract from parsed data
    if (data?.sections) {
      const breakdownSection = data.sections.find(s => 
        s.name?.toLowerCase().includes('breakdown') || 
        s.name?.toLowerCase().includes('section')
      );
      
      if (breakdownSection?.content) {
        const sections = [];
        for (const item of breakdownSection.content) {
          if (item.type === "keyValue" && item.key && item.value) {
            sections.push({ name: item.key, description: item.value });
          } else if (item.type === "text" && item.text) {
            const text = item.text.trim();
            if (text.includes(':')) {
              const [name, ...descParts] = text.split(':');
              if (name.trim().length > 0 && descParts.length > 0) {
                sections.push({ name: name.trim(), description: descParts.join(':').trim() });
              }
            }
          }
        }
        if (sections.length > 0) {
          return sections;
        }
      }
    }

    console.log('[PDFContentAnalysis] No section breakdown found in rawText');
    return [];
  };

  const extractEntities = () => {
    const entities = {
      people: [],
      organizations: [],
      places: [],
      topics: [],
    };

    if (!rawText) {
      return entities;
    }

    // Multiple patterns to try
    const patterns = [
      /SECTION B:\s*ENTITIES_AND_CONCEPTS\s*\n([\s\S]*?)(?=\n\s*SECTION [ACDE]:|$)/i,
      /SECTION B:\s*ENTITIES[_\s]*AND[_\s]*CONCEPTS\s*\n([\s\S]*?)(?=\n\s*SECTION [ACDE]:|$)/i,
      /Section B:\s*Entities[_\s]*and[_\s]*Concepts\s*\n([\s\S]*?)(?=\n\s*Section [ACDE]:|$)/i,
      /SECTION[_\s]*B[:\s]*ENTITIES\s*\n([\s\S]*?)(?=\n\s*SECTION[_\s]*[ACDE]:|$)/i,
    ];

    let entitiesText = null;
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        entitiesText = match[1].trim();
        break;
      }
    }

    // Helper function to extract entities from text
    const extractEntityList = (text, categoryLabel) => {
      const results = [];
      
      // Try to find the category section - handle cases like "People (None" or "People: None"
      // Stop at next category (even on same line) or section marker
      const categoryPatterns = [
        new RegExp(`${categoryLabel}\\s*[:(]\\s*([\\s\\S]*?)(?=\\s*(?:People|Organizations?|Places?|Topics?|SECTION\\s+[A-Z]|Section\\s+[A-Z]):|$)`, 'i'),
        new RegExp(`${categoryLabel}\\s*:\\s*([\\s\\S]*?)(?=\\s*(?:People|Organizations?|Places?|Topics?|SECTION\\s+[A-Z]|Section\\s+[A-Z]):|$)`, 'i'),
      ];
      
      let categoryText = null;
      for (const pattern of categoryPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          categoryText = match[1].trim();
          break;
        }
      }
      
      if (!categoryText) return results;
      
      // Remove any section markers that might be in the text
      categoryText = categoryText.replace(/^SECTION\s+[A-Z]:/gmi, '').trim();
      
      // Stop at the first occurrence of a category label or section marker (even if on same line)
      const stopPatterns = [
        /\s*(?:People|Organizations?|Places?|Topics?)\s*:/i,
        /\s*SECTION\s+[A-Z]\s*:/i,
        /\s*Section\s+[A-Z]\s*:/i,
      ];
      
      for (const stopPattern of stopPatterns) {
        const stopMatch = categoryText.match(stopPattern);
        if (stopMatch) {
          categoryText = categoryText.substring(0, stopMatch.index).trim();
          break;
        }
      }
      
      // Handle case where "None" appears at the start (possibly in parentheses)
      if (categoryText.match(/^\(?none\)?/i)) {
        return results; // Return empty array if it's just "None"
      }
      
      // Remove "None" if it appears at the start (with or without parentheses)
      categoryText = categoryText.replace(/^\(?none\)?\s*/i, '').trim();
      
      // If after removing "None" we have nothing or it starts with another category, return empty
      if (!categoryText || categoryText.match(/^(People|Organizations?|Places?|Topics?):/i)) {
        return results;
      }
      
      // Split by commas, semicolons, or newlines
      const items = categoryText
        .split(/[,;\n]/)
        .map(item => item.trim())
        .filter(item => {
          // Filter out empty, "None", section markers, and invalid items
          if (!item || item.length === 0) return false;
          const lower = item.toLowerCase();
          if (lower.match(/^(none|n\/a|not applicable|n\.a\.)$/)) return false;
          // Filter out items that contain section markers anywhere
          if (item.match(/SECTION\s+[A-Z]:/i)) return false;
          if (item.match(/Section\s+[A-Z]:/i)) return false;
          // Filter out items that are just category labels
          if (lower.match(/^(people|organizations?|places?|topics?):?$/)) return false;
          // Filter out items that contain category labels (like "Places: Mac OS")
          if (item.match(/^(People|Organizations?|Places?|Topics?)\s*:/i)) return false;
          // Filter out items that look like they're part of another category
          if (item.match(/^\(?none\)?/i)) return false;
          // Filter out items that contain sentiment analysis content
          if (item.match(/Overall Tone|Sentiment:|Key Observations/i)) return false;
          return true;
        })
        .map(item => {
          // Clean up the item - remove any category labels that might be at the start
          item = item.replace(/^(People|Organizations?|Places?|Topics?)\s*:\s*/i, '').trim();
          // Remove section markers
          item = item.replace(/SECTION\s+[A-Z]:/gi, '').trim();
          // Clean up quotes and brackets
          item = item.replace(/^["'[\]()]|["'[\]()]$/g, '').trim();
          // Remove trailing "None" if it got attached
          item = item.replace(/\s*\(?none\)?$/i, '').trim();
          // Remove any sentiment analysis content that might have leaked in
          item = item.replace(/\s*Overall Tone.*$/i, '').trim();
          item = item.replace(/\s*Sentiment:.*$/i, '').trim();
          item = item.replace(/\s*Key Observations.*$/i, '').trim();
          return item;
        })
        .filter(item => {
          // Final filter - check again after cleaning
          if (item.length === 0) return false;
          const lower = item.toLowerCase();
          if (lower.match(/^(none|n\/a|not applicable)$/)) return false;
          if (item.match(/SECTION\s+[A-Z]:/i)) return false;
          if (item.match(/^(People|Organizations?|Places?|Topics?)\s*:/i)) return false;
          if (item.match(/Overall Tone|Sentiment:|Key Observations/i)) return false;
          return true;
        });
      
      return items;
    };

    if (entitiesText) {
      // Extract People
      entities.people = extractEntityList(entitiesText, 'People');
      
      // Extract Organizations
      entities.organizations = extractEntityList(entitiesText, 'Organizations?');
      
      // Extract Places
      entities.places = extractEntityList(entitiesText, 'Places?');
      
      // Extract Topics
      entities.topics = extractEntityList(entitiesText, 'Topics?');
    } else {
      // Fallback: try to extract entities from the entire rawText using the helper function
      const extractEntityListFallback = (text, categoryLabel) => {
        const results = [];
        const categoryPatterns = [
          new RegExp(`${categoryLabel}\\s*[:(]\\s*([\\s\\S]*?)(?=\\s*(?:People|Organizations?|Places?|Topics?|SECTION\\s+[A-Z]|Section\\s+[A-Z]):|$)`, 'i'),
          new RegExp(`${categoryLabel}\\s*:\\s*([\\s\\S]*?)(?=\\s*(?:People|Organizations?|Places?|Topics?|SECTION\\s+[A-Z]|Section\\s+[A-Z]):|$)`, 'i'),
        ];
        
        let categoryText = null;
        for (const pattern of categoryPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            categoryText = match[1].trim();
            break;
          }
        }
        
        if (!categoryText) return results;
        
        categoryText = categoryText.replace(/^SECTION\s+[A-Z]:/gmi, '').trim();
        
        // Stop at the first occurrence of a category label or section marker
        const stopPatterns = [
          /\s*(?:People|Organizations?|Places?|Topics?)\s*:/i,
          /\s*SECTION\s+[A-Z]\s*:/i,
          /\s*Section\s+[A-Z]\s*:/i,
        ];
        
        for (const stopPattern of stopPatterns) {
          const stopMatch = categoryText.match(stopPattern);
          if (stopMatch) {
            categoryText = categoryText.substring(0, stopMatch.index).trim();
            break;
          }
        }
        
        // Handle case where "None" appears at the start
        if (categoryText.match(/^\(?none\)?/i)) {
          return results;
        }
        
        categoryText = categoryText.replace(/^\(?none\)?\s*/i, '').trim();
        
        if (!categoryText || categoryText.match(/^(People|Organizations?|Places?|Topics?):/i)) {
          return results;
        }
        
        const items = categoryText
          .split(/[,;\n]/)
          .map(item => item.trim())
          .filter(item => {
            if (!item || item.length === 0) return false;
            const lower = item.toLowerCase();
            if (lower.match(/^(none|n\/a|not applicable|n\.a\.)$/)) return false;
            if (item.match(/SECTION\s+[A-Z]:/i)) return false;
            if (item.match(/Section\s+[A-Z]:/i)) return false;
            if (lower.match(/^(people|organizations?|places?|topics?):?$/)) return false;
            if (item.match(/^(People|Organizations?|Places?|Topics?)\s*:/i)) return false;
            if (item.match(/^\(?none\)?/i)) return false;
            if (item.match(/Overall Tone|Sentiment:|Key Observations/i)) return false;
            return true;
          })
          .map(item => {
            item = item.replace(/^(People|Organizations?|Places?|Topics?)\s*:\s*/i, '').trim();
            item = item.replace(/SECTION\s+[A-Z]:/gi, '').trim();
            item = item.replace(/^["'[\]()]|["'[\]()]$/g, '').trim();
            item = item.replace(/\s*\(?none\)?$/i, '').trim();
            item = item.replace(/\s*Overall Tone.*$/i, '').trim();
            item = item.replace(/\s*Sentiment:.*$/i, '').trim();
            item = item.replace(/\s*Key Observations.*$/i, '').trim();
            return item;
          })
          .filter(item => {
            if (item.length === 0) return false;
            const lower = item.toLowerCase();
            if (lower.match(/^(none|n\/a|not applicable)$/)) return false;
            if (item.match(/SECTION\s+[A-Z]:/i)) return false;
            if (item.match(/^(People|Organizations?|Places?|Topics?)\s*:/i)) return false;
            if (item.match(/Overall Tone|Sentiment:|Key Observations/i)) return false;
            return true;
          });
        
        return items;
      };
      
      entities.people = extractEntityListFallback(rawText, 'People');
      entities.organizations = extractEntityListFallback(rawText, 'Organizations?');
      entities.places = extractEntityListFallback(rawText, 'Places?');
      entities.topics = extractEntityListFallback(rawText, 'Topics?');
    }

    const hasEntities = entities.people.length > 0 || entities.organizations.length > 0 || 
                       entities.places.length > 0 || entities.topics.length > 0;
    if (hasEntities) {
      console.log('[PDFContentAnalysis] Extracted entities:', entities);
    } else {
      console.log('[PDFContentAnalysis] No entities found in rawText');
    }

    return entities;
  };

  const extractSentiment = () => {
    if (!rawText) {
      return null;
    }

    // Multiple patterns to try - check both SECTION C and SECTION E
    const patterns = [
      /SECTION E:\s*SENTIMENT[_\s]*ANALYSIS\s*\n([\s\S]*?)(?=\n\s*SECTION [ABCD]:|$)/i,
      /SECTION C:\s*SENTIMENT[_\s]*ANALYSIS\s*\n([\s\S]*?)(?=\n\s*SECTION [ABDE]:|$)/i,
      /SECTION[_\s]*E[:\s]*SENTIMENT\s*\n([\s\S]*?)(?=\n\s*SECTION[_\s]*[ABCD]:|$)/i,
      /SECTION[_\s]*C[:\s]*SENTIMENT\s*\n([\s\S]*?)(?=\n\s*SECTION[_\s]*[ABDE]:|$)/i,
      /Section E:\s*Sentiment[_\s]*Analysis\s*\n([\s\S]*?)(?=\n\s*Section [ABCD]:|$)/i,
      /Section C:\s*Sentiment[_\s]*Analysis\s*\n([\s\S]*?)(?=\n\s*Section [ABDE]:|$)/i,
    ];

    let sentimentText = null;
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        sentimentText = match[1].trim();
        break;
      }
    }

    if (sentimentText) {
      const tonePatterns = [
        /Overall Tone:\s*([^\n]+)/i,
        /Tone:\s*([^\n]+)/i,
        /Overall[_\s]*Tone[:\s]+([^\n]+)/i,
      ];
      
      const sentimentPatterns = [
        /Sentiment:\s*([^\n]+)/i,
        /Overall Sentiment:\s*([^\n]+)/i,
      ];
      
      const observationsPatterns = [
        /Key Observations:\s*([^\n]+(?:\n(?!\w+:|SECTION|Section)[^\n]+)*)/i,
        /Observations:\s*([^\n]+(?:\n(?!\w+:|SECTION|Section)[^\n]+)*)/i,
        /Key[_\s]*Observations[:\s]+([^\n]+(?:\n(?!\w+:|SECTION|Section)[^\n]+)*)/i,
      ];

      let tone = null;
      for (const pattern of tonePatterns) {
        const match = sentimentText.match(pattern);
        if (match && match[1]) {
          tone = match[1].trim();
          break;
        }
      }

      let sentiment = null;
      for (const pattern of sentimentPatterns) {
        const match = sentimentText.match(pattern);
        if (match && match[1]) {
          sentiment = match[1].trim();
          break;
        }
      }

      let observations = null;
      for (const pattern of observationsPatterns) {
        const match = sentimentText.match(pattern);
        if (match && match[1]) {
          observations = match[1].trim();
          break;
        }
      }

      if (tone || sentiment || observations) {
        const result = { tone, sentiment, observations };
        console.log('[PDFContentAnalysis] Extracted sentiment:', result);
        return result;
      }
    }

    console.log('[PDFContentAnalysis] No sentiment found in rawText');
    return null;
  };


  // Check if we're receiving overview data instead of content data
  const isOverviewData = rawText && (
    rawText.includes('DOCUMENT_CATEGORY:') || 
    rawText.includes('SHORT_DESCRIPTION:') ||
    rawText.includes('**Document Overview:**')
  );

  if (isOverviewData && rawText) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faSearch} style={{ fontSize: '2rem', color: '#f97316', marginBottom: '1rem' }} />
          <p style={{ color: '#f97316', fontWeight: 600, marginBottom: '1rem' }}>
            Content Analysis Data Not Found
          </p>
          <p style={{ marginBottom: '1rem' }}>
            It looks like overview data was received instead of content analysis data.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>
            Please make sure you selected "Content Analysis" and clicked "Generate Insights".
            If you selected "Analyze All", wait for the content analysis to complete.
          </p>
        </div>
      </div>
    );
  }

  const sectionBreakdown = extractSectionBreakdown();
  const entities = extractEntities();
  const sentiment = extractSentiment();
  const tables = analysisData?.tables || [];
  const hasImages = analysisData?.metadata?.imageCount > 0;

  const toggleSection = (index) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleTable = (index) => {
    setExpandedTables((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const hasContent = sectionBreakdown.length > 0 || 
                     entities.people.length > 0 || 
                     entities.organizations.length > 0 || 
                     entities.places.length > 0 || 
                     entities.topics.length > 0 ||
                     tables.length > 0 ||
                     sentiment;

  if (!hasContent && !rawText) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No content analysis available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faSearch} />
        </div>
        <div>
          <h2 className={styles.title}>Content Analysis</h2>
          <p className={styles.subtitle}>Detailed content examination</p>
        </div>
      </div>


      {/* Section A: Section-by-Section Breakdown */}
      {sectionBreakdown.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Section-by-Section Breakdown</h3>
          <div className={styles.accordion}>
            {sectionBreakdown.map((section, idx) => {
              const isExpanded = expandedSections[idx] || false;
              return (
                <div key={idx} className={styles.accordionItem}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleSection(idx)}
                  >
                    <FontAwesomeIcon
                      icon={isExpanded ? faChevronUp : faChevronDown}
                      className={styles.accordionIcon}
                    />
                    <span className={styles.accordionTitle}>{section.name}</span>
                  </button>
                  {isExpanded && (
                    <div className={styles.accordionContent}>
                      <p>{section.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section B: Entities & Concepts */}
      {(entities.people.length > 0 || 
        entities.organizations.length > 0 || 
        entities.places.length > 0 || 
        entities.topics.length > 0) && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Entities & Concepts</h3>
          <div className={styles.entitiesGrid}>
            {entities.people.length > 0 && (
              <div className={styles.entityCategory}>
                <div className={styles.entityCategoryHeader}>
                  <FontAwesomeIcon icon={faUsers} className={styles.entityIcon} />
                  <span className={styles.entityCategoryLabel}>People</span>
                </div>
                <div className={styles.entityTags}>
                  {entities.people.map((person, idx) => (
                    <span key={idx} className={styles.entityTag}>
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entities.organizations.length > 0 && (
              <div className={styles.entityCategory}>
                <div className={styles.entityCategoryHeader}>
                  <FontAwesomeIcon icon={faBuilding} className={styles.entityIcon} />
                  <span className={styles.entityCategoryLabel}>Organizations</span>
                </div>
                <div className={styles.entityTags}>
                  {entities.organizations.map((org, idx) => (
                    <span key={idx} className={styles.entityTag}>
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entities.places.length > 0 && (
              <div className={styles.entityCategory}>
                <div className={styles.entityCategoryHeader}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.entityIcon} />
                  <span className={styles.entityCategoryLabel}>Places</span>
                </div>
                <div className={styles.entityTags}>
                  {entities.places.map((place, idx) => (
                    <span key={idx} className={styles.entityTag}>
                      {place}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entities.topics.length > 0 && (
              <div className={styles.entityCategory}>
                <div className={styles.entityCategoryHeader}>
                  <FontAwesomeIcon icon={faTags} className={styles.entityIcon} />
                  <span className={styles.entityCategoryLabel}>Topics</span>
                </div>
                <div className={styles.entityTags}>
                  {entities.topics.map((topic, idx) => (
                    <span key={idx} className={styles.entityTag}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section C: Extracted Tables */}
      {tables.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faTable} className={styles.sectionIcon} />
            Extracted Tables
          </h3>
          <div className={styles.tablesContainer}>
            {tables.map((table, idx) => {
              const isExpanded = expandedTables[idx] || false;
              // Handle different table structures
              let tableData = [];
              if (Array.isArray(table)) {
                tableData = table;
              } else if (table.data && Array.isArray(table.data)) {
                tableData = table.data;
              } else if (table.rows && Array.isArray(table.rows)) {
                tableData = table.rows;
              }
              
              if (tableData.length === 0) return null;
              
              const previewRows = tableData.slice(0, 3);
              const hasMoreRows = tableData.length > 3;
              const rowCount = tableData.length;
              const colCount = tableData[0]?.length || 0;

              return (
                <div key={idx} className={styles.tableCard}>
                  <div className={styles.tableHeader}>
                    <span className={styles.tableInfo}>
                      Table {idx + 1} {table.page ? `(Page ${table.page})` : ''} - {rowCount} rows × {colCount} columns
                    </span>
                    {hasMoreRows && (
                      <button
                        className={styles.expandTableButton}
                        onClick={() => toggleTable(idx)}
                      >
                        <FontAwesomeIcon icon={isExpanded ? faCompress : faExpand} />
                        <span>{isExpanded ? 'Collapse' : 'Expand Full Table'}</span>
                      </button>
                    )}
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        {tableData[0] && (
                          <tr>
                            {tableData[0].map((cell, cellIdx) => (
                              <th key={cellIdx}>{cell || ''}</th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {(isExpanded ? tableData : previewRows).slice(1).map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {Array.isArray(row) ? row.map((cell, cellIdx) => (
                              <td key={cellIdx}>{cell || ''}</td>
                            )) : (
                              <td colSpan={colCount}>{row || ''}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section D: Extracted Images */}
      {hasImages && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faImage} className={styles.sectionIcon} />
            Extracted Images
          </h3>
          <div className={styles.imagesContainer}>
            <div className={styles.imageInfo}>
              <p>
                {analysisData.metadata.imageCount} image{analysisData.metadata.imageCount !== 1 ? 's' : ''} detected in the document.
              </p>
              <p className={styles.imageNote}>
                Note: Image thumbnails are not currently extracted. This feature shows the count of images found in the PDF.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section E: Sentiment / Tone Analysis */}
      {sentiment && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faSmile} className={styles.sectionIcon} />
            Sentiment / Tone Analysis
          </h3>
          <div className={styles.sentimentCard}>
            {sentiment.tone && (
              <div className={styles.sentimentItem}>
                <span className={styles.sentimentLabel}>Overall Tone:</span>
                <span className={styles.sentimentValue}>{sentiment.tone}</span>
              </div>
            )}
            {sentiment.sentiment && (
              <div className={styles.sentimentItem}>
                <span className={styles.sentimentLabel}>Sentiment:</span>
                <span className={styles.sentimentValue}>{sentiment.sentiment}</span>
              </div>
            )}
            {sentiment.observations && (
              <div className={styles.sentimentObservations}>
                <span className={styles.sentimentLabel}>Key Observations:</span>
                <p>{sentiment.observations}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFContentAnalysis;
