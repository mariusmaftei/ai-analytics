import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faChartLine,
  faLayerGroup,
  faClock,
  faObjectGroup,
  faChartArea,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import styles from "./CSVPatternDetection.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CSVPatternDetection = ({ data, rawText }) => {
  console.log("CSVPatternDetection received data:", data);
  console.log("CSVPatternDetection rawText:", rawText);

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No pattern detection data available</p>
        </div>
      </div>
    );
  }

  const extractPatternData = () => {
    const patterns = {
      patternIdentification: [],
      valuePatterns: [],
      relationshipPatterns: [],
      businessPatterns: [],
      anomalyPatterns: [],
      clusters: [],
      timelinePatterns: [],
    };

    if (!rawText) {
      return patterns;
    }

    const sections = rawText.split(/SECTION:|Pattern Identification:|Value Patterns:|Relationship Patterns:|Business Patterns:|Anomaly Patterns:/i);

    sections.forEach((section, index) => {
      const sectionText = section.trim();
      if (!sectionText) return;

      const lowerSection = sectionText.toLowerCase();

      if (lowerSection.includes("pattern identification") || index === 1) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        patterns.patternIdentification = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("value patterns") || index === 2) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        patterns.valuePatterns = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("relationship patterns") || index === 3) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        patterns.relationshipPatterns = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("business patterns") || index === 4) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        patterns.businessPatterns = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("anomaly patterns") || index === 5) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        patterns.anomalyPatterns = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("clustering") || lowerSection.includes("cluster")) {
        const clusterMatches = sectionText.match(/(?:cluster|clustering)[^:]*:?\s*([^\n]+)/gi) || [];
        patterns.clusters = clusterMatches.map(m => m.replace(/^(?:cluster|clustering)[^:]*:?\s*/i, "").trim());
      }

      if (lowerSection.includes("temporal") || lowerSection.includes("date") || lowerSection.includes("time")) {
        const timeMatches = sectionText.match(/(?:temporal|date|time|seasonal)[^:]*:?\s*([^\n]+)/gi) || [];
        patterns.timelinePatterns = timeMatches.map(m => m.replace(/^(?:temporal|date|time|seasonal)[^:]*:?\s*/i, "").trim());
      }
    });

    if (data.sections) {
      data.sections.forEach((section) => {
        const sectionName = (section.name || "").toLowerCase();
        if (section.content) {
          section.content.forEach((item) => {
            const text = (item.text || item.value || "").trim();
            if (!text) return;

            if (sectionName.includes("pattern identification")) {
              if (!patterns.patternIdentification.includes(text)) {
                patterns.patternIdentification.push(text);
              }
            } else if (sectionName.includes("value")) {
              if (!patterns.valuePatterns.includes(text)) {
                patterns.valuePatterns.push(text);
              }
            } else if (sectionName.includes("relationship")) {
              if (!patterns.relationshipPatterns.includes(text)) {
                patterns.relationshipPatterns.push(text);
              }
            } else if (sectionName.includes("business")) {
              if (!patterns.businessPatterns.includes(text)) {
                patterns.businessPatterns.push(text);
              }
            } else if (sectionName.includes("anomaly")) {
              if (!patterns.anomalyPatterns.includes(text)) {
                patterns.anomalyPatterns.push(text);
              }
            }
          });
        }
      });
    }

    return patterns;
  };

  const patternData = extractPatternData();

  const renderPatternCard = (title, icon, patterns, color = "var(--primary-color)") => {
    if (!patterns || patterns.length === 0) return null;

    return (
      <div className={styles.patternCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={icon} className={styles.cardIcon} style={{ color }} />
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        <ul className={styles.patternList}>
          {patterns.map((pattern, idx) => (
            <li key={idx} className={styles.patternItem}>
              <span className={styles.bulletPoint}>•</span>
              <span>{pattern}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderClusterChart = () => {
    if (!patternData.clusters || patternData.clusters.length === 0) {
      return null;
    }

    const chartData = {
      datasets: [
        {
          label: "Data Clusters",
          data: patternData.clusters.map((_, idx) => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
          })),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "#10b981",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          titleColor: "#10b981",
          bodyColor: "#e5e7eb",
          borderColor: "#10b981",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(229, 231, 235, 0.1)",
          },
          ticks: {
            color: "#9ca3af",
          },
        },
        y: {
          grid: {
            color: "rgba(229, 231, 235, 0.1)",
          },
          ticks: {
            color: "#9ca3af",
          },
        },
      },
    };

    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <FontAwesomeIcon icon={faChartArea} className={styles.chartIcon} />
          <h3 className={styles.chartTitle}>Cluster Visualization</h3>
        </div>
        <div className={styles.scatterContainer}>
          <Scatter data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!patternData.timelinePatterns || patternData.timelinePatterns.length === 0) {
      return null;
    }

    return (
      <div className={styles.timelineCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faClock} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>Timeline Patterns</h3>
        </div>
        <div className={styles.timelineContainer}>
          {patternData.timelinePatterns.map((pattern, idx) => (
            <div key={idx} className={styles.timelineItem}>
              <div className={styles.timelineDot}></div>
              <div className={styles.timelineContent}>
                <p>{pattern}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasAnyData = 
    patternData.patternIdentification.length > 0 ||
    patternData.valuePatterns.length > 0 ||
    patternData.relationshipPatterns.length > 0 ||
    patternData.businessPatterns.length > 0 ||
    patternData.anomalyPatterns.length > 0 ||
    patternData.clusters.length > 0 ||
    patternData.timelinePatterns.length > 0;

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <div>
            <h2 className={styles.title}>Pattern Detection</h2>
            <p className={styles.subtitle}>Identify trends and patterns</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No patterns detected in the data</p>
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
          <h2 className={styles.title}>Pattern Detection</h2>
          <p className={styles.subtitle}>Identify trends and patterns</p>
        </div>
      </div>

      <div className={styles.patternsGrid}>
        {renderPatternCard(
          "Pattern Identification",
          faLayerGroup,
          patternData.patternIdentification,
          "#10b981"
        )}
        {renderPatternCard(
          "Value Patterns",
          faObjectGroup,
          patternData.valuePatterns,
          "#06b6d4"
        )}
        {renderPatternCard(
          "Relationship Patterns",
          faChartLine,
          patternData.relationshipPatterns,
          "#f59e0b"
        )}
        {renderPatternCard(
          "Business Patterns",
          faChartLine,
          patternData.businessPatterns,
          "#8b5cf6"
        )}
        {renderPatternCard(
          "Anomaly Patterns",
          faSearch,
          patternData.anomalyPatterns,
          "#ef4444"
        )}
      </div>

      {(patternData.clusters.length > 0 || patternData.timelinePatterns.length > 0) && (
        <div className={styles.visualizationsSection}>
          <h3 className={styles.sectionTitle}>Visualizations</h3>
          <div className={styles.visualizationsGrid}>
            {renderClusterChart()}
            {renderTimeline()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVPatternDetection;

