import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faFileAlt,
  faClock,
  faUser,
  faDatabase,
  faLanguage,
  faTag,
  faImage,
  faTable,
  faList,
  faFileText,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PDFOverview.module.css";

const PDFOverview = ({ data, rawText, fileData, analysisData }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return "N/A";
    const num = typeof value === "number" ? value : parseFloat(value.toString().replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getDocumentPurpose = () => {
    // First, try to extract DOCUMENT_CATEGORY from raw text (most reliable)
    if (rawText) {
      const categoryMatch = rawText.match(/DOCUMENT_CATEGORY:\s*([^\n]+)/i);
      if (categoryMatch) {
        const category = categoryMatch[1].trim();
        // Limit to first 4 words to keep it concise
        const words = category.split(/\s+/).slice(0, 4);
        return words.join(" ");
      }

      // Try other patterns
      const purposeMatch = rawText.match(/(?:document_category|category|document type|document_type)[:\-]?\s*([^\n]+)/i);
      if (purposeMatch) {
        const category = purposeMatch[1].trim();
        const words = category.split(/\s+/).slice(0, 4);
        return words.join(" ");
      }
    }

    // Try to extract from parsed data sections
    if (data?.sections) {
      for (const section of data.sections) {
        if (section.name?.toLowerCase().includes("semantic")) {
          if (section.content) {
            for (const item of section.content) {
              if (item.type === "keyValue" && item.key) {
                const key = item.key.toLowerCase();
                if (key.includes("document_category") || key.includes("category")) {
                  const value = item.value;
                  const words = value.split(/\s+/).slice(0, 4);
                  return words.join(" ");
                }
              }
            }
          }
        }

        // Also check other sections
        if (section.content) {
          for (const item of section.content) {
            if (item.type === "keyValue" && item.key) {
              const key = item.key.toLowerCase();
              if ((key.includes("category") || key.includes("document type") || key.includes("document_type")) && 
                  !key.includes("product") && !key.includes("price")) {
                const value = item.value;
                // Extract first 2-4 words
                const words = value.split(/\s+/).slice(0, 4);
                if (words.length > 0 && words.join(" ").length < 50) {
                  return words.join(" ");
                }
              }
            }
          }
        }
      }
    }

    // Fallback to metadata subject
    if (analysisData?.metadata?.subject && analysisData.metadata.subject !== "Unknown") {
      const words = analysisData.metadata.subject.split(/\s+/).slice(0, 4);
      return words.join(" ");
    }

    // Last resort: try to infer from title
    const title = analysisData?.metadata?.title || fileData?.fileName || "";
    if (title) {
      const titleLower = title.toLowerCase();
      if (titleLower.includes("guide") || titleLower.includes("manual")) {
        return "User Guide Manual";
      } else if (titleLower.includes("report") || titleLower.includes("financial")) {
        return "Financial Report";
      } else if (titleLower.includes("specification") || titleLower.includes("spec")) {
        return "Technical Specification";
      } else if (titleLower.includes("catalog")) {
        return "Product Catalog";
      }
    }

    return "Document";
  };

  const getShortDescription = () => {
    // First, try to extract SHORT_DESCRIPTION from raw text (most reliable)
    if (rawText) {
      // Match SHORT_DESCRIPTION: followed by text until SECTION: or end of text
      const descMatch = rawText.match(/SHORT_DESCRIPTION:\s*([\s\S]*?)(?=\n\s*SECTION:|$)/i);
      if (descMatch) {
        let description = descMatch[1].trim();
        
        // Remove any markdown or structured formatting
        description = description
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/\|/g, '')
          .replace(/✅/g, '')
          .replace(/❌/g, '')
          .replace(/⚙️/g, '')
          .replace(/SECTION:/gi, '')
          .replace(/DOCUMENT_CATEGORY:/gi, '')
          .replace(/\*\*[^*]+\*\*/g, '')
          .replace(/\[.*?\]/g, '')
          .replace(/document_type\s*\|[^\n]+/gi, '')
          .replace(/page_count\s*\|[^\n]+/gi, '')
          .replace(/word_count\s*\|[^\n]+/gi, '')
          .replace(/table_count\s*\|[^\n]+/gi, '')
          .replace(/language\s*\|[^\n]+/gi, '')
          .replace(/\*\*[^*]+\*\*/g, '')
          .replace(/^\*\*.*?\*\*/gm, '') // Remove markdown headers
          .replace(/^\d+\.\s*\*\*.*?\*\*/gm, '') // Remove numbered markdown headers
          .trim();
        
        // Clean up multiple spaces and newlines
        description = description.replace(/\s+/g, ' ').trim();
        
        // Remove any remaining structured data patterns
        description = description.replace(/\w+\s*\|\s*[^\|]+\|/g, '').trim();
        
        // Extract first 4-5 sentences
        const sentences = description.split(/[.!?]+/).filter(s => {
          const cleaned = s.trim();
          return cleaned.length > 15 && 
                 !cleaned.match(/^\w+\s*\|\s*/) && // Not a key-value pair
                 !cleaned.toLowerCase().includes('document_type') &&
                 !cleaned.toLowerCase().includes('page_count') &&
                 !cleaned.toLowerCase().includes('word_count');
        });
        
        if (sentences.length > 0) {
          return sentences.slice(0, 5).join('. ').trim() + '.';
        }
        
        // If no sentence breaks but we have text, return first 500 characters
        if (description.length > 0 && !description.match(/^\w+\s*\|/)) {
          return description.substring(0, 500).trim();
        }
      }

      // Try to find description after DOCUMENT_CATEGORY but before structured sections
      const categoryMatch = rawText.match(/DOCUMENT_CATEGORY:[^\n]+\n(.*?)(?=SECTION:|$)/is);
      if (categoryMatch) {
        let description = categoryMatch[1].trim();
        // Remove structured data patterns
        description = description
          .replace(/document_type\s*\|[^\n]+/gi, '')
          .replace(/page_count\s*\|[^\n]+/gi, '')
          .replace(/word_count\s*\|[^\n]+/gi, '')
          .replace(/table_count\s*\|[^\n]+/gi, '')
          .replace(/language\s*\|[^\n]+/gi, '')
          .replace(/\*\*[^*]+\*\*/g, '')
          .replace(/\|/g, '')
          .replace(/\*\*/g, '')
          .replace(/SECTION:/gi, '')
          .trim();
        
        // Extract sentences
        const sentences = description.split(/[.!?]+/).filter(s => {
          const cleaned = s.trim();
          return cleaned.length > 15 && 
                 !cleaned.match(/^\w+\s*\|\s*/) && // Not a key-value pair
                 !cleaned.toLowerCase().includes('document_type') &&
                 !cleaned.toLowerCase().includes('page_count');
        });
        
        if (sentences.length > 0) {
          return sentences.slice(0, 5).join('. ').trim() + '.';
        }
      }
    }

    // Try to extract from parsed data sections
    if (data?.sections) {
      const summarySection = data.sections.find((s) =>
        s.name?.toLowerCase().includes("summary") ||
        s.name?.toLowerCase().includes("ai summary")
      );

      if (summarySection?.content) {
        const descriptionParts = [];
        for (const item of summarySection.content) {
          if (item.type === "text" && item.text) {
            const text = item.text.trim();
            // Skip if it looks like structured data
            if (!text.includes('|') && !text.match(/^\w+\s*:\s*\w+/)) {
              descriptionParts.push(text);
            }
          } else if (item.type === "bullet" && item.text) {
            const text = item.text.trim();
            if (!text.includes('|') && !text.match(/^\w+\s*:\s*\w+/)) {
              descriptionParts.push(text);
            }
          }
        }
        if (descriptionParts.length > 0) {
          const combined = descriptionParts.join(' ');
          const sentences = combined.split(/[.!?]+/).filter(s => s.trim().length > 15);
          if (sentences.length > 0) {
            return sentences.slice(0, 5).join('. ').trim() + '.';
          }
        }
      }

      const overviewSection = data.sections.find((s) =>
        s.name?.toLowerCase().includes("overview")
      );

      if (overviewSection?.content) {
        const descriptionParts = [];
        for (const item of overviewSection.content) {
          if (item.type === "text" && item.text) {
            const text = item.text.trim();
            // Skip structured data
            if (!text.includes('|') && !text.match(/^\w+\s*:\s*\w+/) && text.length > 20) {
              descriptionParts.push(text);
            }
          }
        }
        if (descriptionParts.length > 0) {
          const combined = descriptionParts.join(' ');
          const sentences = combined.split(/[.!?]+/).filter(s => s.trim().length > 15);
          if (sentences.length > 0) {
            return sentences.slice(0, 5).join('. ').trim() + '.';
          }
        }
      }
    }

    // Fallback: extract clean sentences from raw text, skipping structured data
    if (rawText) {
      // Remove structured sections
      let cleanText = rawText
        .replace(/DOCUMENT_CATEGORY:[^\n]+/gi, '')
        .replace(/SECTION:[^\n]+/gi, '')
        .replace(/\*\*[^*]+\*\*/g, '')
        .replace(/\w+\s*\|\s*[^\n]+/g, '') // Remove key | value pairs
        .replace(/\|/g, '')
        .replace(/\*\*/g, '');
      
      const sentences = cleanText.split(/[.!?]+/).filter(s => {
        const cleaned = s.trim();
        return cleaned.length > 20 && 
               !cleaned.match(/^\w+\s*:\s*/) && // Not a key: value
               !cleaned.toLowerCase().includes('document_type') &&
               !cleaned.toLowerCase().includes('page_count');
      });
      
      if (sentences.length > 0) {
        return sentences.slice(0, 5).join('. ').trim() + '.';
      }
    }

    if (data?.introText) {
      return data.introText;
    }

    return "No description available.";
  };

  const documentSnapshot = {
    title: analysisData?.metadata?.title || fileData?.fileName || "Untitled Document",
    pages: analysisData?.metadata?.totalPages || 0,
    fileSize: fileData?.fileSize || 0,
    language: analysisData?.metadata?.language || "Unknown",
    purpose: getDocumentPurpose(),
  };

  const quickMetrics = {
    words: analysisData?.metadata?.wordCount || 0,
    paragraphs: analysisData?.metadata?.paragraphCount || 0,
    images: analysisData?.metadata?.imageCount || 0,
    tables: analysisData?.tableCount || 0,
    sections: analysisData?.metadata?.sectionCount || 0,
  };

  const shortDescription = getShortDescription();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faFilePdf} />
        </div>
        <div>
          <h2 className={styles.title}>Overview</h2>
          <p className={styles.subtitle}>Document Summary</p>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Document Snapshot</h3>
        <div className={styles.snapshotGrid}>
          <div className={styles.snapshotCard}>
            <div className={styles.snapshotLabel}>PDF Title</div>
            <div className={styles.snapshotValue}>{documentSnapshot.title}</div>
          </div>
          <div className={styles.snapshotCard}>
            <div className={styles.snapshotLabel}>Pages</div>
            <div className={styles.snapshotValue}>{formatNumber(documentSnapshot.pages)}</div>
          </div>
          <div className={styles.snapshotCard}>
            <div className={styles.snapshotLabel}>File Size</div>
            <div className={styles.snapshotValue}>{formatFileSize(documentSnapshot.fileSize)}</div>
          </div>
          <div className={styles.snapshotCard}>
            <div className={styles.snapshotLabel}>Language</div>
            <div className={styles.snapshotValue}>{documentSnapshot.language}</div>
          </div>
          <div className={styles.snapshotCard}>
            <div className={styles.snapshotLabel}>Category</div>
            <div className={styles.snapshotValue}>{documentSnapshot.purpose}</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quick Metrics</h3>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faFileText} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Words</div>
              <div className={styles.metricValue}>{formatNumber(quickMetrics.words)}</div>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faList} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Paragraphs</div>
              <div className={styles.metricValue}>{formatNumber(quickMetrics.paragraphs)}</div>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faImage} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Images</div>
              <div className={styles.metricValue}>{formatNumber(quickMetrics.images)}</div>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faTable} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Tables</div>
              <div className={styles.metricValue}>{formatNumber(quickMetrics.tables)}</div>
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faFileAlt} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Sections Detected</div>
              <div className={styles.metricValue}>{formatNumber(quickMetrics.sections)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Short Description</h3>
        <div className={styles.descriptionCard}>
          <p className={styles.descriptionText}>{shortDescription}</p>
        </div>
      </div>
    </div>
  );
};

export default PDFOverview;
