import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faExclamationCircle,
  faTable,
  faClipboardCheck,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./CSVDataQuality.module.css";

const CSVDataQuality = ({ data, rawText }) => {
  console.log("CSVDataQuality received data:", data);
  console.log("CSVDataQuality rawText:", rawText);

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No data quality information available</p>
        </div>
      </div>
    );
  }

  const getQualityStatus = (score) => {
    if (score >= 80) return { status: "good", color: "#10b981", label: "Good" };
    if (score >= 60) return { status: "warning", color: "#f59e0b", label: "Warning" };
    return { status: "error", color: "#ef4444", label: "Poor" };
  };

  const extractQualityData = () => {
    const quality = {
      completeness: [],
      consistency: [],
      accuracy: [],
      validity: [],
      metrics: [],
      recommendations: [],
      missingValues: [],
      errors: [],
    };

    if (!rawText) {
      return quality;
    }

    const sections = rawText.split(/SECTION:|Data Completeness:|Data Consistency:|Data Accuracy:|Data Validity:|Quality Metrics:|Recommendations:/i);

    sections.forEach((section, index) => {
      const sectionText = section.trim();
      if (!sectionText) return;

      const lowerSection = sectionText.toLowerCase();

      if (lowerSection.includes("completeness") || index === 1) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        quality.completeness = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("consistency") || index === 2) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        quality.consistency = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("accuracy") || index === 3) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        quality.accuracy = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("validity") || index === 4) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        quality.validity = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("quality metrics") || lowerSection.includes("metrics") || index === 5) {
        const tableRegex = /([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\n]+)/g;
        let match;
        while ((match = tableRegex.exec(sectionText)) !== null) {
          const metric = match[1].trim();
          const score = match[2].trim();
          const description = match[3].trim();
          if (metric && score && !metric.toLowerCase().includes("metric")) {
            quality.metrics.push({ metric, score, description });
          }
        }
      }

      if (lowerSection.includes("recommendations") || index === 6) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        quality.recommendations = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("missing") || lowerSection.includes("null")) {
        const missingMatches = sectionText.match(/(?:missing|null|empty)[^:]*:?\s*([^\n]+)/gi) || [];
        quality.missingValues = missingMatches.map(m => m.replace(/^(?:missing|null|empty)[^:]*:?\s*/i, "").trim());
      }

      if (lowerSection.includes("error") || lowerSection.includes("invalid") || lowerSection.includes("inconsistent")) {
        const errorMatches = sectionText.match(/(?:error|invalid|inconsistent)[^:]*:?\s*([^\n]+)/gi) || [];
        quality.errors = errorMatches.map(m => m.replace(/^(?:error|invalid|inconsistent)[^:]*:?\s*/i, "").trim());
      }
    });

    if (data.sections) {
      data.sections.forEach((section) => {
        const sectionName = (section.name || "").toLowerCase();
        if (section.content) {
          section.content.forEach((item) => {
            const text = (item.text || item.value || "").trim();
            if (!text) return;

            if (sectionName.includes("completeness")) {
              if (!quality.completeness.includes(text)) {
                quality.completeness.push(text);
              }
            } else if (sectionName.includes("consistency")) {
              if (!quality.consistency.includes(text)) {
                quality.consistency.push(text);
              }
            } else if (sectionName.includes("accuracy")) {
              if (!quality.accuracy.includes(text)) {
                quality.accuracy.push(text);
              }
            } else if (sectionName.includes("validity")) {
              if (!quality.validity.includes(text)) {
                quality.validity.push(text);
              }
            } else if (sectionName.includes("recommendations")) {
              if (!quality.recommendations.includes(text)) {
                quality.recommendations.push(text);
              }
            }
          });
        }
      });
    }

    return quality;
  };

  const qualityData = extractQualityData();

  const renderChecklist = (title, items, icon) => {
    if (!items || items.length === 0) return null;

    return (
      <div className={styles.checklistCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={icon} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        <ul className={styles.checklist}>
          {items.map((item, idx) => {
            const isPositive = item.toLowerCase().includes("no") || 
                              item.toLowerCase().includes("none") || 
                              item.toLowerCase().includes("all") ||
                              item.toLowerCase().includes("valid") ||
                              item.toLowerCase().includes("consistent");
            const isWarning = item.toLowerCase().includes("some") || 
                            item.toLowerCase().includes("partial") ||
                            item.toLowerCase().includes("minor");
            const isError = item.toLowerCase().includes("found") || 
                           item.toLowerCase().includes("detected") ||
                           item.toLowerCase().includes("missing") ||
                           item.toLowerCase().includes("invalid");

            let status = "neutral";
            if (isPositive && !isError) status = "good";
            else if (isWarning) status = "warning";
            else if (isError) status = "error";

            return (
              <li key={idx} className={styles.checklistItem}>
                <div className={styles.statusIndicator}>
                  {status === "good" && (
                    <FontAwesomeIcon icon={faCheckCircle} className={styles.statusIcon} style={{ color: "#10b981" }} />
                  )}
                  {status === "warning" && (
                    <FontAwesomeIcon icon={faExclamationCircle} className={styles.statusIcon} style={{ color: "#f59e0b" }} />
                  )}
                  {status === "error" && (
                    <FontAwesomeIcon icon={faTimesCircle} className={styles.statusIcon} style={{ color: "#ef4444" }} />
                  )}
                  {status === "neutral" && (
                    <FontAwesomeIcon icon={faInfoCircle} className={styles.statusIcon} style={{ color: "#6b7280" }} />
                  )}
                </div>
                <span className={styles.checklistText}>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderQualityMetrics = () => {
    if (!qualityData.metrics || qualityData.metrics.length === 0) return null;

    return (
      <div className={styles.metricsCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faTable} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>Quality Metrics</h3>
        </div>
        <div className={styles.metricsTable}>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Score</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {qualityData.metrics.map((metric, idx) => {
                const score = parseInt(metric.score) || 0;
                const status = getQualityStatus(score);
                return (
                  <tr key={idx}>
                    <td>{metric.metric}</td>
                    <td className={styles.scoreCell}>{score}%</td>
                    <td>
                      <span className={styles.statusBadge} style={{ backgroundColor: status.color + "20", color: status.color }}>
                        <span className={styles.statusDot} style={{ backgroundColor: status.color }}></span>
                        {status.label}
                      </span>
                    </td>
                    <td>{metric.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMissingValuesTable = () => {
    if (!qualityData.missingValues || qualityData.missingValues.length === 0) return null;

    return (
      <div className={styles.missingValuesCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.cardIcon} style={{ color: "#ef4444" }} />
          <h3 className={styles.cardTitle}>Missing Values</h3>
        </div>
        <div className={styles.missingTable}>
          <table>
            <thead>
              <tr>
                <th>Column/Field</th>
                <th>Missing Count</th>
                <th>Percentage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {qualityData.missingValues.map((item, idx) => {
                const match = item.match(/([^:]+):\s*(\d+)\s*(?:\(([^)]+)\))?/i);
                if (match) {
                  const column = match[1].trim();
                  const count = match[2];
                  const percentage = match[3] || "0%";
                  const percentNum = parseInt(percentage) || 0;
                  const status = getQualityStatus(100 - percentNum);
                  
                  return (
                    <tr key={idx}>
                      <td>{column}</td>
                      <td>{count}</td>
                      <td>{percentage}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ backgroundColor: status.color + "20", color: status.color }}>
                          <span className={styles.statusDot} style={{ backgroundColor: status.color }}></span>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={idx}>
                    <td colSpan="4">{item}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderErrorPanel = () => {
    if (!qualityData.errors || qualityData.errors.length === 0) return null;

    return (
      <div className={styles.errorPanel}>
        <div className={styles.errorHeader}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.errorIcon} />
          <h3 className={styles.errorTitle}>Formatting & Consistency Errors</h3>
        </div>
        <ul className={styles.errorList}>
          {qualityData.errors.map((error, idx) => (
            <li key={idx} className={styles.errorItem}>
              <FontAwesomeIcon icon={faTimesCircle} className={styles.errorBullet} />
              <span>{error}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const hasAnyData = 
    qualityData.completeness.length > 0 ||
    qualityData.consistency.length > 0 ||
    qualityData.accuracy.length > 0 ||
    qualityData.validity.length > 0 ||
    qualityData.metrics.length > 0 ||
    qualityData.recommendations.length > 0 ||
    qualityData.missingValues.length > 0 ||
    qualityData.errors.length > 0;

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faClipboardCheck} />
          </div>
          <div>
            <h2 className={styles.title}>Data Quality</h2>
            <p className={styles.subtitle}>Missing values and inconsistencies</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No data quality information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faClipboardCheck} />
        </div>
        <div>
          <h2 className={styles.title}>Data Quality</h2>
          <p className={styles.subtitle}>Missing values and inconsistencies</p>
        </div>
      </div>

      {renderQualityMetrics()}

      <div className={styles.checklistsGrid}>
        {renderChecklist("Data Completeness", qualityData.completeness, faCheckCircle)}
        {renderChecklist("Data Consistency", qualityData.consistency, faExclamationCircle)}
        {renderChecklist("Data Accuracy", qualityData.accuracy, faInfoCircle)}
        {renderChecklist("Data Validity", qualityData.validity, faClipboardCheck)}
      </div>

      {renderMissingValuesTable()}
      {renderErrorPanel()}

      {qualityData.recommendations.length > 0 && (
        <div className={styles.recommendationsCard}>
          <div className={styles.cardHeader}>
            <FontAwesomeIcon icon={faInfoCircle} className={styles.cardIcon} />
            <h3 className={styles.cardTitle}>Recommendations</h3>
          </div>
          <ul className={styles.recommendationsList}>
            {qualityData.recommendations.map((rec, idx) => (
              <li key={idx} className={styles.recommendationItem}>
                <span className={styles.bulletPoint}>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CSVDataQuality;

