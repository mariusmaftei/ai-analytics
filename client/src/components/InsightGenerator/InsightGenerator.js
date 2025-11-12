import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faSpinner,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { useInsightGenerator } from "./hooks/useInsightGenerator";
import DocumentOverview from "./components/DocumentOverview";
import InsightSection from "./components/InsightSection";
import styles from "./InsightGenerator.module.css";

const InsightGenerator = ({ fileData, analysisData, tables = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isGenerating,
    insights,
    structuredInsights,
    insightMetrics,
    documentDescription,
    error,
    generateInsights,
  } = useInsightGenerator(fileData, analysisData, tables);

  // Automatically expand when insights are successfully generated
  useEffect(() => {
    if (insights && !isGenerating && !error) {
      setIsExpanded(true);
    }
  }, [insights, isGenerating, error]);

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
            Generate intelligent insights and summaries from your document data,
            including statistics, patterns, and key findings.
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
          <button className={styles.retryButton} onClick={generateInsights}>
            Try Again
          </button>
        </div>
      )}

      {insights && isExpanded && (() => {
        // Find Document Overview section from parsed insights
        const documentOverviewSection = structuredInsights.find(
          (cat) => cat.category.toLowerCase().includes("document overview")
        );

        // Filter out Document Overview from other sections since we show it separately
        const otherSections = structuredInsights.filter(
          (cat) => !cat.category.toLowerCase().includes("document overview")
        );

        return (
          <div className={styles.insightsContent}>
            <DocumentOverview
              documentDescription={documentDescription}
              insightMetrics={insightMetrics}
              analysisData={analysisData}
              tables={tables}
              documentOverviewSection={documentOverviewSection}
            />

            {structuredInsights.length > 0 ? (
              <div className={styles.insightsSectionsContainer}>
                {otherSections.map((category, index) => (
                  <InsightSection key={index} category={category} />
                ))}
              </div>
            ) : (
              <div className={styles.insightsText}>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1rem' }}>
                  Unable to parse structured insights. Showing raw response:
                </p>
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--background-color)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {insights}
                </div>
                <p style={{ 
                  marginTop: '1rem', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}>
                  Check browser console (F12) for parsing details.
                </p>
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
        );
      })()}
    </div>
  );
};

export default InsightGenerator;
