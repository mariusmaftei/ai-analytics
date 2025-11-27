import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import styles from "./ImageChartAnalysis.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const parseJsonFromRaw = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") return null;
  const trimmed = rawText.trim();
  const looksLikeJson =
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("```");
  if (!looksLikeJson) {
    return null;
  }
  try {
    let jsonText = trimmed;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/```json?/gi, "")
        .replace(/```/g, "")
        .trim();
    }
    return JSON.parse(jsonText);
  } catch (err) {
    console.debug("[ImageChartAnalysis] Failed to parse structured JSON:", err);
    return null;
  }
};

const convertJsonToSections = (jsonData) => {
  if (!jsonData || typeof jsonData !== "object") return [];
  if (jsonData.chartPresent === false) return [];
  const sections = [];

  if (jsonData.summary) {
    sections.push({
      name: "Chart Summary",
      text: jsonData.summary,
      items: [],
    });
  }

  if (jsonData.chartType && Object.keys(jsonData.chartType).length) {
    sections.push({
      name: "Chart Type & Structure",
      items: Object.entries(jsonData.chartType).map(([key, value]) => ({
        id: `chart-type-${key}`,
        label: key,
        value,
      })),
    });
  }

  if (jsonData.axes && Object.keys(jsonData.axes).length) {
    sections.push({
      name: "Axes & Labels",
      items: Object.entries(jsonData.axes).map(([key, value]) => ({
        id: `axes-${key}`,
        label: key,
        value,
      })),
    });
  }

  if (jsonData.dataPoints?.length) {
    const lines = jsonData.dataPoints.map((point, idx) => {
      const category =
        point.Category ||
        point.category ||
        point.Label ||
        point.label ||
        `Point ${idx + 1}`;
      const value = point.Value || point.value || point.Amount || point.amount || "Unknown";
      const percent = point.Percent || point.percent || "N/A";
      const delta = point.Delta || point.delta || "N/A";
      return `Category: ${category} | Value: ${value} | Percent: ${percent} | Delta: ${delta}`;
    });

    sections.push({
      name: "Extracted Data Points",
      items: lines.map((line, idx) => ({
        id: `json-data-${idx}`,
        value: line,
      })),
      text: lines.join("\n"),
    });
  }

  if (jsonData.insights?.length) {
    sections.push({
      name: "AI Insights",
      items: jsonData.insights.map((text, idx) => ({
        id: `json-insight-${idx}`,
        value: text,
      })),
    });
  }

  if (jsonData.structure && Object.keys(jsonData.structure).length) {
    sections.push({
      name: "Chart Structure",
      items: Object.entries(jsonData.structure).map(([key, value], idx) => ({
        id: `structure-${key}-${idx}`,
        label: key,
        value: Array.isArray(value) ? value.join(", ") : value,
      })),
    });
  }

  if (jsonData.confidence && Object.keys(jsonData.confidence).length) {
    sections.push({
      name: "Confidence & Quality",
      items: Object.entries(jsonData.confidence).map(([key, value]) => ({
        id: `confidence-${key}`,
        label: key,
        value,
      })),
    });
  }

  return sections;
};

const normalizeText = (section) =>
  section?.text?.trim() || section?.items?.[0]?.value || "";

const extractField = (section, keywords = []) => {
  if (!section) return "";
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const match =
    section.items?.find((item) => {
      const label = (item.label || item.key || "").toLowerCase();
      return lowerKeywords.some((k) => label.includes(k));
    }) || section.items?.[0];
  return match?.value || match?.text || normalizeText(section);
};

const parseDataRows = (section) => {
  if (!section) return [];

  const parseEntry = (item, idx) => {
    const label =
      item.label || item.key || item.name || `Series ${idx + 1}`;
    const raw =
      (item.value || item.text || item.description || "").trim();

    if (!label && !raw) return null;

    const detailMap = {};
    if (raw.includes("|")) {
      raw.split("|").forEach((segment) => {
        const [key, ...rest] = segment.split(":");
        if (rest.length) {
          detailMap[key.trim().toLowerCase()] = rest.join(":").trim();
        }
      });
    }

    const percentMatch = raw.match(/(-?\d+(?:\.\d+)?)\s*%/);
    const deltaMatch = raw.match(/([+-]\s?\d+(?:\.\d+)?%?)/);
    const numericMatch = raw
      .replace(percentMatch?.[0] || "", "")
      .match(/-?\d[\d,]*(?:\.\d+)?/);
    const numericValue = numericMatch
      ? Number(numericMatch[0].replace(/,/g, ""))
      : null;

    const valueText =
      detailMap.value ||
      detailMap.amount ||
      (numericMatch ? numericMatch[0] : "") ||
      raw;

    return {
      id: item.id || `${label}-${idx}`,
      category: label,
      rawText: raw,
      valueText: valueText?.trim() || "—",
      percentText:
        detailMap.percent || (percentMatch ? `${percentMatch[1]}%` : ""),
      deltaText: detailMap.delta || deltaMatch?.[0] || "",
      numericValue,
    };
  };

  const itemRows =
    section.items?.map((item, idx) => parseEntry(item, idx)).filter(Boolean) ||
    [];

  if (itemRows.length) return itemRows;

  return section.text
    ?.split("\n")
    .map((line, idx) => {
      const [label, ...rest] = line.split(/[:\-–]/);
      if (!rest.length) return null;
      return parseEntry(
        {
          label: label.trim(),
          value: rest.join(":").trim(),
        },
        idx
      );
    })
    .filter(Boolean);
};

