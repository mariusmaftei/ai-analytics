import React from "react";
import {
  faFileCsv,
  faChartBar,
  faSearch,
  faChartLine,
  faDatabase,
  faExclamationTriangle,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parseCSVInsights } from "../../utils/csvInsightParser";
import CSVOverview from "../CSVInsightsPreview/CSVOverview/CSVOverview";
import CSVStatisticalAnalysis from "../CSVInsightsPreview/CSVStatisticalAnalysis/CSVStatisticalAnalysis";
import CSVPatternDetection from "../CSVInsightsPreview/CSVPatternDetection/CSVPatternDetection";
import CSVDataQuality from "../CSVInsightsPreview/CSVDataQuality/CSVDataQuality";
import CSVTrendsAnalysis from "../CSVInsightsPreview/CSVTrendsAnalysis/CSVTrendsAnalysis";
import CSVCorrelationAnalysis from "../CSVInsightsPreview/CSVCorrelationAnalysis/CSVCorrelationAnalysis";
import BaseInsightGenerator from "../Shared/BaseInsightGenerator/BaseInsightGenerator";

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
  const performAnalysis = async (type, analysisData, fileData) => {
    let fullResponse = "";
    await generateInsights(
      {
        fileType: "CSV",
        csvData: analysisData.data,
        columns: analysisData.columns,
        metadata: analysisData.metadata || {},
        analysisType: type.id,
        temperature: 0.7,
        max_tokens: 2048,
      },
      (chunk) => {
        fullResponse += chunk;
      }
    );
    return { content: fullResponse, text: fullResponse };
  };

  const renderPreviewComponent = (typeId, data, rawText, fileData, analysisData, result) => {
    switch (typeId) {
      case "overview":
        return <CSVOverview data={data} rawText={rawText} analysisData={analysisData} />;
      case "statistical":
        return (
          <CSVStatisticalAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "patterns":
        return (
          <CSVPatternDetection
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "quality":
        return (
          <CSVDataQuality data={data} rawText={rawText} analysisData={analysisData} />
        );
      case "trends":
        return (
          <CSVTrendsAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "correlation":
        return (
          <CSVCorrelationAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      default:
        return null;
    }
  };

  const config = {
    analysisTypes: ANALYSIS_TYPES,
    allAnalysisTypes: ANALYSIS_TYPES,
    defaultAnalysisType: "overview",
    cachePrefix: "csv",
    accentColor: "#22c55e",
    fileTypeName: "CSV",
    headerIcon: faFileCsv,
    headerTitle: "CSV Analysis",
    headerSubtitle: "AI-powered data insights",
    promptText:
      "Analyze your CSV data with AI to extract insights, detect patterns, assess data quality, or understand trends.",
    validateData: (analysisData, returnError = false) => {
      if (!analysisData.data || !analysisData.columns) {
        return returnError
          ? "CSV data is not available. Please upload the file again."
          : false;
      }
      return true;
    },
    performAnalysis,
    parseInsights: parseCSVInsights,
    renderPreviewComponent,
    generateButtonText: (selectedType) => `Generate ${selectedType.label}`,
    loadingMessage: (selectedType) =>
      `Analyzing CSV data with ${selectedType.label.toLowerCase()}...`,
  };

  return (
    <BaseInsightGenerator
      fileData={fileData}
      analysisData={analysisData}
      config={config}
    />
  );
};

export default CSVInsightGenerator;
