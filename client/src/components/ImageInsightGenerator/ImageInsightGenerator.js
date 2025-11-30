import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faEye,
  faSearch,
  faTextWidth,
  faObjectGroup,
  faMountain,
  faChartBar,
  faFileAlt,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { analyzeImageStream } from "../../services/imageAnalysisService";
import { parseImageInsights } from "./utils/imageInsightParser";
import ImageGeneralAnalysis from "../ImageAnalysisPreview/ImageGeneralAnalysis/ImageGeneralAnalysis";
import ImageDetailedAnalysis from "../ImageAnalysisPreview/ImageDetailedAnalysis/ImageDetailedAnalysis";
import ImageTextExtraction from "../ImageAnalysisPreview/ImageTextExtraction/ImageTextExtraction";
import ImageObjectDetection from "../ImageAnalysisPreview/ImageObjectDetection/ImageObjectDetection";
import ImageSceneAnalysis from "../ImageAnalysisPreview/ImageSceneAnalysis/ImageSceneAnalysis";
import ImageChartAnalysis from "../ImageAnalysisPreview/ImageChartAnalysis/ImageChartAnalysis";
import ImageDocumentAnalysis from "../ImageAnalysisPreview/ImageDocumentAnalysis/ImageDocumentAnalysis";
import ProgressBar from "../Shared/ProgressBar/ProgressBar";
import styles from "./ImageInsightGenerator.module.css";

// Helper function to convert blob URL to File object
const urlToFile = async (url, filename, mimeType) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }
    const blob = await response.blob();

    // Ensure we have a valid blob
    if (!blob || blob.size === 0) {
      throw new Error("Image blob is empty or invalid");
    }

    // Create File object with proper type
    const fileType = mimeType || blob.type || "image/jpeg";
    const file = new File([blob], filename, { type: fileType });

    // Verify file is readable
    if (file.size === 0) {
      throw new Error("Created file object is empty");
    }

    return file;
  } catch (error) {
    throw error;
  }
};

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

const ALL_ANALYSIS_TYPES = ANALYSIS_TYPES.filter((type) => type.id !== "all");

