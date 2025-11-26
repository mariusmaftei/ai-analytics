import React from "react";
import styles from "./ImageChartAnalysis.module.css";

const ImageChartAnalysis = ({ data = {}, rawText = "" }) => {
  const sections = data?.sections || [];
  const chartType = sections.find((section) =>
    section?.name?.toLowerCase().includes("chart type") ||
    section?.name?.toLowerCase().includes("visual")
  );
  const axes = sections.find((section) =>
    section?.name?.toLowerCase().includes("axis") ||
    section?.name?.toLowerCase().includes("axes")
  );
  const dataPoints = sections.find((section) =>
    section?.name?.toLowerCase().includes("data point") ||
    section?.name?.toLowerCase().includes("values")
  );
  const insights = sections.find((section) =>
    section?.name?.toLowerCase().includes("insight") ||
    section?.name?.toLowerCase().includes("trend")
  );
  const accuracy = sections.find((section) =>
    section?.name?.toLowerCase().includes("accuracy") ||
    section?.name?.toLowerCase().includes("warning")
  );

  const renderList = (items = []) => (
    <ul className={styles.list}>
      {items.map((item, idx) => (
        <li key={`${item.label || item.value || idx}-${idx}`}>
          <span className={styles.marker}></span>
          <div>
            {item.label && <strong>{item.label}: </strong>}
            <span>{item.value || item.text || item.description}</span>
          </div>
        </li>
      ))}
    </ul>
  );

  const hasStructured =
    chartType || axes || dataPoints || insights || accuracy;

  if (!hasStructured && !rawText.trim()) {
    return <div className={styles.emptyState}>No chart analysis available yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Chart Analysis</h3>
        <p>Chart type, axes, data points, and reported insights</p>
      </div>

      <div className={styles.grid}>
        {chartType && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>{chartType.name}</h4>
              <span>Visualization style</span>
            </div>
            {chartType.items?.length
              ? renderList(chartType.items)
              : <p className={styles.cardText}>{chartType.text}</p>}
          </div>
        )}

        {axes && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>{axes.name}</h4>
              <span>Axis labels and units</span>
            </div>
            {axes.items?.length
              ? renderList(axes.items)
              : <p className={styles.cardText}>{axes.text}</p>}
          </div>
        )}

        {dataPoints && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>{dataPoints.name}</h4>
              <span>Values traced on the chart</span>
            </div>
            {dataPoints.items?.length ? (
              <div className={styles.dataList}>
                {dataPoints.items.map((item, idx) => (
                  <div className={styles.dataRow} key={`${item.label || idx}-${idx}`}>
                    <span>{item.label || item.name || `Point ${idx + 1}`}</span>
                    <span>{item.value || item.text || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.cardText}>{dataPoints.text}</p>
            )}
          </div>
        )}

        {insights && (
          <div className={styles.fullCard}>
            <div className={styles.cardHeader}>
              <h4>{insights.name}</h4>
              <span>Narrative and key takeaways</span>
            </div>
            {insights.items?.length
              ? renderList(insights.items)
              : <p className={styles.cardText}>{insights.text}</p>}
          </div>
        )}

        {accuracy && (
          <div className={styles.alertCard}>
            <div className={styles.cardHeader}>
              <h4>{accuracy.name}</h4>
              <span>Warnings or limited fidelity</span>
            </div>
            {accuracy.items?.length
              ? renderList(accuracy.items)
              : <p className={styles.cardText}>{accuracy.text}</p>}
          </div>
        )}
      </div>

      {!hasStructured && rawText.trim() && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>AI Notes</h4>
            <span>Raw response preview</span>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageChartAnalysis;


