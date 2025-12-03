import React from "react";
import {
  faVolumeUp,
  faFileAlt,
  faSearch,
  faKey,
  faInfoCircle,
  faUsers,
  faTasks,
  faClock,
  faTextWidth,
  faSmile,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parseAudioInsights } from "../../utils/audioInsightParser";
import AudioOverview from "../AudioInsightsPreview/AudioOverview/AudioOverview";
import AudioSummary from "../AudioInsightsPreview/AudioSummary/AudioSummary";
import AudioContentAnalysis from "../AudioInsightsPreview/AudioContentAnalysis/AudioContentAnalysis";
import AudioSentimentAnalysis from "../AudioInsightsPreview/AudioSentimentAnalysis/AudioSentimentAnalysis";
import AudioKeywordsExtraction from "../AudioInsightsPreview/AudioKeywordsExtraction/AudioKeywordsExtraction";
import AudioSpeakerAnalysis from "../AudioInsightsPreview/AudioSpeakerAnalysis/AudioSpeakerAnalysis";
import AudioActionItems from "../AudioInsightsPreview/AudioActionItems/AudioActionItems";
import AudioTimeline from "../AudioInsightsPreview/AudioTimeline/AudioTimeline";
import AudioMetadata from "../AudioInsightsPreview/AudioMetadata/AudioMetadata";
import AudioTranscription from "../AudioInsightsPreview/AudioTranscription/AudioTranscription";
import BaseInsightGenerator from "../Shared/BaseInsightGenerator/BaseInsightGenerator";
import ErrorBoundary from "../Shared/ErrorBoundary/ErrorBoundary";

const ANALYSIS_TYPES = [
  {
    id: "overview",
    label: "Overview",
    icon: faFileAlt,
    description: "Audio summary and key information",
  },
  {
    id: "transcription",
    label: "Transcription",
    icon: faTextWidth,
    description: "Full text transcript with timestamps",
  },
  {
    id: "summary",
    label: "Summary",
    icon: faFileAlt,
    description: "Executive summary and key points",
  },
  {
    id: "content",
    label: "Content Analysis",
    icon: faSearch,
    description: "Topics, themes, and discussion flow",
  },
  {
    id: "sentiment",
    label: "Sentiment Analysis",
    icon: faSmile,
    description: "Emotional tone and sentiment",
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: faKey,
    description: "Important terms and phrases",
  },
  {
    id: "speakers",
    label: "Speaker Analysis",
    icon: faUsers,
    description: "Speaker identification and patterns",
  },
  {
    id: "actions",
    label: "Action Items",
    icon: faTasks,
    description: "Tasks, decisions, and deadlines",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: faClock,
    description: "Discussion timeline and key moments",
  },
  {
    id: "metadata",
    label: "Metadata",
    icon: faInfoCircle,
    description: "Audio file information",
  },
];

const AudioInsightGenerator = ({ fileData, analysisData }) => {
  const performAnalysis = async (type, analysisData, fileData) => {
    let fullResponse = "";
    await generateInsights(
      {
        fileType: "AUDIO",
        text: analysisData.text || analysisData.transcription?.text || "",
        metadata: analysisData.metadata || {},
        transcription: analysisData.transcription || {},
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
    const errorBoundaryProps = {
      componentName: `Audio${typeId.charAt(0).toUpperCase() + typeId.slice(1)}`,
      title: "Analysis Error",
      message: `An error occurred while displaying the ${typeId} analysis. The data may be in an unexpected format.`,
    };

    switch (typeId) {
      case "overview":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioOverview
              data={data}
              rawText={rawText}
              fileData={fileData}
              analysisData={analysisData}
            />
          </ErrorBoundary>
        );
      case "transcription":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioTranscription
              data={data}
              rawText={rawText}
              analysisData={analysisData}
              fileData={fileData}
            />
          </ErrorBoundary>
        );
      case "summary":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioSummary data={data} rawText={rawText} />
          </ErrorBoundary>
        );
      case "content":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioContentAnalysis
              data={data}
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "sentiment":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioSentimentAnalysis
              data={data}
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "keywords":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioKeywordsExtraction
              data={data}
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "speakers":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioSpeakerAnalysis
              data={data}
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "actions":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioActionItems
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "timeline":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioTimeline
              data={data}
              rawText={rawText}
            />
          </ErrorBoundary>
        );
      case "metadata":
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <AudioMetadata
              data={data}
              rawText={rawText}
              analysisData={analysisData}
              fileData={fileData}
            />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  const config = {
    analysisTypes: ANALYSIS_TYPES,
    allAnalysisTypes: ANALYSIS_TYPES,
    defaultAnalysisType: "overview",
    cachePrefix: "audio",
    accentColor: "#9333ea",
    fileTypeName: "Audio",
    headerIcon: faVolumeUp,
    headerTitle: "Audio Analysis",
    headerSubtitle: "AI-powered audio insights and transcription",
    promptText:
      "Analyze your audio file with AI to get transcription, extract insights, understand content, analyze sentiment, identify speakers, or extract action items.",
    validateData: (analysisData, returnError = false) => {
      if (!analysisData.text && !analysisData.transcription?.text) {
        return returnError
          ? "Audio transcription is not available. Please upload the file again."
          : false;
      }
      return true;
    },
    performAnalysis,
    parseInsights: parseAudioInsights,
    renderPreviewComponent,
    generateButtonText: (selectedType) =>
      `Generate ${selectedType.label}`,
    loadingMessage: (selectedType) =>
      `Analyzing audio with ${selectedType.label.toLowerCase()}...`,
  };

  return (
    <BaseInsightGenerator
      fileData={fileData}
      analysisData={analysisData}
      config={config}
    />
  );
};

export default AudioInsightGenerator;

