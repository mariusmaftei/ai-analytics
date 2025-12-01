import React, { useState, useEffect, useRef } from "react";
import {
  faImage,
  faEye,
  faSearch,
  faTextWidth,
  faObjectGroup,
  faMountain,
  faChartBar,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import { analyzeImageStream } from "../../services/imageAnalysisService";
import { parseImageInsights } from "../../utils/imageInsightParser";
import ImageGeneralAnalysis from "../ImageAnalysisPreview/ImageGeneralAnalysis/ImageGeneralAnalysis";
import ImageDetailedAnalysis from "../ImageAnalysisPreview/ImageDetailedAnalysis/ImageDetailedAnalysis";
import ImageTextExtraction from "../ImageAnalysisPreview/ImageTextExtraction/ImageTextExtraction";
import ImageObjectDetection from "../ImageAnalysisPreview/ImageObjectDetection/ImageObjectDetection";
import ImageSceneAnalysis from "../ImageAnalysisPreview/ImageSceneAnalysis/ImageSceneAnalysis";
import ImageChartAnalysis from "../ImageAnalysisPreview/ImageChartAnalysis/ImageChartAnalysis";
import ImageDocumentAnalysis from "../ImageAnalysisPreview/ImageDocumentAnalysis/ImageDocumentAnalysis";
import BaseInsightGenerator from "../Shared/BaseInsightGenerator/BaseInsightGenerator";

const ANALYSIS_TYPES = [
  {
    id: "general",
    label: "General Analysis",
    icon: faEye,
    description: "Overall description and key elements",
  },
  {
    id: "detailed",
    label: "Detailed Analysis",
    icon: faSearch,
    description: "Comprehensive visual analysis",
  },
  {
    id: "ocr",
    label: "Text Extraction",
    icon: faTextWidth,
    description: "Extract all text from image",
  },
  {
    id: "objects",
    label: "Object Detection",
    icon: faObjectGroup,
    description: "Identify objects and items",
  },
  {
    id: "scene",
    label: "Scene Analysis",
    icon: faMountain,
    description: "Scene context and setting",
  },
  {
    id: "chart",
    label: "Chart Analysis",
    icon: faChartBar,
    description: "Analyze charts and graphs",
  },
  {
    id: "document",
    label: "Document Analysis",
    icon: faFileAlt,
    description: "Document structure and content",
  },
];

const urlToFile = async (url, filename, mimeType) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }
    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error("Image blob is empty or invalid");
    }

    const fileType = mimeType || blob.type || "image/jpeg";
    const file = new File([blob], filename, { type: fileType });

    if (file.size === 0) {
      throw new Error("Created file object is empty");
    }

    return file;
  } catch (error) {
    throw error;
  }
};

