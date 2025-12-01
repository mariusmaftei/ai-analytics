import React from "react";
import {
  faFilePdf,
  faFileAlt,
  faSearch,
  faKey,
  faInfoCircle,
  faSitemap,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parsePDFInsights } from "../../utils/pdfInsightParser";
import PDFOverview from "../PDFInsightsPreview/PDFOverview/PDFOverview";
import PDFSummary from "../PDFInsightsPreview/PDFSummary/PDFSummary";
import PDFContentAnalysis from "../PDFInsightsPreview/PDFContentAnalysis/PDFContentAnalysis";
import PDFStructureAnalysis from "../PDFInsightsPreview/PDFStructureAnalysis/PDFStructureAnalysis";
import PDFMetadataAnalysis from "../PDFInsightsPreview/PDFMetadataAnalysis/PDFMetadataAnalysis";
import PDFKeywordsExtraction from "../PDFInsightsPreview/PDFKeywordsExtraction/PDFKeywordsExtraction";
import BaseInsightGenerator from "../Shared/BaseInsightGenerator/BaseInsightGenerator";

const ANALYSIS_TYPES = [
  {
    id: "overview",
    label: "Overview",
    icon: faFileAlt,
    description: "Document summary and key information",
  },
  {
    id: "summary",
    label: "Summary",
    icon: faFileAlt,
    description: "Executive summary and highlights",
  },
  {
    id: "content",
    label: "Content Analysis",
    icon: faSearch,
    description: "Detailed content examination",
  },
  {
    id: "structure",
    label: "Structure Analysis",
    icon: faSitemap,
    description: "Document organization and layout",
  },
  {
    id: "metadata",
    label: "Metadata",
    icon: faInfoCircle,
    description: "Document properties and information",
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: faKey,
    description: "Key terms and concepts",
  },
];

const PDFInsightGenerator = ({ fileData, analysisData }) => {
  const performAnalysis = async (type, analysisData, fileData) => {
    let fullResponse = "";
    await generateInsights(
      {
        fileType: "PDF",
        text: analysisData.text,
        metadata: analysisData.metadata || {},
        tables: analysisData.tables || [],
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
        return (
          <PDFOverview
            data={data}
            rawText={rawText}
            fileData={fileData}
            analysisData={analysisData}
          />
        );
      case "summary":
        return (
          <PDFSummary data={data} rawText={rawText} analysisData={analysisData} />
        );
      case "content":
        return (
          <PDFContentAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "structure":
        return (
          <PDFStructureAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "metadata":
        return (
          <PDFMetadataAnalysis
            data={data}
            rawText={rawText}
            analysisData={analysisData}
          />
        );
      case "keywords":
        return (
          <PDFKeywordsExtraction
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
    cachePrefix: "pdf",
    accentColor: "#f97316",
    fileTypeName: "PDF",
    headerIcon: faFilePdf,
    headerTitle: "PDF Analysis",
    headerSubtitle: "AI-powered document insights",
    promptText:
      "Analyze your PDF document with AI to extract insights, understand content structure, identify key information, or extract metadata.",
    validateData: (analysisData, returnError = false) => {
      if (!analysisData.text) {
        return returnError
          ? "PDF text is not available. Please upload the file again."
          : false;
      }
      return true;
    },
    performAnalysis,
    parseInsights: parsePDFInsights,
    renderPreviewComponent,
    generateButtonText: (selectedType) =>
      `Generate ${selectedType.label}`,
    loadingMessage: (selectedType) =>
      `Analyzing PDF with ${selectedType.label.toLowerCase()}...`,
  };

  return (
    <BaseInsightGenerator
      fileData={fileData}
      analysisData={analysisData}
      config={config}
    />
  );
};

export default PDFInsightGenerator;
