import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faChartLine,
  faCalculator,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import styles from "./CSVStatisticalAnalysis.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CSVStatisticalAnalysis = ({ data, rawText }) => {
  console.log("CSVStatisticalAnalysis received data:", data);
  console.log("CSVStatisticalAnalysis rawText:", rawText);

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No statistical analysis data available</p>
        </div>
      </div>
    );
  }

  const extractStatisticalData = () => {
    const stats = {
      columns: [],
      summaryTable: null,
      distributionAnalysis: [],
      comparativeStats: [],
    };

    if (!rawText) return stats;

    const text = rawText;
    
    const extractFromSection = (sectionName, content) => {
      if (sectionName.includes("statistical summary")) {
        const columnNames = ['Quantity', 'Unit_Price', 'Revenue'];
        const statNames = ['Mean', 'Median', 'Mode', 'Std Dev', 'Variance', 'Min', 'Max', 'Range', 
                          'Q1 (25th Percentile)', 'Q2 (50th Percentile)', 'Q3 (75th Percentile)', 
                          'IQR', 'Skewness', 'Distribution Shape'];
        
        columnNames.forEach(colName => {
          if (!stats.columns.find(c => c.name === colName)) {
            stats.columns.push({ name: colName, stats: {} });
          }
        });

        statNames.forEach(statName => {
          const escapedStat = statName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`${escapedStat}:\\s*([^]+?)(?=(?:Mean|Median|Mode|Std Dev|Variance|Min|Max|Range|Q1|Q2|Q3|IQR|Skewness|Distribution Shape):|SECTION:|$)`, 'i');
          const match = content.match(regex);
          if (match) {
            const values = match[1].trim();
            columnNames.forEach((colName) => {
              const colRegex = new RegExp(`${colName}:\\s*([^,]+)`, 'i');
              const colMatch = values.match(colRegex);
              if (colMatch) {
                const column = stats.columns.find(c => c.name === colName);
                if (column) {
                  column.stats[statName] = colMatch[1].trim();
                }
              }
            });
          }
        });
      }

      if (sectionName.includes("column statistics")) {
        const columnNames = ['Quantity', 'Unit_Price', 'Revenue'];
        
        columnNames.forEach(colName => {
          if (!stats.columns.find(c => c.name === colName)) {
            stats.columns.push({ name: colName, stats: {} });
          }
          
          const column = stats.columns.find(c => c.name === colName);
          if (column) {
            const columnRegex = new RegExp(`${colName}:\\s*- ([^A-Z]+?)(?=[A-Z][a-z_]+:|SECTION:|$)`, 'is');
            const columnMatch = content.match(columnRegex);
            
            if (columnMatch) {
              const columnContent = columnMatch[1];
              const statRegex = /- ([^:]+):\s*([^\n-]+)/g;
              let statMatch;
              while ((statMatch = statRegex.exec(columnContent)) !== null) {
                const statKey = statMatch[1].trim();
                const statValue = statMatch[2].trim();
                if (statKey && statValue) {
                  column.stats[statKey] = statValue;
                }
              }
            }
          }
        });
      }

      if (sectionName.includes("distribution analysis")) {
        const bulletRegex = /- ([^\n]+)/g;
        let bulletMatch;
        while ((bulletMatch = bulletRegex.exec(content)) !== null) {
          stats.distributionAnalysis.push({
            type: 'bullet',
            text: bulletMatch[1].trim()
          });
        }
      }

      if (sectionName.includes("comparative statistics")) {
        const bulletRegex = /- ([^\n]+)/g;
        let bulletMatch;
        while ((bulletMatch = bulletRegex.exec(content)) !== null) {
          stats.comparativeStats.push({
            type: 'bullet',
            text: bulletMatch[1].trim()
          });
        }
      }
    };

    const sections = text.split(/(?=SECTION:)/i);
    sections.forEach(section => {
      if (section.trim()) {
        const sectionMatch = section.match(/SECTION:\s*([A-Z][^A-Z]+?)(?=[A-Z][^:]+:|SECTION:|$)/i);
        if (sectionMatch) {
          let sectionName = sectionMatch[1].trim();
          const knownSections = ['Statistical Summary', 'Column Statistics', 'Distribution Analysis', 'Comparative Statistics'];
          for (const known of knownSections) {
            if (sectionName.startsWith(known)) {
              sectionName = known;
              break;
            }
          }
          const content = section.substring(sectionMatch.index + sectionMatch[0].length).trim();
          extractFromSection(sectionName, content);
        }
      }
    });

    if (data.sections) {
      data.sections.forEach((section) => {
        let sectionName = section.name?.toLowerCase() || "";
        
        const knownSections = ['statistical summary', 'column statistics', 'distribution analysis', 'comparative statistics'];
        for (const known of knownSections) {
          if (sectionName.startsWith(known) || sectionName.includes(known)) {
            sectionName = known;
            break;
          }
        }

        if (sectionName.includes("statistical summary")) {
          const columnNames = ['Quantity', 'Unit_Price', 'Revenue'];
          const statNames = ['Mean', 'Median', 'Mode', 'Std Dev', 'Variance', 'Min', 'Max', 'Range', 
                            'Q1 (25th Percentile)', 'Q2 (50th Percentile)', 'Q3 (75th Percentile)', 
                            'IQR', 'Skewness', 'Distribution Shape'];
          
          columnNames.forEach(colName => {
            if (!stats.columns.find(c => c.name === colName)) {
              stats.columns.push({ name: colName, stats: {} });
            }
          });

          let contentToParse = '';
          if (section.content && section.content.length > 0) {
            contentToParse = section.content.map(item => item.text || item.value || '').join(' ');
          }
          if (rawText) {
            const summarySection = rawText.match(/SECTION:\s*Statistical Summary([^]+?)(?=SECTION:|$)/is);
            if (summarySection) {
              contentToParse = summarySection[1] + ' ' + contentToParse;
            }
          }

          if (contentToParse) {
            statNames.forEach(statName => {
              const escapedStat = statName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const nextStats = statNames.filter(s => s !== statName).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
              const regex = new RegExp(`${escapedStat}:\\s*([^]+?)(?=(?:${nextStats}):|SECTION:|$)`, 'i');
              const match = contentToParse.match(regex);
              if (match) {
                const values = match[1].trim();
                columnNames.forEach((colName) => {
                  const colRegex = new RegExp(`${colName}:\\s*([^,]+)`, 'i');
                  const colMatch = values.match(colRegex);
                  if (colMatch) {
                    const column = stats.columns.find(c => c.name === colName);
                    if (column) {
                      column.stats[statName] = colMatch[1].trim();
                    }
                  }
                });
              }
            });
          }
        }

        if (sectionName.includes("column statistics")) {
          const columnNames = ['Quantity', 'Unit_Price', 'Revenue'];
          
          columnNames.forEach(colName => {
            if (!stats.columns.find(c => c.name === colName)) {
              stats.columns.push({ name: colName, stats: {} });
            }
            
            const column = stats.columns.find(c => c.name === colName);
            if (column) {
              let contentToParse = '';
              if (section.content && section.content.length > 0) {
                contentToParse = section.content.map(item => item.text || item.value || '').join(' ');
              }
              if (rawText) {
                const columnRegex = new RegExp(`${colName}:\\s*- ([^]+?)(?=[A-Z][a-z_]+:|SECTION:|$)`, 'is');
                const columnMatch = rawText.match(columnRegex);
                if (columnMatch) {
                  contentToParse = columnMatch[1] + ' ' + contentToParse;
                }
              }
              
              if (contentToParse) {
                const statRegex = /- ([^:]+):\s*([^\n-]+)/g;
                let statMatch;
                while ((statMatch = statRegex.exec(contentToParse)) !== null) {
                  const statKey = statMatch[1].trim();
                  const statValue = statMatch[2].trim();
                  if (statKey && statValue && statValue.length < 200) {
                    if (!column.stats[statKey]) {
                      column.stats[statKey] = statValue;
                    }
                  }
                }
              }
            }
          });
        }

        if (sectionName.includes("distribution analysis")) {
          if (rawText) {
            const distSection = rawText.match(/SECTION:\s*Distribution Analysis([^]+?)(?=SECTION:|$)/is);
            if (distSection) {
              const bulletRegex = /- ([^\n]+)/g;
              let bulletMatch;
              while ((bulletMatch = bulletRegex.exec(distSection[1])) !== null) {
                stats.distributionAnalysis.push({
                  type: 'bullet',
                  text: bulletMatch[1].trim()
                });
              }
            }
          }
          if (section.content) {
            section.content.forEach(item => {
              if (item.type === 'bullet' || item.type === 'text') {
                stats.distributionAnalysis.push({
                  type: 'bullet',
                  text: item.text || item.value || ''
                });
              }
            });
          }
        }

        if (sectionName.includes("comparative statistics")) {
          if (rawText) {
            const compSection = rawText.match(/SECTION:\s*Comparative Statistics([^]+?)(?=SECTION:|$)/is);
            if (compSection) {
              const bulletRegex = /- ([^\n]+)/g;
              let bulletMatch;
              while ((bulletMatch = bulletRegex.exec(compSection[1])) !== null) {
                stats.comparativeStats.push({
                  type: 'bullet',
                  text: bulletMatch[1].trim()
                });
              }
            }
          }
          if (section.content) {
            section.content.forEach(item => {
              if (item.type === 'bullet' || item.type === 'text') {
                stats.comparativeStats.push({
                  type: 'bullet',
                  text: item.text || item.value || ''
                });
              }
            });
          }
        }
      });
    }

    console.log('[CSVStatisticalAnalysis] Extracted stats:', stats);
    console.log('[CSVStatisticalAnalysis] Columns found:', stats.columns.length);
    console.log('[CSVStatisticalAnalysis] Columns:', stats.columns);
    console.log('[CSVStatisticalAnalysis] Distribution insights:', stats.distributionAnalysis.length);
    return stats;
  };

  const statisticalData = extractStatisticalData();

  const formatNumber = (value) => {
    if (!value || value === "N/A") return "N/A";
    const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderStatCard = (column) => {
    const stats = column.stats || {};
    const statItems = [
      { label: "Mean", value: stats.Mean || stats["Mean"] || stats["mean"] },
      { label: "Median", value: stats.Median || stats["Median"] || stats["median"] },
      { label: "Mode", value: stats.Mode || stats["Mode"] || stats["mode"] },
      { label: "Std Dev", value: stats["Std Dev"] || stats["Standard Deviation"] || stats["standard deviation"] },
      { label: "Min", value: stats.Min || stats["Min"] || stats["min"] },
      { label: "Max", value: stats.Max || stats["Max"] || stats["max"] },
      { label: "25th Percentile", value: stats["Q1 (25th Percentile)"] || stats["25th Percentile"] || stats["25th percentile"] },
      { label: "75th Percentile", value: stats["Q3 (75th Percentile)"] || stats["75th Percentile"] || stats["75th percentile"] },
    ].filter(item => item.value);

    return (
      <div key={column.name} className={styles.statCard}>
        <h3 className={styles.statCardTitle}>{column.name}</h3>
        <div className={styles.statGrid}>
          {statItems.map((item, idx) => (
            <div key={idx} className={styles.statItem}>
              <span className={styles.statLabel}>{item.label}</span>
              <span className={styles.statValue}>{formatNumber(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const createHistogramData = (column) => {
    const stats = column.stats || {};
    const min = parseFloat(stats.Min || stats["Min"] || stats["min"] || 0);
    const max = parseFloat(stats.Max || stats["Max"] || stats["max"] || 100);
    const mean = parseFloat(stats.Mean || stats["Mean"] || stats["mean"] || 0);
    const stdDev = parseFloat(stats["Std Dev"] || stats["Standard Deviation"] || stats["standard deviation"] || 0);
    
    if (isNaN(min) || isNaN(max) || isNaN(mean) || isNaN(stdDev)) {
      return null;
    }

    const range = max - min;
    const bins = 10;
    const binWidth = range / bins;
    
    const labels = [];
    const data = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + (i * binWidth);
      const binEnd = binStart + binWidth;
      labels.push(`${formatNumber(binStart)}-${formatNumber(binEnd)}`);
      
      const binCenter = (binStart + binEnd) / 2;
      const distanceFromMean = Math.abs(binCenter - mean);
      const normalizedDistance = distanceFromMean / (stdDev || 1);
      const frequency = Math.exp(-0.5 * normalizedDistance * normalizedDistance) * 100;
      data.push(Math.max(5, frequency));
    }

    return { labels, data };
  };

  const createBoxplotData = (column) => {
    const stats = column.stats || {};
    const min = parseFloat(stats.Min || stats["Min"] || stats["min"] || 0);
    const q1 = parseFloat(stats["Q1 (25th Percentile)"] || stats["25th Percentile"] || stats["25th percentile"] || 0);
    const median = parseFloat(stats.Median || stats["Median"] || stats["median"] || 0);
    const q3 = parseFloat(stats["Q3 (75th Percentile)"] || stats["75th Percentile"] || stats["75th percentile"] || 0);
    const max = parseFloat(stats.Max || stats["Max"] || stats["max"] || 100);
    
    if (isNaN(min) || isNaN(q1) || isNaN(median) || isNaN(q3) || isNaN(max)) {
      return null;
    }

    return { min, q1, median, q3, max };
  };

  const renderBoxplot = (column) => {
    const boxData = createBoxplotData(column);
    if (!boxData) return null;

    const { min, q1, median, q3, max } = boxData;
    const range = max - min;
    const width = 200;
    const height = 120;
    const padding = 20;
    
    const scale = (value) => padding + ((value - min) / range) * (width - 2 * padding);
    
    const q1Pos = scale(q1);
    const medianPos = scale(median);
    const q3Pos = scale(q3);
    const boxWidth = q3Pos - q1Pos;
    const boxHeight = 40;
    const boxY = (height - boxHeight) / 2;

    return (
      <svg width={width} height={height} className={styles.boxplotSvg}>
        <line x1={scale(min)} y1={boxY + boxHeight / 2} x2={scale(q1)} y2={boxY + boxHeight / 2} stroke="var(--primary-color)" strokeWidth="2" />
        <rect x={q1Pos} y={boxY} width={boxWidth} height={boxHeight} fill="rgba(16, 185, 129, 0.2)" stroke="var(--primary-color)" strokeWidth="2" />
        <line x1={medianPos} y1={boxY} x2={medianPos} y2={boxY + boxHeight} stroke="var(--primary-color)" strokeWidth="2" />
        <line x1={scale(q3)} y1={boxY + boxHeight / 2} x2={scale(max)} y2={boxY + boxHeight / 2} stroke="var(--primary-color)" strokeWidth="2" />
        <line x1={scale(min)} y1={boxY + boxHeight / 2 - 5} x2={scale(min)} y2={boxY + boxHeight / 2 + 5} stroke="var(--primary-color)" strokeWidth="2" />
        <line x1={scale(max)} y1={boxY + boxHeight / 2 - 5} x2={scale(max)} y2={boxY + boxHeight / 2 + 5} stroke="var(--primary-color)" strokeWidth="2" />
        <text x={scale(min)} y={height - 5} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">{formatNumber(min)}</text>
        <text x={scale(median)} y={boxY - 5} textAnchor="middle" fill="var(--primary-color)" fontSize="10" fontWeight="bold">{formatNumber(median)}</text>
        <text x={scale(max)} y={height - 5} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">{formatNumber(max)}</text>
      </svg>
    );
  };

  const renderDistributionCharts = () => {
    if (!statisticalData.columns || statisticalData.columns.length === 0) {
      return null;
    }

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
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(229, 231, 235, 0.1)",
          },
          ticks: {
            color: "#9ca3af",
            font: {
              size: 11,
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#9ca3af",
            font: {
              size: 10,
            },
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
    };

    return (
      <div className={styles.chartsSection}>
        <h3 className={styles.sectionTitle}>Distribution Visualizations</h3>
        <div className={styles.chartsGrid}>
          {statisticalData.columns.map((column) => {
            const histogramData = createHistogramData(column);
            const boxData = createBoxplotData(column);

            return (
              <div key={column.name} className={styles.chartCard}>
                <h4 className={styles.chartTitle}>{column.name} Distribution</h4>
                
                {histogramData ? (
                  <div className={styles.histogramContainer}>
                    <Bar
                      data={{
                        labels: histogramData.labels,
                        datasets: [
                          {
                            data: histogramData.data,
                            backgroundColor: "rgba(16, 185, 129, 0.6)",
                            borderColor: "#10b981",
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                ) : (
                  <div className={styles.chartPlaceholder}>
                    <FontAwesomeIcon icon={faChartBar} className={styles.chartIcon} />
                    <p>Histogram data not available</p>
                  </div>
                )}

                {boxData ? (
                  <div className={styles.boxplotContainer}>
                    {renderBoxplot(column)}
                  </div>
                ) : (
                  <div className={styles.chartPlaceholder}>
                    <FontAwesomeIcon icon={faChartLine} className={styles.chartIcon} />
                    <p>Boxplot data not available</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDistributionInsights = () => {
    if (!statisticalData.distributionAnalysis || statisticalData.distributionAnalysis.length === 0) {
      return null;
    }

    return (
      <div className={styles.insightsSection}>
        <h3 className={styles.sectionTitle}>Distribution Summary Insights</h3>
        <div className={styles.insightsCard}>
          <ul className={styles.insightsList}>
            {statisticalData.distributionAnalysis.map((item, idx) => {
              if (item.type === "bullet" && item.text) {
                return (
                  <li key={idx} className={styles.insightItem}>
                    <span className={styles.bulletPoint}>•</span>
                    <span>{item.text}</span>
                  </li>
                );
              } else if (item.type === "text" && item.text) {
                return (
                  <li key={idx} className={styles.insightItem}>
                    <span className={styles.bulletPoint}>•</span>
                    <span>{item.text}</span>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      </div>
    );
  };

  const renderComparativeStatistics = () => {
    if (!statisticalData.comparativeStats || statisticalData.comparativeStats.length === 0) {
      return null;
    }

    return (
      <div className={styles.insightsSection}>
        <h3 className={styles.sectionTitle}>Comparative Statistics</h3>
        <div className={styles.insightsCard}>
          <ul className={styles.insightsList}>
            {statisticalData.comparativeStats.map((item, idx) => {
              if (item.type === "bullet" && item.text) {
                return (
                  <li key={idx} className={styles.insightItem}>
                    <span className={styles.bulletPoint}>•</span>
                    <span>{item.text}</span>
                  </li>
                );
              } else if (item.type === "text" && item.text) {
                return (
                  <li key={idx} className={styles.insightItem}>
                    <span className={styles.bulletPoint}>•</span>
                    <span>{item.text}</span>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faCalculator} />
        </div>
        <div>
          <h2 className={styles.title}>Statistical Analysis</h2>
          <p className={styles.subtitle}>Means, medians, distributions</p>
        </div>
      </div>

      <div className={styles.statCardsSection}>
        <h3 className={styles.sectionTitle}>Summary Statistics</h3>
        <div className={styles.statCardsContainer}>
          {statisticalData.columns.length > 0 ? (
            statisticalData.columns.map((column) => renderStatCard(column))
          ) : (
            <div className={styles.emptyState}>
              <p>No statistical data available for numeric columns</p>
              <details style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <summary style={{ cursor: 'pointer' }}>Debug Info</summary>
                <pre style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--background-color)', borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: '300px' }}>
                  {JSON.stringify(statisticalData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {renderDistributionCharts()}
      {renderDistributionInsights()}
      {renderComparativeStatistics()}
    </div>
  );
};

export default CSVStatisticalAnalysis;