const ImageInsightGenerator = ({ fileData, analysisData, imageFile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("general");
  const [allInsights, setAllInsights] = useState(null);
  const [ocrContext, setOcrContext] = useState(null);
  const [error, setError] = useState(null);
  const [cachedImageFile, setCachedImageFile] = useState(null);
  const [completedAnalyses, setCompletedAnalyses] = useState({});
  const [expandedAnalyses, setExpandedAnalyses] = useState({});
  const [expandedAllInsights, setExpandedAllInsights] = useState({});
  const [showAnalysisSelector, setShowAnalysisSelector] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, currentType: null });
  const isLoadingFileRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Generate a unique cache key based on file name and size
  const cacheKey = `image_insights_${fileData.fileName}_${fileData.fileSize}`;

  // Load cached insights on mount (but NOT from analysisData - user must click button)
  useEffect(() => {
    if (hasInitializedRef.current) return;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.completedAnalyses) {
          setCompletedAnalyses(parsed.completedAnalyses);
          if (parsed.expandedAnalyses) {
            setExpandedAnalyses(parsed.expandedAnalyses);
          }
          setIsExpanded(true);
          hasInitializedRef.current = true;
        } else if (parsed.allInsights) {
          setAllInsights(parsed.allInsights);
          setIsExpanded(true);
          hasInitializedRef.current = true;
        } else if (parsed.insights) {
          const cachedType = parsed.analysisType || "general";
          const analysisData = {
            insights: parsed.insights,
            parsedInsights:
              parsed.parsedInsights || parseImageInsights(parsed.insights),
            ocrContext: parsed.ocrContext,
            ocrRawText: parsed.ocrRawText,
            objectsJson: parsed.objectsJson,
            generalStructuredData: parsed.generalStructuredData,
          };
          setCompletedAnalyses({ [cachedType]: analysisData });
          setExpandedAnalyses({ [cachedType]: true });
          setSelectedAnalysisType(cachedType);
          setIsExpanded(true);
          hasInitializedRef.current = true;
        }
      }
    } catch (err) {
    }
  }, [cacheKey]);

  // Save insights to cache whenever they change
  useEffect(() => {
    if (Object.keys(completedAnalyses).length > 0 || allInsights) {
      try {
        const toCache = {
          completedAnalyses,
          expandedAnalyses,
          allInsights,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch (err) {
      }
    }
  }, [completedAnalyses, expandedAnalyses, allInsights, cacheKey]);

  useEffect(() => {
    if (
      (Object.keys(completedAnalyses).length > 0 || allInsights) &&
      !isGenerating &&
      !error
    ) {
      setIsExpanded(true);
      // Only auto-expand all if user hasn't explicitly collapsed them (showAnalysisSelector is false)
      // and if this is the initial load (expandedAnalyses is empty)
      if (
        Object.keys(completedAnalyses).length > 0 &&
        Object.keys(expandedAnalyses).length === 0 &&
        !showAnalysisSelector
      ) {
        const newExpanded = {};
        Object.keys(completedAnalyses).forEach((key) => {
          newExpanded[key] = true;
        });
        setExpandedAnalyses(newExpanded);
      }
    }
  }, [
    completedAnalyses,
    allInsights,
    isGenerating,
    error,
    expandedAnalyses,
    showAnalysisSelector,
  ]);

  // Cache the image file from URL if needed
  useEffect(() => {
    // If we already have the file, use it
    if (imageFile) {
      setCachedImageFile(imageFile);
      return;
    }

    // If we have an imageUrl and haven't loaded it yet, convert it to a File object
    if (
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
        })
        .finally(() => {
          isLoadingFileRef.current = false;
        });
    }
  }, [imageFile, analysisData.imageUrl, fileData.fileName, fileData.fileType, cachedImageFile]);

  const handleGenerateInsights = async () => {
    // Use cached file or provided file
    let fileToUse = cachedImageFile || imageFile;

    // If we don't have a file yet but have an imageUrl, try to load it
    if (!fileToUse && analysisData.imageUrl) {
      setIsGenerating(true);
      setError(null);

      try {
        fileToUse = await urlToFile(
          analysisData.imageUrl,
          fileData.fileName || "image.jpg",
          fileData.fileType || "image/jpeg"
        );
        setCachedImageFile(fileToUse);
      } catch (err) {
        setError(`Failed to load image: ${err.message}`);
        setIsGenerating(false);
        return;
      }
    }

    if (!fileToUse) {
      setError(
        "Image file not available. Please refresh the page and upload the image again."
      );
      return;
    }

    // Verify file is valid before sending
    if (!(fileToUse instanceof File)) {
      setError("Invalid file object. Please try again.");
      return;
    }

    if (fileToUse.size === 0) {
      setError("Image file is empty. Please upload a valid image.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAllInsights(null);
    setOcrContext(null);
    setShowAnalysisSelector(false);

    try {
      if (selectedAnalysisType === "all") {
        const results = {};
        const totalTypes = ALL_ANALYSIS_TYPES.length;
        
        // Initialize progress
        setAnalysisProgress({ current: 0, total: totalTypes, currentType: null });

        // Run all analysis types sequentially
        for (let i = 0; i < ALL_ANALYSIS_TYPES.length; i++) {
          const type = ALL_ANALYSIS_TYPES[i];
          
          // Update progress - show which analysis is currently running
          setAnalysisProgress({ 
            current: i, 
            total: totalTypes, 
            currentType: type.label 
          });

          try {
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
                // Don't update allInsights during streaming to avoid showing partial results
              },
              (meta) => {
                latestContext = meta;
                if (type.id === "ocr") {
                  setOcrContext(meta);
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
            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: fullResponse,
              rawText: rawTextResponse || fullResponse,
              objectsJson: objectsData,
              context: latestContext,
            };
            
            // Only update allInsights after each analysis is complete
            setAllInsights({ ...results });

            // Initialize all sections as expanded by default
            setExpandedAllInsights((prev) => ({
              ...prev,
              [type.id]: true,
            }));

            // Update progress after completion
            setAnalysisProgress({ 
              current: i + 1, 
              total: totalTypes, 
              currentType: type.label 
            });
          } catch (err) {
            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: `Error: ${err.message || "Failed to analyze"}`,
              error: true,
            };
            setAllInsights({ ...results });
            
            // Initialize all sections as expanded by default even on error
            setExpandedAllInsights((prev) => ({
              ...prev,
              [type.id]: true,
            }));
            
            // Update progress even on error
            setAnalysisProgress({ 
              current: i + 1, 
              total: totalTypes, 
              currentType: type.label 
            });
          }
        }
        
        // Reset progress when done
        setAnalysisProgress({ current: 0, total: 0, currentType: null });
      } else {
        // Single analysis type
        let fullResponse = "";
        let rawTextResponse = "";
        let latestContext = null;
        let capturedObjectsJson = null;
        let capturedGeneralStructuredData = null;

        const result = await analyzeImageStream(
          fileToUse,
          {
            analysisType: selectedAnalysisType,
          },
          (chunk) => {
            fullResponse += chunk;
            // Don't update completedAnalyses during streaming to avoid double rendering
            // We'll update it once at the end with all final data
          },
          (meta) => {
            latestContext = meta;
            setOcrContext(meta);
          },
          (rawText) => {
            rawTextResponse = rawText;
          },
          (jsonData) => {
            // Handle objects JSON, general structured data, and scene structured data
            if (selectedAnalysisType === "objects") {
              capturedObjectsJson = jsonData;
            } else if (selectedAnalysisType === "general") {
              capturedGeneralStructuredData = jsonData;
            } else if (
              selectedAnalysisType === "scene" ||
              selectedAnalysisType === "chart" ||
              selectedAnalysisType === "document"
            ) {
              capturedObjectsJson = jsonData;
            }
          }
        );

        if (typeof result === "object" && result.rawText) {
          rawTextResponse = result.rawText;
          fullResponse = result.text || fullResponse;
        } else if (typeof result === "string") {
          fullResponse = result;
        }

        const parsed = parseImageInsights(fullResponse);

        const analysisResult = {
          insights: fullResponse,
          parsedInsights: parsed,
          ocrContext: selectedAnalysisType === "ocr" ? latestContext : null,
          ocrRawText: selectedAnalysisType === "ocr" ? rawTextResponse : null,
          objectsJson:
            selectedAnalysisType === "objects"
              ? capturedObjectsJson
              : selectedAnalysisType === "scene" ||
                selectedAnalysisType === "chart" ||
                selectedAnalysisType === "document"
              ? capturedObjectsJson
              : null,
          generalStructuredData:
            selectedAnalysisType === "general"
              ? capturedGeneralStructuredData
              : null,
          imageUrl: analysisData.imageUrl,
        };

        setCompletedAnalyses((prev) => ({
          ...prev,
          [selectedAnalysisType]: analysisResult,
        }));
        setExpandedAnalyses((prev) => ({
          ...prev,
          [selectedAnalysisType]: true,
        }));

        if (selectedAnalysisType === "ocr" && !latestContext) {
          setOcrContext(null);
        }
      }
    } catch (err) {
      const errorMessage =
        err.message || "Failed to generate image insights. Please try again.";
      setError(errorMessage);
      setAllInsights(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedType =
    selectedAnalysisType === "all"
      ? {
          id: "all",
          label: "All Analyses",
          icon: faLayerGroup,
          description: "Run all analysis types",
        }
      : ANALYSIS_TYPES.find((type) => type.id === selectedAnalysisType);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faImage} className={styles.icon} />
          <div>
            <h3>Image Analysis</h3>
            <p className={styles.headerSubtitle}>
              AI-powered visual analysis and insights
            </p>
          </div>
        </div>
        {(Object.keys(completedAnalyses).length > 0 || allInsights) && (
          <button
            className={styles.toggleButton}
            onClick={() => {
              if (Object.keys(completedAnalyses).length > 0) {
                const allExpanded = Object.values(expandedAnalyses).every(
                  (v) => v
                );
                const newExpanded = {};
                Object.keys(completedAnalyses).forEach((key) => {
                  newExpanded[key] = !allExpanded;
                });
                setExpandedAnalyses(newExpanded);
              } else if (allInsights) {
                // Handle "Analyze All" case
                const allExpanded = Object.keys(allInsights).every(
                  (key) => expandedAllInsights[key] !== false
                );
                const newExpanded = {};
                Object.keys(allInsights).forEach((key) => {
                  newExpanded[key] = !allExpanded;
                });
                setExpandedAllInsights(newExpanded);
                setIsExpanded(!allExpanded);
              } else {
                setIsExpanded(!isExpanded);
              }
            }}
          >
            <FontAwesomeIcon
              icon={
                (Object.keys(completedAnalyses).length > 0 &&
                  Object.values(expandedAnalyses).every((v) => v)) ||
                (allInsights &&
                  Object.keys(allInsights).every(
                    (key) => expandedAllInsights[key] !== false
                  )) ||
                isExpanded
                  ? faChevronUp
                  : faChevronDown
              }
            />
          </button>
        )}
      </div>

      {(showAnalysisSelector ||
        (Object.keys(completedAnalyses).length === 0 &&
          !allInsights &&
          !isGenerating &&
          !error)) && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            Analyze your image with AI to extract visual information, detect
            objects, extract text, or understand the scene context.
          </p>

          <div className={styles.analysisTypesGrid}>
            {/* Analyze All option */}
            <button
              className={`${styles.analysisTypeCard} ${
                selectedAnalysisType === "all" ? styles.selected : ""
              } ${styles.analyzeAllCard}`}
              onClick={() => setSelectedAnalysisType("all")}
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

            {/* Individual analysis types */}
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.id}
                className={`${styles.analysisTypeCard} ${
                  selectedAnalysisType === type.id ? styles.selected : ""
                } ${completedAnalyses[type.id] ? styles.completed : ""}`}
                onClick={() => {
                  setSelectedAnalysisType(type.id);
                  if (completedAnalyses[type.id]) {
                    // Collapse all others and expand only the selected one
                    setExpandedAnalyses({ [type.id]: true });
                    setShowAnalysisSelector(false);
                  } else {
                    // If it doesn't exist yet, collapse all to show selector clearly
                    setExpandedAnalyses({});
                  }
                }}
              >
                <FontAwesomeIcon icon={type.icon} className={styles.typeIcon} />
                <div className={styles.typeInfo}>
                  <span className={styles.typeLabel}>{type.label}</span>
                  <span className={styles.typeDescription}>
                    {type.description}
                  </span>
                </div>
                {completedAnalyses[type.id] && (
                  <span className={styles.completedBadge}>Completed</span>
                )}
              </button>
            ))}
          </div>

          <button
            className={styles.generateButton}
            onClick={handleGenerateInsights}
            disabled={
              isGenerating ||
              (!cachedImageFile && !imageFile && analysisData.imageUrl)
            }
          >
            <FontAwesomeIcon icon={selectedType.icon} />
            <span>
              {!cachedImageFile && !imageFile && analysisData.imageUrl
                ? "Loading image..."
                : completedAnalyses[selectedAnalysisType]
                ? `Re-run Analysis (${selectedType.label})`
                : `Analyze Image (${selectedType.label})`}
            </span>
          </button>
        </div>
      )}

      {isGenerating && (
        <div className={styles.loadingSection}>
          <FontAwesomeIcon icon={faSpinner} className={styles.spinner} spin />
          {selectedAnalysisType === "all" && analysisProgress.total > 0 ? (
            <ProgressBar
              current={analysisProgress.current}
              total={analysisProgress.total}
              currentType={analysisProgress.currentType}
              color="blue"
              fileType="Image"
            />
          ) : (
            <p>
              Analyzing image with {selectedType.label.toLowerCase()}...
            </p>
          )}
        </div>
      )}

      {error && (
        <div className={styles.errorSection}>
          <p>{error}</p>
          <button
            className={styles.retryButton}
            onClick={handleGenerateInsights}
          >
            Try Again
          </button>
        </div>
      )}

      {(Object.keys(completedAnalyses).length > 0 || (allInsights && !isGenerating)) &&
        !showAnalysisSelector && (
          <div className={styles.insightsContent}>
            <div className={styles.previewActions}>
              <button
                className={styles.changeTypeButton}
                onClick={() => {
                  setShowAnalysisSelector(true);
                  setExpandedAnalyses({});
                }}
              >
                Change Analysis Type
              </button>
            </div>

            {Object.keys(completedAnalyses).length > 0 && (
              <div className={styles.completedAnalysesList}>
                {Object.entries(completedAnalyses).map(
                  ([typeId, analysisData]) => {
                    const typeInfo = ANALYSIS_TYPES.find(
                      (t) => t.id === typeId
                    );
                    const isExpanded = expandedAnalyses[typeId] || false;

                    return (
                      <div key={typeId} className={styles.analysisContainer}>
                        <div
                          className={styles.analysisHeader}
                          onClick={() => {
                            setExpandedAnalyses((prev) => ({
                              ...prev,
                              [typeId]: !prev[typeId],
                            }));
                          }}
                        >
                          <div className={styles.analysisHeaderLeft}>
                            <FontAwesomeIcon
                              icon={isExpanded ? faChevronUp : faChevronDown}
                              className={styles.expandIcon}
                            />
                            <FontAwesomeIcon
                              icon={typeInfo?.icon || faEye}
                              className={styles.analysisTypeIcon}
                            />
                            <span className={styles.analysisTypeLabel}>
                              {typeInfo?.label || typeId}
                            </span>
                          </div>
                          <button
                            className={styles.removeAnalysisButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompletedAnalyses((prev) => {
                                const updated = { ...prev };
                                delete updated[typeId];
                                return updated;
                              });
                              setExpandedAnalyses((prev) => {
                                const updated = { ...prev };
                                delete updated[typeId];
                                return updated;
                              });
                            }}
                            title="Remove this analysis"
                          >
                            ×
                          </button>
                        </div>

                        {isExpanded && (
                          <div className={styles.analysisContent}>
                            {typeId === "general" &&
                              analysisData.parsedInsights && (
                                <ImageGeneralAnalysis
                                  data={analysisData.parsedInsights}
                                  rawText={analysisData.insights}
                                  structuredData={
                                    analysisData.generalStructuredData
                                  }
                                />
                              )}
                            {typeId === "detailed" &&
                              analysisData.parsedInsights && (
                                <ImageDetailedAnalysis
                                  data={analysisData.parsedInsights}
                                  rawText={analysisData.insights}
                                />
                              )}
                            {typeId === "ocr" &&
                              analysisData.parsedInsights && (
                                <ImageTextExtraction
                                  data={analysisData.parsedInsights}
                                  rawText={
                                    analysisData.ocrRawText ||
                                    analysisData.insights
                                  }
                                  contextMeta={analysisData.ocrContext}
                                />
                              )}
                            {typeId === "objects" &&
                              analysisData.parsedInsights && (
                                <ImageObjectDetection
                                  data={analysisData.parsedInsights}
                                  rawText={
                                    analysisData.objectsJson
                                      ? JSON.stringify(analysisData.objectsJson)
                                      : analysisData.insights
                                  }
                                  imageUrl={analysisData.imageUrl}
                                  imageFile={cachedImageFile || imageFile}
                                />
                              )}
                            {typeId === "scene" &&
                              analysisData.parsedInsights && (
                                <ImageSceneAnalysis
                                  data={analysisData.parsedInsights}
                                  rawText={
                                    analysisData.objectsJson
                                      ? JSON.stringify(analysisData.objectsJson)
                                      : analysisData.insights
                                  }
                                />
                              )}
                            {typeId === "chart" &&
                              analysisData.parsedInsights && (
                                <ImageChartAnalysis
                                  data={analysisData.parsedInsights}
                                  rawText={
                                    analysisData.objectsJson
                                      ? JSON.stringify(analysisData.objectsJson)
                                      : analysisData.insights
                                  }
                                />
                              )}
                            {typeId === "document" &&
                              analysisData.parsedInsights && (
                                <ImageDocumentAnalysis
                                  data={analysisData.parsedInsights}
                                  rawText={
                                    analysisData.objectsJson
                                      ? JSON.stringify(analysisData.objectsJson)
                                      : analysisData.insights
                                  }
                                />
                              )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {allInsights && (
              // Display all analyses
              <div className={styles.allInsightsContainer}>
                <div className={styles.analysisTypeBadge}>
                  <FontAwesomeIcon icon={faLayerGroup} />
                  <span>
                    All Analyses ({Object.keys(allInsights).length} completed)
                  </span>
                </div>

                {Object.entries(allInsights).map(([typeId, result]) => {
                  const typeInfo = ALL_ANALYSIS_TYPES.find(
                    (t) => t.id === typeId
                  );
                  const parsed = parseImageInsights(
                    result.content || result.text || ""
                  );
                  const isExpanded = expandedAllInsights[typeId] !== false; // Default to expanded
                  return (
                    <div key={typeId} className={styles.singleAnalysisSection}>
                      <div 
                        className={styles.analysisSectionHeader}
                        onClick={() => {
                          setExpandedAllInsights((prev) => ({
                            ...prev,
                            [typeId]: !prev[typeId],
                          }));
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <FontAwesomeIcon
                          icon={isExpanded ? faChevronUp : faChevronDown}
                          className={styles.expandIcon}
                        />
                        <FontAwesomeIcon icon={typeInfo?.icon || faEye} />
                        <h4>{result.type}</h4>
                      </div>
                      {isExpanded && (
                        <div className={styles.analysisContent}>
                          {typeId === "general" && (
                        <ImageGeneralAnalysis
                          data={parsed}
                          rawText={result.content || result.text}
                        />
                      )}
                      {typeId === "detailed" && (
                        <ImageDetailedAnalysis
                          data={parsed}
                          rawText={result.content || result.text}
                        />
                      )}
                      {typeId === "ocr" && (
                        <ImageTextExtraction
                          data={parsed}
                          rawText={
                            result.rawText || result.content || result.text
                          }
                          contextMeta={result.context || ocrContext}
                        />
                      )}
                      {typeId === "objects" && (
                        <ImageObjectDetection
                          data={parsed}
                          rawText={
                            result.objectsJson
                              ? JSON.stringify(result.objectsJson)
                              : result.content || result.text
                          }
                          imageUrl={analysisData.imageUrl}
                          imageFile={cachedImageFile || imageFile}
                        />
                      )}
                      {typeId === "scene" && (
                        <ImageSceneAnalysis
                          data={parsed}
                          rawText={
                            result.objectsJson
                              ? JSON.stringify(result.objectsJson)
                              : result.content || result.text || ""
                          }
                        />
                      )}
                      {typeId === "chart" && (
                        <ImageChartAnalysis
                          data={parsed}
                          rawText={
                            result.objectsJson
                              ? JSON.stringify(result.objectsJson)
                              : result.content || result.text
                          }
                        />
                      )}
                      {typeId === "document" && (
                        <ImageDocumentAnalysis
                          data={parsed}
                          rawText={
                            result.objectsJson
                              ? JSON.stringify(result.objectsJson)
                              : result.content || result.text
                          }
                        />
                      )}
                      {![
                        "general",
                        "detailed",
                        "ocr",
                        "objects",
                        "scene",
                        "chart",
                        "document",
                      ].includes(typeId) && (
                        <div
                          className={`${styles.insightsText} ${
                            result.error ? styles.errorText : ""
                          }`}
                        >
                          {result.content.split("\n").map((line, i) => {
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                              <React.Fragment key={i}>
                                {parts.map((part, j) => {
                                  if (
                                    part.startsWith("**") &&
                                    part.endsWith("**")
                                  ) {
                                    return (
                                      <strong key={j}>
                                        {part.slice(2, -2)}
                                      </strong>
                                    );
                                  }
                                  return <span key={j}>{part}</span>;
                                })}
                                {i < result.content.split("\n").length - 1 && (
                                  <br />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default ImageInsightGenerator;
