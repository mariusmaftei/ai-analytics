import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faChartLine,
  faCheckCircle,
  faTable,
  faFileAlt,
  faBrain,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import NumberedSections from "./NumberedSections";
import CheckmarksList from "./CheckmarksList";
import KeyValueTable from "./KeyValueTable";
import CategorySummary from "./CategorySummary";
import styles from "../InsightGenerator.module.css";

const InsightSection = ({ category }) => {
  const categoryLower = category.category.toLowerCase();
  const isDocumentOverview = categoryLower.includes("document overview");
  const isStructural = categoryLower.includes("structural");
  const isProduct = categoryLower.includes("product");
  const isStatistical = categoryLower.includes("statistic");
  const isSemantic = categoryLower.includes("semantic");
  const isAISummary =
    categoryLower.includes("ai summary") || categoryLower.includes("summary");
  const isRecommendation = categoryLower.includes("recommendation");

  let containerClass = styles.insightSection;
  if (isDocumentOverview) {
    containerClass = styles.documentOverviewSection;
  } else if (isStructural) {
    containerClass = styles.structuralInsightsSection;
  } else if (isProduct) {
    containerClass = styles.productInsightsSection;
  } else if (isStatistical) {
    containerClass = styles.statisticalInsightsSection;
  } else if (isSemantic) {
    containerClass = styles.semanticInsightsSection;
  } else if (isAISummary) {
    containerClass = styles.aiSummarySection;
  } else if (isRecommendation) {
    containerClass = styles.recommendationSection;
  }

  const hasNumberedSections = category.keyValuePairs?.some((p) =>
    p.key.startsWith("numbered_section_")
  );
  const hasCheckmarks = category.keyValuePairs?.some(
    (p) => p.key === "checkmark_item"
  );
  const hasBullets = category.keyValuePairs?.some(
    (p) => p.key === "bullet_point"
  );
  const isPatternsTrends = categoryLower.includes("patterns") || 
                          categoryLower.includes("trends");

  // Get icon based on section type
  const getSectionIcon = () => {
    if (categoryLower.includes("key insights") || categoryLower.includes("insights")) {
      return faLightbulb;
    } else if (isPatternsTrends || categoryLower.includes("trend")) {
      return faChartLine;
    } else if (categoryLower.includes("data quality") || categoryLower.includes("quality")) {
      return faCheckCircle;
    } else if (categoryLower.includes("regional") || categoryLower.includes("table")) {
      return faTable;
    } else if (categoryLower.includes("summary") || categoryLower.includes("ai summary")) {
      return faBrain;
    } else if (categoryLower.includes("recommendation")) {
      return faExclamationTriangle;
    } else if (isStructural || isProduct || isStatistical || isSemantic) {
      return faFileAlt;
    }
    return faLightbulb; // Default icon
  };

  const sectionIcon = getSectionIcon();
  const iconColor = isPatternsTrends ? "#10b981" : 
                   categoryLower.includes("data quality") ? "#10b981" :
                   categoryLower.includes("regional") ? "#3b82f6" :
                   categoryLower.includes("summary") ? "var(--primary-color)" :
                   categoryLower.includes("recommendation") ? "#ef4444" :
                   "var(--primary-color)";

  return (
    <div className={containerClass}>
      <div className={styles.sectionHeader}>
        <FontAwesomeIcon 
          icon={sectionIcon} 
          className={styles.sectionIcon}
          style={{ color: iconColor }}
        />
        <h3 className={styles.sectionTitle}>{category.category}</h3>
      </div>

      <div className={styles.sectionContent}>
        {category.keyValuePairs && category.keyValuePairs.length > 0 ? (
          <>
            {(hasNumberedSections ||
              (hasBullets && categoryLower.includes("key insights"))) && (
              <NumberedSections keyValuePairs={category.keyValuePairs} />
            )}
            {hasCheckmarks && (
              <CheckmarksList keyValuePairs={category.keyValuePairs} />
            )}
            {isPatternsTrends && hasBullets && (
              <div className={styles.insightsList}>
                {category.keyValuePairs
                  .filter((p) => p.key === "bullet_point")
                  .map((pair, idx) => {
                    // Check if it starts with a checkmark/icon
                    const hasIcon = /^[✅❌⚙️]/.test(pair.value);
                    const icon = hasIcon ? pair.value.match(/^([✅❌⚙️])/)?.[1] : "•";
                    const text = hasIcon ? pair.value.replace(/^[✅❌⚙️]\s*/, "") : pair.value;
                    
                    return (
                      <div key={idx} className={styles.insightItem}>
                        <div className={styles.insightIcon}>{icon}</div>
                        <div className={styles.insightText}>{text}</div>
                      </div>
                    );
                  })}
              </div>
            )}
            {categoryLower.includes("regional insights") && (
              <KeyValueTable keyValuePairs={category.keyValuePairs} />
            )}
            {!hasNumberedSections &&
              !hasCheckmarks &&
              !isPatternsTrends &&
              !categoryLower.includes("regional insights") &&
              !(hasBullets && categoryLower.includes("key insights")) && (
                <KeyValueTable keyValuePairs={category.keyValuePairs} />
              )}
            {/* Show summary if available even when keyValuePairs exist (for AI Summary) */}
            {category.summary && isAISummary && (
              <CategorySummary
                summary={category.summary}
                isAISummary={isAISummary}
              />
            )}
          </>
        ) : (
          <>
            <CategorySummary
              summary={category.summary}
              isAISummary={isAISummary}
            />
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
          </>
        )}
      </div>
    </div>
  );
};

export default InsightSection;

