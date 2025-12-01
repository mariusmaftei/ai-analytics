import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faArrowUp,
  faArrowDown,
  faMinus,
  faEquals,
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
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./CSVTrendsAnalysis.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CSVTrendsAnalysis = ({ data, rawText }) => {
  console.log("CSVTrendsAnalysis received data:", data);
  console.log("CSVTrendsAnalysis rawText:", rawText);

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No trends analysis data available</p>
        </div>
      </div>
    );
  }

  const getTrendDirection = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("increasing") || lower.includes("upward") || lower.includes("growth") || lower.includes("rising")) {
      return { direction: "up", icon: faArrowUp, color: "#10b981", label: "Upward" };
    }
    if (lower.includes("decreasing") || lower.includes("downward") || lower.includes("decline") || lower.includes("falling")) {
      return { direction: "down", icon: faArrowDown, color: "#ef4444", label: "Downward" };
    }
    return { direction: "stable", icon: faMinus, color: "#6b7280", label: "Stable" };
  };

  const extractTrendsData = () => {
    const trends = {
      temporalTrends: [],
      valueTrends: [],
      comparativeTrends: [],
      trendAnalysis: [],
      businessTrends: [],
      summary: [],
    };

    if (!rawText) {
      return trends;
    }

    const sections = rawText.split(/SECTION:|Temporal Trends:|Value Trends:|Comparative Trends:|Trend Analysis:|Business Trends:|Trends Summary:/i);

    sections.forEach((section, index) => {
      const sectionText = section.trim();
      if (!sectionText) return;

      const lowerSection = sectionText.toLowerCase();

      if (lowerSection.includes("temporal") || index === 1) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.temporalTrends = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("value trends") || index === 2) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.valueTrends = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("comparative") || index === 3) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.comparativeTrends = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("trend analysis") || index === 4) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.trendAnalysis = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("business") || index === 5) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.businessTrends = bullets.map(b => b.replace(/^- /, "").trim());
      }

      if (lowerSection.includes("summary") || lowerSection.includes("overall")) {
        const bullets = sectionText.match(/- ([^\n]+)/g) || [];
        trends.summary = bullets.map(b => b.replace(/^- /, "").trim());
      }
    });

    if (data.sections) {
      data.sections.forEach((section) => {
        const sectionName = (section.name || "").toLowerCase();
        if (section.content) {
          section.content.forEach((item) => {
            const text = (item.text || item.value || "").trim();
            if (!text) return;

            if (sectionName.includes("temporal")) {
              if (!trends.temporalTrends.includes(text)) {
                trends.temporalTrends.push(text);
              }
            } else if (sectionName.includes("value")) {
              if (!trends.valueTrends.includes(text)) {
                trends.valueTrends.push(text);
              }
            } else if (sectionName.includes("comparative")) {
              if (!trends.comparativeTrends.includes(text)) {
                trends.comparativeTrends.push(text);
              }
            } else if (sectionName.includes("trend analysis")) {
              if (!trends.trendAnalysis.includes(text)) {
                trends.trendAnalysis.push(text);
              }
            } else if (sectionName.includes("business")) {
              if (!trends.businessTrends.includes(text)) {
                trends.businessTrends.push(text);
              }
            } else if (sectionName.includes("summary")) {
              if (!trends.summary.includes(text)) {
                trends.summary.push(text);
              }
            }
          });
        }
      });
    }

    return trends;
  };

  const trendsData = extractTrendsData();

  const createLineChartData = (title, dataPoints) => {
    const labels = dataPoints.map((_, idx) => `Day ${idx + 1}`);
    const values = dataPoints.map((val, idx) => {
      if (typeof val === 'number') return val;
      const numMatch = val.toString().match(/[\d.]+/);
      return numMatch ? parseFloat(numMatch[0]) : idx * 10;
    });

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Rolling Average",
          data: calculateRollingAverage(values, 3),
          borderColor: "#06b6d4",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    };
  };

  const calculateRollingAverage = (data, window) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const slice = data.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(avg);
    }
    return result;
  };


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e5e7eb",
          font: {
            size: 12,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#10b981",
        bodyColor: "#e5e7eb",
        borderColor: "#10b981",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
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
            size: 11,
          },
        },
      },
    },
  };

  const renderLineChart = (title, dataPoints) => {
    if (!dataPoints || dataPoints.length === 0) return null;

    const chartData = createLineChartData(title, dataPoints);
    const trend = getTrendDirection(title);

    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{title} Over Time</h3>
          <div className={styles.trendBadge} style={{ backgroundColor: trend.color + "20", color: trend.color }}>
            <FontAwesomeIcon icon={trend.icon} />
            <span>{trend.label}</span>
          </div>
        </div>
        <div className={styles.lineChartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  };

  const renderTrendsSummary = () => {
    if (!trendsData.summary || trendsData.summary.length === 0) {
      return null;
    }

    return (
      <div className={styles.summaryCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={faChartLine} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>Trends Summary</h3>
        </div>
        <ul className={styles.summaryList}>
          {trendsData.summary.map((item, idx) => {
            const trend = getTrendDirection(item);
            return (
              <li key={idx} className={styles.summaryItem}>
                <div className={styles.summaryTrend}>
                  <FontAwesomeIcon icon={trend.icon} style={{ color: trend.color }} />
                </div>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderTrendSection = (title, items, icon) => {
    if (!items || items.length === 0) return null;

    return (
      <div className={styles.trendSectionCard}>
        <div className={styles.cardHeader}>
          <FontAwesomeIcon icon={icon} className={styles.cardIcon} />
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        <ul className={styles.trendList}>
          {items.map((item, idx) => {
            const trend = getTrendDirection(item);
            return (
              <li key={idx} className={styles.trendItem}>
                <div className={styles.trendArrow} style={{ color: trend.color }}>
                  <FontAwesomeIcon icon={trend.icon} />
                </div>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const hasAnyData = 
    trendsData.temporalTrends.length > 0 ||
    trendsData.valueTrends.length > 0 ||
    trendsData.comparativeTrends.length > 0 ||
    trendsData.trendAnalysis.length > 0 ||
    trendsData.businessTrends.length > 0 ||
    trendsData.summary.length > 0;

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div>
            <h2 className={styles.title}>Trends Analysis</h2>
            <p className={styles.subtitle}>Time-based trends and changes</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No trends data available</p>
        </div>
      </div>
    );
  }

  const sampleData = [100, 120, 110, 140, 130, 150, 145, 160, 155, 170];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faChartLine} />
        </div>
        <div>
          <h2 className={styles.title}>Trends Analysis</h2>
          <p className={styles.subtitle}>Time-based trends and changes</p>
        </div>
      </div>

      {renderTrendsSummary()}

      <div className={styles.chartsSection}>
        <h3 className={styles.sectionTitle}>Trend Visualizations</h3>
        <div className={styles.chartsGrid}>
          {renderLineChart("Revenue", sampleData)}
          {renderLineChart("Quantity", sampleData.map(v => v / 10))}
          {renderLineChart("Unit Price", sampleData.map(v => v * 2))}
        </div>
      </div>

      <div className={styles.trendsGrid}>
        {renderTrendSection("Temporal Trends", trendsData.temporalTrends, faArrowUp)}
        {renderTrendSection("Value Trends", trendsData.valueTrends, faChartLine)}
        {renderTrendSection("Comparative Trends", trendsData.comparativeTrends, faArrowDown)}
        {renderTrendSection("Trend Analysis", trendsData.trendAnalysis, faEquals)}
        {renderTrendSection("Business Trends", trendsData.businessTrends, faChartLine)}
      </div>
    </div>
  );
};

export default CSVTrendsAnalysis;

