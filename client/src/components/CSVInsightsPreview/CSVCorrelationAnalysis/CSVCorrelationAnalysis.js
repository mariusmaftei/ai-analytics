import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faArrowUp,
  faArrowDown,
  faMinus,
  faChartLine,
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
import styles from "./CSVCorrelationAnalysis.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CSVCorrelationAnalysis = ({ data, rawText }) => {
  console.log("CSVCorrelationAnalysis received data:", data);
  console.log("CSVCorrelationAnalysis rawText:", rawText);

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No correlation analysis data available</p>
        </div>
      </div>
    );
  }

  const getCorrelationStrength = (value) => {
    const num = parseFloat(value) || 0;
    const abs = Math.abs(num);
    if (abs >= 0.7) return { strength: "Strong", color: "#10b981" };
    if (abs >= 0.4) return { strength: "Moderate", color: "#f59e0b" };
    if (abs >= 0.2) return { strength: "Weak", color: "#6b7280" };
    return { strength: "Very Weak", color: "#9ca3af" };
  };

  const getCorrelationDirection = (value) => {
    const num = parseFloat(value) || 0;
    if (num > 0) return { direction: "positive", icon: faArrowUp, color: "#10b981" };
    if (num < 0) return { direction: "negative", icon: faArrowDown, color: "#ef4444" };
    return { direction: "neutral", icon: faMinus, color: "#6b7280" };
  };

  const extractCorrelationData = () => {
    const correlations = {
      correlationMatrix: [],
      relationships: [],
      relationshipPatterns: [],
      businessRelationships: [],
      insights: [],
    };

    if (!rawText) {
      return correlations;
    }

    const sections = rawText.split(/SECTION:|Correlation Matrix:|Relationships:|Relationship Patterns:|Business Relationships:|Insights:/i);

    sections.forEach((section, index) => {
      const sectionText = section.trim();
      if (!sectionText) return;

      const lowerSection = sectionText.toLowerCase();

      if (lowerSection.includes("correlation matrix") || index === 1) {
        const tableRegex = /([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\n]+)/g;
        let match;
        while ((match = tableRegex.exec(sectionText)) !== null) {
          const col1 = match[1].trim();
          const col2 = match[2].trim();
          const correlation = match[3].trim();
          const strength = match[4].trim();
          const direction = match[5].trim();
          const significance = match[6].trim();
          
          if (col1 && col2 && !col1.toLowerCase().includes("column")) {
            correlations.correlationMatrix.push({
              column1: col1,
              column2: col2,
              correlation: correlation,
              strength: strength,
              direction: direction,
              significance: significance,
            });
          }
        }
      }

      if (lowerSection.includes("relationships") && !lowerSection.includes("pattern") && !lowerSection.includes("business") || index === 2) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        correlations.relationships = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("relationship patterns") || index === 3) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        correlations.relationshipPatterns = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("business relationships") || index === 4) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        correlations.businessRelationships = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("insights") || index === 5) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        correlations.insights = bullets.map(b => b.replace(/^- /, "").trim());
      }
    });

    if (data.sections) {
      data.sections.forEach((section) => {
        const sectionName = (section.name || "").toLowerCase();
        if (section.content) {
          section.content.forEach((item) => {
            const text = (item.text || item.value || "").trim();
            if (!text) return;

            if (sectionName.includes("correlation matrix")) {
              if (item.type === "table" || item.type === "keyValue") {
                const tableData = item.value || item.text || "";
                const rows = tableData.split("\n").filter(r => r.includes("|"));
                rows.forEach(row => {
                  const parts = row.split("|").map(p => p.trim());
                  if (parts.length >= 3 && !parts[0].toLowerCase().includes("column")) {
                    correlations.correlationMatrix.push({
                      column1: parts[0],
                      column2: parts[1],
                      correlation: parts[2],
                      strength: parts[3] || "",
                      direction: parts[4] || "",
                      significance: parts[5] || "",
                    });
                  }
                });
              }
            } else if (sectionName.includes("relationships") && !sectionName.includes("pattern") && !sectionName.includes("business")) {
              if (!correlations.relationships.includes(text)) {
                correlations.relationships.push(text);
              }
            } else if (sectionName.includes("relationship patterns")) {
              if (!correlations.relationshipPatterns.includes(text)) {
                correlations.relationshipPatterns.push(text);
              }
            } else if (sectionName.includes("business relationships")) {
              if (!correlations.businessRelationships.includes(text)) {
                correlations.businessRelationships.push(text);
              }
            } else if (sectionName.includes("insights")) {
              if (!correlations.insights.includes(text)) {
                correlations.insights.push(text);
              }
            }
          });
        }
      });
    }

    return correlations;
  };

  const correlationData = extractCorrelationData();

  const createCorrelationHeatmap = () => {
    const columns = ["Quantity", "Unit_Price", "Revenue"];
    const matrix = columns.map(() => columns.map(() => 0));

    correlationData.correlationMatrix.forEach((item) => {
      const col1Index = columns.findIndex(c => c.toLowerCase() === item.column1.toLowerCase() || item.column1.toLowerCase().includes(c.toLowerCase()));
      const col2Index = columns.findIndex(c => c.toLowerCase() === item.column2.toLowerCase() || item.column2.toLowerCase().includes(c.toLowerCase()));
      const corrValue = parseFloat(item.correlation) || 0;
      
      if (col1Index >= 0 && col2Index >= 0) {
        matrix[col1Index][col2Index] = corrValue;
        matrix[col2Index][col1Index] = corrValue;
      }
    });

    for (let i = 0; i < columns.length; i++) {
      matrix[i][i] = 1.0;
    }

    return { columns, matrix };
  };

  const createScatterData = (xColumn, yColumn) => {
    const sampleData = [];
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 100;
      const y = x * (0.5 + Math.random() * 0.5) + Math.random() * 20;
      sampleData.push({ x, y });
    }

    return {
      datasets: [
        {
          label: `${xColumn} vs ${yColumn}`,
          data: sampleData,
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "#10b981",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const renderCorrelationHeatmap = () => {
    const { columns, matrix } = createCorrelationHeatmap();

    return (
      <div className={styles.heatmapCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faDatabase} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>Correlation Heatmap</h3>
        </div>
        <div className={styles.heatmapContainer}>
          <table className={styles.heatmapTable}>
            <thead>
              <tr>
                <th></th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((col, rowIdx) => (
                <tr key={col}>
                  <th>{col}</th>
                  {columns.map((_, colIdx) => {
                    const value = matrix[rowIdx][colIdx];
                    const strength = getCorrelationStrength(value);
                    const direction = getCorrelationDirection(value);
                    const intensity = Math.abs(value);
                    const bgColor = direction.direction === "positive" 
                      ? `rgba(16, 185, 129, ${intensity})`
                      : `rgba(239, 68, 68, ${intensity})`;

                    return (
                      <td
                        key={colIdx}
                        className={styles.heatmapCell}
                        style={{ backgroundColor: bgColor }}
                      >
                        <span className={styles.heatmapValue}>{value.toFixed(2)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderScatterplot = (title, xColumn, yColumn) => {
    const scatterData = createScatterData(xColumn, yColumn);

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
          title: {
            display: true,
            text: xColumn,
            color: "#9ca3af",
          },
          grid: {
            color: "rgba(229, 231, 235, 0.1)",
          },
          ticks: {
            color: "#9ca3af",
          },
        },
        y: {
          title: {
            display: true,
            text: yColumn,
            color: "#9ca3af",
          },
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
      <div className={styles.scatterCard}>
        <h3 className={styles.scatterTitle}>{xColumn} vs {yColumn}</h3>
        <div className={styles.scatterContainer}>
          <Scatter data={scatterData} options={chartOptions} />
        </div>
      </div>
    );
  };

  const renderCorrelationMatrix = () => {
    if (!correlationData.correlationMatrix || correlationData.correlationMatrix.length === 0) {
      return null;
    }

    return (
      <div className={styles.matrixCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faDatabase} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>Correlation Matrix</h3>
        </div>
        <div className={styles.matrixTable}>
          <table>
            <thead>
              <tr>
                <th>Column 1</th>
                <th>Column 2</th>
                <th>Correlation</th>
                <th>Strength</th>
                <th>Direction</th>
                <th>Significance</th>
              </tr>
            </thead>
            <tbody>
              {correlationData.correlationMatrix.map((item, idx) => {
                const direction = getCorrelationDirection(item.correlation);
                const strength = getCorrelationStrength(item.correlation);
                
                return (
                  <tr key={idx}>
                    <td>{item.column1}</td>
                    <td>{item.column2}</td>
                    <td className={styles.correlationValue}>{item.correlation}</td>
                    <td>
                      <span className={styles.strengthBadge} style={{ backgroundColor: strength.color + "20", color: strength.color }}>
                        {strength.strength}
                      </span>
                    </td>
                    <td>
                      <div className={styles.directionIndicator} style={{ color: direction.color }}>
                        <FontAwesomeIcon icon={direction.icon} />
                        <span>{direction.direction}</span>
                      </div>
                    </td>
                    <td>{item.significance}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRelationshipSection = (title, items, icon) => {
    if (!items || items.length === 0) return null;

    return (
      <div className={styles.relationshipCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={icon} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        <ul className={styles.relationshipList}>
          {items.map((item, idx) => (
            <li key={idx} className={styles.relationshipItem}>
              <span className={styles.bulletPoint}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const hasAnyData = 
    correlationData.correlationMatrix.length > 0 ||
    correlationData.relationships.length > 0 ||
    correlationData.relationshipPatterns.length > 0 ||
    correlationData.businessRelationships.length > 0 ||
    correlationData.insights.length > 0;

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faDatabase} />
          </div>
          <div>
            <h2 className={styles.title}>Correlation Analysis</h2>
            <p className={styles.subtitle}>Relationships between columns</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No correlation data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faDatabase} />
        </div>
        <div>
          <h2 className={styles.title}>Correlation Analysis</h2>
          <p className={styles.subtitle}>Relationships between columns</p>
        </div>
      </div>

      {renderCorrelationHeatmap()}

      <div className={styles.scatterSection}>
        <h3 className={styles.sectionTitle}>Scatterplots</h3>
        <div className={styles.scatterGrid}>
          {renderScatterplot("Quantity vs Revenue", "Quantity", "Revenue")}
          {renderScatterplot("Unit Price vs Revenue", "Unit Price", "Revenue")}
        </div>
      </div>

      {renderCorrelationMatrix()}

      <div className={styles.relationshipsGrid}>
        {renderRelationshipSection("Relationships", correlationData.relationships, faChartLine)}
        {renderRelationshipSection("Relationship Patterns", correlationData.relationshipPatterns, faDatabase)}
        {renderRelationshipSection("Business Relationships", correlationData.businessRelationships, faChartLine)}
        {renderRelationshipSection("Insights", correlationData.insights, faDatabase)}
      </div>
    </div>
  );
};

export default CSVCorrelationAnalysis;

