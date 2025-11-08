import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faChartBar,
  faChartPie,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import styles from "./ChartDisplay.module.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ChartDisplay = ({ analysisData }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  console.log("ChartDisplay rendered with:", analysisData);

  if (!analysisData) {
    return <div className={styles.errorMessage}>No analysis data provided</div>;
  }

  if (!analysisData.hasNumericData) {
    return (
      <div className={styles.errorMessage}>
        No numeric data available for charts
      </div>
    );
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#e5e7eb",
          font: {
            size: 12,
            family: "'Inter', sans-serif",
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
        displayColors: true,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(229, 231, 235, 0.1)",
          drawBorder: false,
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
          drawBorder: false,
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

  const renderCSVCharts = () => {
    const { chartData } = analysisData;

    if (!chartData) {
      return <div className={styles.errorMessage}>No chart data available</div>;
    }

    // Line Chart Data - Revenue by Month
    const lineChartData = {
      labels: chartData.revenueByMonth?.map((item) => item.month) || [],
      datasets: [
        {
          label: "Revenue",
          data: chartData.revenueByMonth?.map((item) => item.revenue) || [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };

    // Doughnut Chart Data - Revenue by Region
    const doughnutChartData = {
      labels: chartData.revenueByRegion?.map((item) => item.region) || [],
      datasets: [
        {
          label: "Revenue",
          data: chartData.revenueByRegion?.map((item) => item.revenue) || [],
          backgroundColor: [
            "#10b981",
            "#06b6d4",
            "#f59e0b",
            "#ec4899",
            "#8b5cf6",
          ],
          borderColor: "#1f2937",
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    };

    // Bar Chart Data - Top Products
    const barChartData = {
      labels: chartData.topProducts?.map((item) => item.product) || [],
      datasets: [
        {
          label: "Volume",
          data: chartData.topProducts?.map((item) => item.count) || [],
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "#10b981",
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: "#10b981",
        },
      ],
    };

    return (
      <>
        {/* Revenue by Month - Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartLine} />
            <h4>Revenue Trend (Monthly)</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartContainer}>
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Revenue by Region - Doughnut Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartPie} />
            <h4>Revenue by Region</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartContainerSmall}>
              <Doughnut
                data={doughnutChartData}
                options={{
                  ...chartOptions,
                  cutout: "65%",
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: "right",
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Top Products - Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartBar} />
            <h4>Top Products by Volume</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartContainer}>
              <Bar
                data={barChartData}
                options={{
                  ...chartOptions,
                  indexAxis: "y",
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderJSONCharts = () => {
    const { chartData } = analysisData;

    if (!chartData) {
      return <div className={styles.errorMessage}>No chart data available</div>;
    }

    // Doughnut Chart Data - Users by Status
    const userStatusChartData = {
      labels: chartData.usersByStatus?.map((item) => item.status) || [],
      datasets: [
        {
          label: "Users",
          data: chartData.usersByStatus?.map((item) => item.count) || [],
          backgroundColor: [
            "#10b981",
            "#ef4444",
            "#f59e0b",
            "#06b6d4",
            "#8b5cf6",
          ],
          borderColor: "#1f2937",
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    };

    // Bar Chart Data - Spending Distribution
    const spendingChartData = {
      labels: chartData.spendingDistribution?.map((item) => item.range) || [],
      datasets: [
        {
          label: "Users",
          data: chartData.spendingDistribution?.map((item) => item.count) || [],
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "#10b981",
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: "#10b981",
        },
      ],
    };

    return (
      <>
        {/* Users by Status - Doughnut Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartPie} />
            <h4>Users by Status</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartContainerSmall}>
              <Doughnut
                data={userStatusChartData}
                options={{
                  ...chartOptions,
                  cutout: "65%",
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: "right",
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Spending Distribution - Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartBar} />
            <h4>Spending Distribution</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartContainer}>
              <Bar data={spendingChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </>
    );
  };

  const fileType = analysisData.fileType?.toLowerCase() || "";
  const chartCount = fileType === "csv" ? 3 : fileType === "json" ? 2 : 0;

  return (
    <div className={styles.container}>
      <div
        className={styles.containerHeader}
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === "Enter" && toggleExpanded()}
      >
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faChartLine} />
        </div>
        <div className={styles.headerContent}>
          <h3 className={styles.containerTitle}>
            📊 Data Visualizations ({chartCount} Charts)
          </h3>
          <p className={styles.containerSubtitle}>
            {isExpanded ? "Click to collapse" : "Click to expand"} • Interactive
            charts from your {analysisData.fileType?.toUpperCase()} data
          </p>
        </div>
        <div className={styles.toggleIcon}>
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
        </div>
      </div>

      {isExpanded && (
        <div className={styles.chartsContent}>
          {fileType === "csv" && renderCSVCharts()}
          {fileType === "json" && renderJSONCharts()}
          {fileType !== "csv" && fileType !== "json" && (
            <div className={styles.errorMessage}>
              Unsupported file type: {analysisData.fileType}. Expected CSV or
              JSON.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartDisplay;