const buildChartData = (rows, chartTypeHint = "") => {
  const numericRows = rows.filter(
    (row) => typeof row.numericValue === "number"
  );
  if (!numericRows.length) return null;

  const labels = numericRows.map((row) => row.category);
  const dataValues = numericRows.map((row) => row.numericValue);

  const palette = [
    "#38bdf8",
    "#34d399",
    "#f87171",
    "#fbbf24",
    "#c084fc",
    "#f472b6",
    "#60a5fa",
  ];

  const chartType = (() => {
    const lower = chartTypeHint.toLowerCase();
    if (lower.includes("line")) return "line";
    if (lower.includes("pie") || lower.includes("donut"))
      return "doughnut";
    return "bar";
  })();

  const dataset = {
    label: "Extracted Values",
    data: dataValues,
    backgroundColor: labels.map(
      (_, idx) => palette[idx % palette.length]
    ),
    borderColor: "#0f172a",
    borderWidth: chartType === "line" ? 2 : 1,
    tension: 0.4,
  };

  return {
    type: chartType,
    data: {
      labels,
      datasets: [dataset],
    },
  };
};

const ImageChartAnalysis = ({ data = {}, rawText = "" }) => {
  const structuredJson = useMemo(() => parseJsonFromRaw(rawText), [rawText]);
  const jsonSections = useMemo(
    () => convertJsonToSections(structuredJson),
    [structuredJson]
  );
  const sections = jsonSections.length ? jsonSections : data?.sections || [];
  const structuredSummary = structuredJson?.summary || "";
  const noChartDetected = structuredJson?.chartPresent === false;
  const hasSections = sections.length > 0;

  const findSection = (keywords = []) =>
    sections.find((section) => {
      const name = section?.name?.toLowerCase() || "";
      return keywords.some((keyword) => name.includes(keyword));
    });

  const summarySection = findSection(["summary", "overview"]);
  const chartTypeSection = findSection(["chart type", "visual"]);
  const axesSection = findSection(["axis", "axes"]);
  const pointsSection = findSection(["data point", "values", "series"]);
  const insightsSection = findSection(["insight", "interpretation", "trend"]);
  const accuracySection = findSection(["accuracy", "quality", "confidence"]);

  const summaryText = summarySection
    ? normalizeText(summarySection)
    : structuredSummary;
  const displaySummary =
    summaryText ||
    "The model has not provided a chart-specific summary for this image.";

  const dataRows = useMemo(
    () => parseDataRows(pointsSection),
    [pointsSection]
  );

  const chartData = useMemo(
    () =>
      buildChartData(
        dataRows,
        extractField(chartTypeSection, ["chart type", "type"])
      ),
    [dataRows, chartTypeSection]
  );

  const summaryMetrics = [
    {
      label: "Chart Type",
      value:
        extractField(chartTypeSection, ["chart type", "visual"]) || "—",
    },
    {
      label: "Data Points Identified",
      value: dataRows.length ? dataRows.length : "—",
    },
    {
      label: "Confidence",
      value:
        extractField(accuracySection, ["confidence"]) ||
        extractField(chartTypeSection, ["confidence"]) ||
        "Unknown",
    },
  ];

  const structureDetails = [
    {
      label: "Chart Type",
      value:
        extractField(chartTypeSection, ["chart type", "style"]) || "—",
    },
    {
      label: "X-Axis",
      value: extractField(axesSection, ["x-axis", "horizontal"]) || "—",
    },
    {
      label: "Y-Axis",
      value: extractField(axesSection, ["y-axis", "vertical"]) || "—",
    },
    {
      label: "Axis Labels",
      value:
        extractField(axesSection, ["labels", "axis labels"]) || "Not detected",
    },
  ].filter((entry) => entry.value && entry.value !== "—");

  const insightsList =
    insightsSection?.items?.map((item, idx) => ({
      id: item.id || idx,
      text: item.value || item.text || item.description,
    })) ||
    insightsSection?.text
      ?.split("\n")
      .filter(Boolean)
      .map((line, idx) => ({ id: idx, text: line.trim() })) ||
    [];

  const confidenceMetrics =
    accuracySection?.items?.map((item, idx) => ({
      id: item.id || idx,
      label: item.label || item.key || `Metric ${idx + 1}`,
      value: item.value || item.text || "—",
    })) ||
    [];

  const hasStructured =
    !!summarySection ||
    dataRows.length > 0 ||
    insightsList.length > 0 ||
    structureDetails.length > 0 ||
    confidenceMetrics.length > 0 ||
    !!chartData;

  if (!hasSections) {
    const trimmedRaw = rawText?.trim();
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Visual Analytics</p>
            <h3>Chart Analysis</h3>
          </div>
          <p>Awaiting structured chart details</p>
        </header>
        <div className={styles.emptyState}>
          {trimmedRaw ? (
            <>
              <p>
                {noChartDetected
                  ? structuredSummary ||
                    "The model indicated there is no chart in this image."
                  : "The model did not return chart-specific data for this image."}
              </p>
              <div className={styles.rawCard}>
                <div className={styles.cardHeader}>
                  <h4>Model Response</h4>
                </div>
                <pre className={styles.rawText}>{trimmedRaw}</pre>
              </div>
            </>
          ) : (
            "No chart analysis available yet."
          )}
        </div>
      </div>
    );
  }
  if (!hasStructured && !rawText.trim()) {
    return (
      <div className={styles.emptyState}>
        No chart analysis available yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Visual Analytics</p>
          <h3>Chart Analysis</h3>
        </div>
        <p>Structure, extracted data, and AI interpretation</p>
      </header>

      <section className={styles.summaryBanner}>
        <div className={styles.summaryTextBlock}>
          <span>Chart Summary</span>
          <p>{displaySummary}</p>
        </div>
        <div className={styles.summaryMetrics}>
          {summaryMetrics.map((metric) => (
            <div className={styles.metric} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.primaryColumn}>
          <div className={styles.dataTableCard}>
            <div className={styles.cardHeader}>
              <h4>Extracted Data</h4>
              <span>Category · Value · % / Delta</span>
            </div>
            {dataRows.length ? (
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Value</th>
                      <th>% / Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.category}</td>
                        <td>{row.valueText}</td>
                        <td>
                          {row.percentText || row.deltaText || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.cardText}>
                Structured data points were not detected.
              </p>
            )}
          </div>

          {chartData && (
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>
                <h4>Reconstructed Chart</h4>
                <span>Generated from extracted values</span>
              </div>
              <div className={styles.chartCanvas}>
                {chartData.type === "line" && (
                  <Line
                    data={chartData.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
                {chartData.type === "doughnut" && (
                  <Doughnut
                    data={chartData.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
                {chartData.type === "bar" && (
                  <Bar
                    data={chartData.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.secondaryColumn}>
          <div className={styles.insightsCard}>
            <div className={styles.cardHeader}>
              <h4>AI Interpretation</h4>
              <span>Key takeaways</span>
            </div>
            {insightsList.length ? (
              <ul className={styles.list}>
                {insightsList.map((insight) => (
                  <li key={insight.id}>{insight.text}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.cardText}>
                No narrative insights were provided.
              </p>
            )}
          </div>

          <div className={styles.structureCard}>
            <div className={styles.cardHeader}>
              <h4>Chart Structure</h4>
              <span>What the model detected</span>
            </div>
            {structureDetails.length ? (
              <ul className={styles.detailList}>
                {structureDetails.map((entry) => (
                  <li key={entry.label}>
                    <span>{entry.label}</span>
                    <p>{entry.value}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.cardText}>
                No structural details detected.
              </p>
            )}
          </div>

          <div className={styles.confidenceCard}>
            <div className={styles.cardHeader}>
              <h4>Confidence & Quality</h4>
              <span>Extraction fidelity</span>
            </div>
            {confidenceMetrics.length ? (
              <div className={styles.metricsGrid}>
                {confidenceMetrics.map((metric) => (
                  <div key={metric.id}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.cardText}>
                No quality indicators were provided.
              </p>
            )}
          </div>
        </div>
      </section>

      {!hasStructured && rawText.trim() && (
        <div className={styles.rawCard}>
          <div className={styles.cardHeader}>
            <h4>Raw Model Output</h4>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageChartAnalysis;


