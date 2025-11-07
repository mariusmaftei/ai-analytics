import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faChartBar, faChartPie } from "@fortawesome/free-solid-svg-icons";
import styles from "./ChartDisplay.module.css";

const ChartDisplay = ({ analysisData }) => {
  if (!analysisData.hasNumericData) {
    return null;
  }

  const renderCSVCharts = () => {
    const { chartData } = analysisData;

    return (
      <>
        {/* Revenue by Month - Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartLine} />
            <h4>Revenue Trend (Monthly)</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.lineChart}>
              {chartData.revenueByMonth.map((item, index) => {
                const height = (item.revenue / 95432) * 100; // Max height
                return (
                  <div key={index} className={styles.barWrapper}>
                    <div 
                      className={styles.line}
                      style={{ height: `${height}%` }}
                    />
                    <div className={styles.barLabel}>{item.month}</div>
                    <div className={styles.barValue}>
                      ${(item.revenue / 1000).toFixed(0)}K
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.chartNote}>
              📊 In production, this would be an interactive Chart.js line chart
            </p>
          </div>
        </div>

        {/* Revenue by Region - Pie Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartPie} />
            <h4>Revenue by Region</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.pieChart}>
              {chartData.revenueByRegion.map((item, index) => {
                const percentage = (item.revenue / 857151) * 100;
                const colors = ['#10b981', '#06b6d4', '#f59e0b'];
                return (
                  <div key={index} className={styles.pieItem}>
                    <div 
                      className={styles.pieColor}
                      style={{ backgroundColor: colors[index] }}
                    />
                    <div className={styles.pieLabel}>
                      {item.region}: ${(item.revenue / 1000).toFixed(0)}K ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.chartNote}>
              📊 In production, this would be an interactive pie chart
            </p>
          </div>
        </div>

        {/* Top Products - Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartBar} />
            <h4>Top Products by Volume</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.barChart}>
              {chartData.topProducts.map((item, index) => {
                const width = (item.count / 456) * 100;
                return (
                  <div key={index} className={styles.barRow}>
                    <div className={styles.barRowLabel}>{item.product}</div>
                    <div className={styles.barRowBar}>
                      <div 
                        className={styles.barRowFill}
                        style={{ width: `${width}%` }}
                      />
                      <span className={styles.barRowValue}>{item.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.chartNote}>
              📊 In production, this would be an interactive bar chart
            </p>
          </div>
        </div>
      </>
    );
  };

  const renderJSONCharts = () => {
    const { chartData } = analysisData;

    return (
      <>
        {/* Users by Status - Pie Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartPie} />
            <h4>Users by Status</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.pieChart}>
              {chartData.usersByStatus.map((item, index) => {
                const percentage = (item.count / 342) * 100;
                const colors = ['#10b981', '#ef4444', '#f59e0b'];
                return (
                  <div key={index} className={styles.pieItem}>
                    <div 
                      className={styles.pieColor}
                      style={{ backgroundColor: colors[index] }}
                    />
                    <div className={styles.pieLabel}>
                      {item.status}: {item.count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.chartNote}>
              📊 In production, this would be an interactive pie chart
            </p>
          </div>
        </div>

        {/* Spending Distribution - Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartBar} />
            <h4>Spending Distribution</h4>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.barChart}>
              {chartData.spendingDistribution.map((item, index) => {
                const width = (item.count / 134) * 100;
                return (
                  <div key={index} className={styles.barRow}>
                    <div className={styles.barRowLabel}>{item.range}</div>
                    <div className={styles.barRowBar}>
                      <div 
                        className={styles.barRowFill}
                        style={{ width: `${width}%` }}
                      />
                      <span className={styles.barRowValue}>{item.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.chartNote}>
              📊 In production, this would be an interactive bar chart
            </p>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={styles.container}>
      {analysisData.fileType === 'csv' && renderCSVCharts()}
      {analysisData.fileType === 'json' && renderJSONCharts()}
    </div>
  );
};

export default ChartDisplay;