const ImageInsightGenerator = ({ fileData, analysisData, imageFile }) => {
  const [cachedImageFile, setCachedImageFile] = useState(null);
  const [ocrContext, setOcrContext] = useState(null);
  const isLoadingFileRef = useRef(false);

  useEffect(() => {
    if (
      imageFile &&
      !cachedImageFile &&
      !isLoadingFileRef.current &&
      imageFile instanceof File
    ) {
      isLoadingFileRef.current = true;
      setCachedImageFile(imageFile);
      isLoadingFileRef.current = false;
    } else if (
      analysisData.imageUrl &&
      !cachedImageFile &&
      !isLoadingFileRef.current
    ) {
      isLoadingFileRef.current = true;
      urlToFile(
        analysisData.imageUrl,
        fileData.fileName || "image.jpg",
        fileData.fileType || "image/jpeg"
      )
        .then((file) => {
          setCachedImageFile(file);
        })
        .catch((err) => {
          console.error("Failed to load image from URL:", err);
        })
        .finally(() => {
          isLoadingFileRef.current = false;
        });
    }
  }, [
    imageFile,
    analysisData.imageUrl,
    fileData.fileName,
    fileData.fileType,
    cachedImageFile,
  ]);

  const performAnalysis = async (
    type,
    analysisData,
    fileData,
    additionalProps
  ) => {
    const { imageFile: propImageFile, setOcrContext: setOcrContextProp } =
      additionalProps || {};
    let fileToUse = cachedImageFile || propImageFile;

    if (!fileToUse && analysisData.imageUrl) {
      try {
        fileToUse = await urlToFile(
          analysisData.imageUrl,
          fileData.fileName || "image.jpg",
          fileData.fileType || "image/jpeg"
        );
        setCachedImageFile(fileToUse);
      } catch (err) {
        throw new Error(`Failed to load image: ${err.message}`);
      }
    }

    if (!fileToUse) {
      throw new Error(
        "Image file not available. Please refresh the page and upload the image again."
      );
    }

    if (!(fileToUse instanceof File)) {
      throw new Error("Invalid file object. Please try again.");
    }

    if (fileToUse.size === 0) {
      throw new Error("Image file is empty. Please upload a valid image.");
    }

    let fullResponse = "";
    let rawTextResponse = "";
    let latestContext = null;
    let objectsData = null;

    const result = await analyzeImageStream(
      fileToUse,
      {
        analysisType: type.id,
      },
      (chunk) => {
        fullResponse += chunk;
      },
      (meta) => {
        latestContext = meta;
        if (type.id === "ocr" && setOcrContextProp) {
          setOcrContextProp(meta);
        }
      },
      null,
      (jsonData) => {
        objectsData = jsonData;
      }
    );

    if (typeof result === "object" && result.rawText) {
      rawTextResponse = result.rawText;
      fullResponse = result.text || fullResponse;
    } else if (typeof result === "string") {
      fullResponse = result;
    }

    return {
      content: fullResponse,
      text: fullResponse,
      rawText: rawTextResponse || fullResponse,
      objectsJson: objectsData,
      context: latestContext,
    };
  };

  const renderPreviewComponent = (
    typeId,
    data,
    rawText,
    fileData,
    analysisData,
    result
  ) => {
    switch (typeId) {
      case "general":
        return (
          <ImageGeneralAnalysis
            data={data}
            rawText={rawText}
            structuredData={result?.generalStructuredData}
          />
        );
      case "detailed":
        return (
          <ImageDetailedAnalysis
            data={data}
            rawText={rawText}
            structuredData={result?.detailedStructuredData}
          />
        );
      case "ocr":
        return (
          <ImageTextExtraction
            data={data}
            rawText={rawText || result?.rawText}
            context={ocrContext || result?.context}
          />
        );
      case "objects":
        return (
          <ImageObjectDetection
            data={data}
            rawText={rawText}
            objectsJson={result?.objectsJson}
            imageUrl={analysisData.imageUrl}
            imageFile={cachedImageFile || imageFile}
          />
        );
      case "scene":
        return (
          <ImageSceneAnalysis
            data={data}
            rawText={rawText}
            structuredData={result?.sceneStructuredData}
          />
        );
      case "chart":
        return (
          <ImageChartAnalysis
            data={data}
            rawText={rawText}
            structuredData={result?.chartStructuredData}
          />
        );
      case "document":
        return (
          <ImageDocumentAnalysis
            data={data}
            rawText={rawText}
            structuredData={result?.documentStructuredData}
          />
        );
      default:
        return null;
    }
  };

  const config = {
    analysisTypes: ANALYSIS_TYPES,
    allAnalysisTypes: ANALYSIS_TYPES,
    defaultAnalysisType: "general",
    cachePrefix: "image",
    accentColor: "#3b82f6",
    fileTypeName: "Image",
    headerIcon: faImage,
    headerTitle: "Image Analysis",
    headerSubtitle: "AI-powered visual insights",
    promptText:
      "Analyze your image with AI to extract visual information, detect objects, extract text, or understand the scene context.",
    validateData: (analysisData, returnError = false, additionalProps) => {
      const { imageFile: propImageFile } = additionalProps || {};
      const fileToUse = cachedImageFile || propImageFile;

      if (!fileToUse && !analysisData.imageUrl) {
        return returnError
          ? "Image file not available. Please refresh the page and upload the image again."
          : false;
      }
      return true;
    },
    performAnalysis,
    parseInsights: parseImageInsights,
    renderPreviewComponent,
    generateButtonText: (selectedType) =>
      `Analyze Image (${selectedType.label})`,
    loadingMessage: (selectedType) =>
      `Analyzing image with ${selectedType.label.toLowerCase()}...`,
    additionalProps: {
      imageFile,
      setOcrContext,
    },
  };

  return (
    <BaseInsightGenerator
      fileData={fileData}
      analysisData={analysisData}
      config={config}
    />
  );
};

export default ImageInsightGenerator;
