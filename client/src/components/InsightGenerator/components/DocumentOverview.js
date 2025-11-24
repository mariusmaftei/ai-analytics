import React, { useMemo } from "react";
import KeyValueTable from "./KeyValueTable";
import styles from "../InsightGenerator.module.css";

const OVERVIEW_GROUPS = [
  {
    id: "file",
    title: "Dataset Basics",
    badge: "File",
    match: ["file type", "purpose", "format"],
  },
  {
    id: "structure",
    title: "Structure",
    badge: "Schema",
    match: ["rows", "columns", "column names", "contains headers"],
  },
  {
    id: "quality",
    title: "Data Quality",
    badge: "Quality",
    match: [
      "contains missing values",
      "file structure quality",
      "data completeness",
      "confidence score",
    ],
  },
];

const sanitizeText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/^[-•*]\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
};

const isUsefulDescription = (text) => {
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (["bullet", "numbered_section"].includes(lowered)) return false;
  if (/^[✅❌⚙️]$/.test(text)) return false;
  return true;
};

const toListItems = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(sanitizeText)
      .filter(Boolean)
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string" && value.includes(",")) {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length > 1 && items.length <= 8) {
      return items;
    }
  }
  return null;
};

const formatKeyValuePairs = (pairs = []) =>
  pairs
    .map((pair) => {
      const key = sanitizeText(pair.key);
      const valueText = Array.isArray(pair.value)
        ? pair.value.map(sanitizeText).filter(Boolean).join(", ")
        : sanitizeText(pair.value);
      if (!key || !valueText) return null;
      const listItems = toListItems(pair.value || valueText);
      return {
        key,
        value: valueText,
        listItems,
        description: isUsefulDescription(pair.description)
          ? sanitizeText(pair.description)
          : null,
      };
    })
    .filter(Boolean);

const groupOverviewPairs = (pairs) => {
  if (!pairs || pairs.length === 0) return [];
  const usedKeys = new Set();
  const groups = OVERVIEW_GROUPS.map((group) => {
    const items = pairs.filter((pair) =>
      group.match.some((term) =>
        pair.key.toLowerCase().includes(term.toLowerCase())
      )
    );
    items.forEach((item) => usedKeys.add(item.key));
    return items.length
      ? {
          ...group,
          items,
        }
      : null;
  }).filter(Boolean);

  const remaining = pairs.filter((pair) => !usedKeys.has(pair.key));
  if (remaining.length > 0) {
    groups.push({
      id: "additional",
      title: "Additional Details",
      badge: "Info",
      items: remaining,
    });
  }
  return groups;
};

const DocumentOverview = ({
  documentDescription,
  insightMetrics,
  analysisData,
  tables,
  documentOverviewSection,
}) => {
  // Check if we have parsed Document Overview section from AI
  const hasParsedOverview =
    documentOverviewSection &&
    documentOverviewSection.keyValuePairs &&
    documentOverviewSection.keyValuePairs.length > 0;

  const overviewPairs = useMemo(
    () =>
      hasParsedOverview
        ? formatKeyValuePairs(documentOverviewSection.keyValuePairs)
        : [],
    [hasParsedOverview, documentOverviewSection]
  );

  const overviewGroups = useMemo(
    () => groupOverviewPairs(overviewPairs),
    [overviewPairs]
  );

  const hasOverviewCards = hasParsedOverview && overviewGroups.length > 0;

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

      {/* Show parsed Document Overview in card layout if available */}
      {hasOverviewCards && (
        <div className={styles.overviewCardsWrapper}>
          {overviewGroups.map((group) => (
            <div key={group.id} className={styles.overviewGroupCard}>
              <div className={styles.overviewGroupHeader}>
                <div>
                  <p className={styles.overviewGroupTitle}>{group.title}</p>
                  {group.subtitle && (
                    <p className={styles.overviewGroupSubtitle}>
                      {group.subtitle}
                    </p>
                  )}
                </div>
                {group.badge && (
                  <span className={styles.overviewGroupBadge}>
                    {group.badge}
                  </span>
                )}
              </div>
              <div className={styles.overviewStatsGrid}>
                {group.items.map((item) => {
                  const isLongValue = item.value.length > 70 && !item.listItems;
                  return (
                    <div key={item.key} className={styles.overviewStatCard}>
                      <span className={styles.overviewStatKey}>{item.key}</span>
                      {item.listItems ? (
                        <div className={styles.overviewPillList}>
                          {item.listItems.map((pill) => (
                            <span
                              key={`${item.key}-${pill}`}
                              className={styles.overviewPill}
                            >
                              {pill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={
                            isLongValue
                              ? styles.overviewStatValueLong
                              : styles.overviewStatValue
                          }
                        >
                          {item.value}
                        </span>
                      )}
                      {item.description && (
                        <span className={styles.overviewStatDescription}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fallback: show legacy table if formatting fails */}
      {hasParsedOverview && !hasOverviewCards && (
        <div style={{ marginBottom: "1.5rem" }}>
          <KeyValueTable
            keyValuePairs={documentOverviewSection.keyValuePairs}
          />
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

