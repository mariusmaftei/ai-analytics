import React from "react";
import KeyValueTable from "./KeyValueTable";
import styles from "../InsightGenerator.module.css";

const DocumentOverview = ({
  documentDescription,
  insightMetrics,
  analysisData,
  tables,
  documentOverviewSection,
}) => {
  // Check if we have parsed Document Overview section from AI
  const hasParsedOverview = documentOverviewSection && 
    documentOverviewSection.keyValuePairs && 
    documentOverviewSection.keyValuePairs.length > 0;

  // Check if we have basic metrics to show
  const hasBasicMetrics = 
    documentDescription ||
    insightMetrics.pages ||
    insightMetrics.words ||
    insightMetrics.skus ||
    analysisData.metadata;

  if (!hasParsedOverview && !hasBasicMetrics) {
    return null;
  }

  return (
    <div className={styles.aboutSection}>
      <h4 className={styles.aboutTitle}>Document Overview</h4>

      {documentDescription && (
        <div className={styles.documentDescription}>
          {documentDescription}
        </div>
      )}

      {/* Show parsed Document Overview table if available (from AI response) */}
      {hasParsedOverview && (
        <div style={{ marginBottom: '1.5rem' }}>
          <KeyValueTable keyValuePairs={documentOverviewSection.keyValuePairs} />
        </div>
      )}

      {/* Show basic metrics if no parsed overview or as additional info */}
      {hasBasicMetrics && (
        <div className={styles.metricsGrid}>
          {/* Only show Author for non-CSV files (PDFs, documents) */}
          {(insightMetrics.author || analysisData.metadata?.author) && 
           analysisData.fileType !== "CSV" && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Author</span>
              <span
                className={`${styles.metricValue} ${styles.authorValue}`}
              >
                {insightMetrics.author || analysisData.metadata.author}
              </span>
            </div>
          )}
          {insightMetrics.pages && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Pages</span>
              <span className={styles.metricValue}>
                {insightMetrics.pages}
              </span>
            </div>
          )}
          {insightMetrics.words && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Words</span>
              <span className={styles.metricValue}>
                {parseInt(insightMetrics.words).toLocaleString()}
              </span>
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
              <span className={styles.metricValue}>
                {analysisData.metadata.totalPages}
              </span>
            </div>
          )}
          {analysisData.metadata?.wordCount && !insightMetrics.words && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Words</span>
              <span className={styles.metricValue}>
                {analysisData.metadata.wordCount.toLocaleString()}
              </span>
            </div>
          )}
          {insightMetrics.skus && (
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>SKUs</span>
              <span className={styles.metricValue}>
                {parseInt(insightMetrics.skus).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentOverview;

