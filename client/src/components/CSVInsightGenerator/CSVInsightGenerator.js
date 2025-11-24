import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileCsv,
  faChartBar,
  faSearch,
  faChartLine,
  faDatabase,
  faExclamationTriangle,
  faLayerGroup,
  faTable,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parseCSVInsights } from "./utils/csvInsightParser";
import CSVOverview from "../CSVInsightsPreview/CSVOverview/CSVOverview";
import CSVStatisticalAnalysis from "../CSVInsightsPreview/CSVStatisticalAnalysis/CSVStatisticalAnalysis";
import CSVPatternDetection from "../CSVInsightsPreview/CSVPatternDetection/CSVPatternDetection";
import CSVDataQuality from "../CSVInsightsPreview/CSVDataQuality/CSVDataQuality";
import CSVTrendsAnalysis from "../CSVInsightsPreview/CSVTrendsAnalysis/CSVTrendsAnalysis";
import CSVCorrelationAnalysis from "../CSVInsightsPreview/CSVCorrelationAnalysis/CSVCorrelationAnalysis";
import styles from "./CSVInsightGenerator.module.css";

const ANALYSIS_TYPES = [
  {
    id: "overview",
    label: "Overview",
    icon: faTable,
    description: "Summary and basic statistics",
  },
  {
    id: "statistical",
    label: "Statistical Analysis",
    icon: faChartBar,
    description: "Means, medians, distributions",
  },
  {
    id: "patterns",
    label: "Pattern Detection",
    icon: faSearch,
    description: "Identify trends and patterns",
  },
  {
    id: "quality",
    label: "Data Quality",
    icon: faExclamationTriangle,
    description: "Missing values and inconsistencies",
  },
  {
    id: "trends",
    label: "Trends Analysis",
    icon: faChartLine,
    description: "Time-based trends and changes",
  },
  {
    id: "correlation",
    label: "Correlation Analysis",
    icon: faDatabase,
    description: "Relationships between columns",
  },
];

const CSVInsightGenerator = ({ fileData, analysisData }) => {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [parsedInsights, setParsedInsights] = useState(null);
  const [error, setError] = useState(null);

  const selectedType =
    selectedAnalysisType === "all"
      ? {
          id: "all",
          label: "All Analyses",
          icon: faLayerGroup,
          description: "Run all analysis types",
        }
      : ANALYSIS_TYPES.find((type) => type.id === selectedAnalysisType);

  const handleGenerate = async () => {
    if (!analysisData.data || !analysisData.columns) {
      setError("CSV data is not available. Please upload the file again.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setInsights(null);
    setParsedInsights(null);

    try {
      let fullResponse = "";

      await generateInsights(
        {
          fileType: "CSV",
          csvData: analysisData.data,
          columns: analysisData.columns,
          metadata: analysisData.metadata || {},
          analysisType: selectedAnalysisType,
          temperature: 0.7,
          max_tokens: 2048,
        },
        (chunk) => {
          fullResponse += chunk;
        }
      );

      setInsights(fullResponse);
      const parsed = parseCSVInsights(fullResponse);
      console.log("Parsed insights:", parsed);
      console.log("Sections:", parsed.sections);
      setParsedInsights(parsed);
    } catch (err) {
      console.error("CSV insight generation error:", err);
      setError(err.message || "Failed to generate CSV insights. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faFileCsv} className={styles.icon} />
          <div>
            <h3>CSV Analysis</h3>
            <p className={styles.headerSubtitle}>
              AI-powered data analysis and insights
            </p>
          </div>
        </div>
      </div>

      {!insights && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            Analyze your CSV data with AI to extract insights, detect patterns,
            assess data quality, or understand trends.
          </p>

          <div className={styles.analysisTypesGrid}>
            <button
              className={`${styles.analysisTypeCard} ${
                selectedAnalysisType === "all" ? styles.selected : ""
              } ${styles.analyzeAllCard}`}
              onClick={() => setSelectedAnalysisType("all")}
              disabled={isGenerating}
            >
              <FontAwesomeIcon
                icon={faLayerGroup}
                className={styles.typeIcon}
              />
              <div className={styles.typeInfo}>
                <span className={styles.typeLabel}>Analyze All</span>
                <span className={styles.typeDescription}>
                  Run all analysis types
                </span>
              </div>
            </button>

            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.id}
                className={`${styles.analysisTypeCard} ${
                  selectedAnalysisType === type.id ? styles.selected : ""
                }`}
                onClick={() => setSelectedAnalysisType(type.id)}
                disabled={isGenerating}
              >
                <FontAwesomeIcon icon={type.icon} className={styles.typeIcon} />
                <div className={styles.typeInfo}>
                  <span className={styles.typeLabel}>{type.label}</span>
                  <span className={styles.typeDescription}>
                    {type.description}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={isGenerating || !analysisData.data || !analysisData.columns}
          >
            {isGenerating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Generating Insights...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={selectedType.icon} />
                <span>Generate {selectedType.label}</span>
              </>
            )}
          </button>
        </div>
      )}

      {isGenerating && (
        <div className={styles.loadingSection}>
          <FontAwesomeIcon icon={faSpinner} className={styles.spinner} spin />
          <p>Analyzing CSV data with {selectedType.label.toLowerCase()}...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorSection}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={handleGenerate}>
            Try Again
          </button>
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "overview" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVOverview data={parsedInsights} rawText={insights} />
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "statistical" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVStatisticalAnalysis data={parsedInsights} rawText={insights} />
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "patterns" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVPatternDetection data={parsedInsights} rawText={insights} />
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "quality" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVDataQuality data={parsedInsights} rawText={insights} />
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "trends" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVTrendsAnalysis data={parsedInsights} rawText={insights} />
        </div>
      )}

      {parsedInsights && selectedAnalysisType === "correlation" && (
        <div className={styles.insightsPreview}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <CSVCorrelationAnalysis data={parsedInsights} rawText={insights} />
        </div>
      )}

      {insights && selectedAnalysisType !== "overview" && selectedAnalysisType !== "statistical" && selectedAnalysisType !== "patterns" && selectedAnalysisType !== "quality" && selectedAnalysisType !== "trends" && selectedAnalysisType !== "correlation" && (
        <div className={styles.rawInsights}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setError(null);
              }}
            >
              Change Analysis Type
            </button>
          </div>
          <pre>{insights}</pre>
        </div>
      )}
    </div>
  );
};

export default CSVInsightGenerator;
