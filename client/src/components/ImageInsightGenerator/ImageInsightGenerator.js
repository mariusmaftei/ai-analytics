import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faEye,
  faSearch,
  faPalette,
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
import styles from "./ImageInsightGenerator.module.css";

// Helper function to convert blob URL to File object
const urlToFile = async (url, filename, mimeType) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Ensure we have a valid blob
    if (!blob || blob.size === 0) {
      throw new Error('Image blob is empty or invalid');
    }
    
    // Create File object with proper type
    const fileType = mimeType || blob.type || 'image/jpeg';
    const file = new File([blob], filename, { type: fileType });
    
    // Verify file is readable
    if (file.size === 0) {
      throw new Error('Created file object is empty');
    }
    
    return file;
  } catch (error) {
    console.error('Error converting URL to File:', error);
    throw error;
  }
};

const ANALYSIS_TYPES = [
  { id: "general", label: "General Analysis", icon: faEye, description: "Overall description and key elements" },
  { id: "detailed", label: "Detailed Analysis", icon: faSearch, description: "Comprehensive visual analysis" },
  { id: "ocr", label: "Text Extraction", icon: faTextWidth, description: "Extract all text from image" },
  { id: "objects", label: "Object Detection", icon: faObjectGroup, description: "Identify objects and items" },
  { id: "scene", label: "Scene Analysis", icon: faMountain, description: "Scene context and setting" },
  { id: "chart", label: "Chart Analysis", icon: faChartBar, description: "Analyze charts and graphs" },
  { id: "document", label: "Document Analysis", icon: faFileAlt, description: "Document structure and content" },
];

const ALL_ANALYSIS_TYPES = ANALYSIS_TYPES.filter(type => type.id !== "all");

const ImageInsightGenerator = ({ fileData, analysisData, imageFile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("general");
  const [insights, setInsights] = useState(null);
  const [parsedInsights, setParsedInsights] = useState(null);
  const [allInsights, setAllInsights] = useState(null);
  const [ocrContext, setOcrContext] = useState(null);
  const [ocrRawText, setOcrRawText] = useState(null);
  const [objectsJson, setObjectsJson] = useState(null);
  const [generalStructuredData, setGeneralStructuredData] = useState(null);
  const [error, setError] = useState(null);
  const [cachedImageFile, setCachedImageFile] = useState(null);
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
          if (parsed.allInsights) {
          setAllInsights(parsed.allInsights);
          setIsExpanded(true);
          hasInitializedRef.current = true;
        } else if (parsed.insights) {
          setInsights(parsed.insights);
          const cachedType = parsed.analysisType || "general";
          setSelectedAnalysisType(cachedType);
          if (parsed.parsedInsights) {
            setParsedInsights(parsed.parsedInsights);
          } else {
            const parsedData = parseImageInsights(parsed.insights);
            setParsedInsights(parsedData);
          }
            if (parsed.ocrContext) {
              setOcrContext(parsed.ocrContext);
            }
          setIsExpanded(true);
          hasInitializedRef.current = true;
        }
      }
      // Removed automatic loading from analysisData - user must click button to analyze
    } catch (err) {
      console.error('Failed to load cached insights:', err);
    }
  }, [cacheKey]);

  // Save insights to cache whenever they change
  useEffect(() => {
    if (insights || allInsights) {
      try {
        const toCache = {
          insights,
          parsedInsights,
          allInsights,
          analysisType: selectedAnalysisType,
          ocrContext,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch (err) {
        console.error('Failed to cache insights:', err);
      }
    }
  }, [insights, parsedInsights, allInsights, selectedAnalysisType, cacheKey, ocrContext]);

  useEffect(() => {
    if ((insights || allInsights) && !isGenerating && !error) {
      setIsExpanded(true);
    }
  }, [insights, allInsights, isGenerating, error]);

  // Cache the image file from URL if needed
  useEffect(() => {
    // If we already have the file, use it
    if (imageFile) {
      setCachedImageFile(imageFile);
      return;
    }

    // If we have an imageUrl and haven't loaded it yet, convert it to a File object
    if (analysisData.imageUrl && !cachedImageFile && !isLoadingFileRef.current) {
      isLoadingFileRef.current = true;
      urlToFile(
        analysisData.imageUrl,
        fileData.fileName || 'image.jpg',
        fileData.fileType || 'image/jpeg'
      )
        .then((file) => {
          setCachedImageFile(file);
        })
        .catch((err) => {
          console.error('Failed to load image file from URL:', err);
        })
        .finally(() => {
          isLoadingFileRef.current = false;
        });
    }
  }, [imageFile, analysisData.imageUrl, fileData.fileName, fileData.fileType]);

  const handleGenerateInsights = async () => {
    // Use cached file or provided file
    let fileToUse = cachedImageFile || imageFile;

    // If we don't have a file yet but have an imageUrl, try to load it
    if (!fileToUse && analysisData.imageUrl) {
      setIsGenerating(true);
      setError(null);
      setInsights(null);
      
      try {
        fileToUse = await urlToFile(
          analysisData.imageUrl,
          fileData.fileName || 'image.jpg',
          fileData.fileType || 'image/jpeg'
        );
        setCachedImageFile(fileToUse);
      } catch (err) {
        console.error('Failed to load image file:', err);
        setError(`Failed to load image: ${err.message}`);
        setIsGenerating(false);
        return;
      }
    }

    if (!fileToUse) {
      setError("Image file not available. Please refresh the page and upload the image again.");
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
    setInsights(null);
    setParsedInsights(null);
    setAllInsights(null);
    setOcrRawText(null);
    setOcrContext(null);

    try {
      // Log file info for debugging
      console.log('Sending file for analysis:', {
        name: fileToUse.name,
        size: fileToUse.size,
        type: fileToUse.type,
        isFile: fileToUse instanceof File,
        analysisType: selectedAnalysisType,
      });

      // Check if user wants to analyze all types
      if (selectedAnalysisType === "all") {
        const results = {};
        let completedCount = 0;
        const totalTypes = ALL_ANALYSIS_TYPES.length;

        // Run all analysis types sequentially
        for (const type of ALL_ANALYSIS_TYPES) {
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
                // Update progress for this specific type
                results[type.id] = {
                  type: type.label,
                  icon: type.icon,
                  content: fullResponse,
                };
                setAllInsights({ ...results });
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
                if (type.id === "objects") {
                  setObjectsJson(jsonData);
                }
              }
            );
            if (typeof result === 'object' && result.rawText) {
              rawTextResponse = result.rawText;
              fullResponse = result.text || fullResponse;
            } else if (typeof result === 'string') {
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
            if (type.id === "ocr" && rawTextResponse) {
              setOcrRawText(rawTextResponse);
            }
            completedCount++;
            setAllInsights({ ...results });
          } catch (err) {
            console.error(`Error analyzing ${type.id}:`, err);
            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: `Error: ${err.message || 'Failed to analyze'}`,
              error: true,
            };
            completedCount++;
            setAllInsights({ ...results });
          }
        }
      } else {
        // Single analysis type
        let fullResponse = "";
        let rawTextResponse = "";
        let latestContext = null;

        const result = await analyzeImageStream(
              fileToUse,
              {
                analysisType: selectedAnalysisType,
              },
              (chunk) => {
                fullResponse += chunk;
                setInsights(fullResponse);
                // Only parse on chunk for scene analysis to update UI in real-time
                // For other types, we'll parse at the end
                if (selectedAnalysisType === "scene") {
                  const parsed = parseImageInsights(fullResponse);
                  setParsedInsights(parsed);
                }
          },
          (meta) => {
            latestContext = meta;
            setOcrContext(meta);
          },
          (rawText) => {
            rawTextResponse = rawText;
            if (selectedAnalysisType === "ocr") {
              setOcrRawText(rawText);
            }
          },
          (jsonData) => {
            // Handle objects JSON, general structured data, and scene structured data
            if (selectedAnalysisType === "objects") {
              setObjectsJson(jsonData);
            } else if (selectedAnalysisType === "general") {
              setGeneralStructuredData(jsonData);
            } else if (selectedAnalysisType === "scene" || selectedAnalysisType === "chart") {
              setObjectsJson(jsonData); // Reuse objectsJson bucket for structured scene/chart data
            }
          }
            );

        if (typeof result === 'object' && result.rawText) {
          rawTextResponse = result.rawText;
          fullResponse = result.text || fullResponse;
        } else if (typeof result === 'string') {
          fullResponse = result;
        }

        setInsights(fullResponse);
        const parsed = parseImageInsights(fullResponse);
        console.log(`[ImageInsightGenerator] ${selectedAnalysisType} analysis complete:`, {
          fullResponseLength: fullResponse.length,
          parsedSectionsCount: parsed?.sections?.length || 0,
          parsedSections: parsed?.sections?.map(s => ({ name: s.name, itemsCount: s.items?.length || 0 })) || [],
          parsedIntroText: parsed?.introText?.substring(0, 100) || null
        });
        setParsedInsights(parsed);
        if (rawTextResponse && selectedAnalysisType === "ocr") {
          setOcrRawText(rawTextResponse);
        }
        if (selectedAnalysisType === "ocr" && !latestContext) {
          setOcrContext(null);
        }
      }
    } catch (err) {
      console.error("Image insight generation error:", err);
      const errorMessage = err.message || "Failed to generate image insights. Please try again.";
      setError(errorMessage);
      setInsights(null);
      setAllInsights(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedType = selectedAnalysisType === "all" 
    ? { id: "all", label: "All Analyses", icon: faLayerGroup, description: "Run all analysis types" }
    : ANALYSIS_TYPES.find((type) => type.id === selectedAnalysisType);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faImage} className={styles.icon} />
          <div>
            <h3>Image Analysis</h3>
            <p className={styles.headerSubtitle}>AI-powered visual analysis and insights</p>
          </div>
        </div>
        {(insights || allInsights) && (
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
          </button>
        )}
      </div>

      {!insights && !allInsights && !isGenerating && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            Analyze your image with AI to extract visual information, detect objects, extract text, or understand the scene context.
          </p>
          
          <div className={styles.analysisTypesGrid}>
            {/* Analyze All option */}
            <button
              className={`${styles.analysisTypeCard} ${
                selectedAnalysisType === "all" ? styles.selected : ""
              } ${styles.analyzeAllCard}`}
              onClick={() => setSelectedAnalysisType("all")}
            >
              <FontAwesomeIcon icon={faLayerGroup} className={styles.typeIcon} />
              <div className={styles.typeInfo}>
                <span className={styles.typeLabel}>Analyze All</span>
                <span className={styles.typeDescription}>Run all analysis types</span>
              </div>
            </button>
            
            {/* Individual analysis types */}
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.id}
                className={`${styles.analysisTypeCard} ${
                  selectedAnalysisType === type.id ? styles.selected : ""
                }`}
                onClick={() => setSelectedAnalysisType(type.id)}
              >
                <FontAwesomeIcon icon={type.icon} className={styles.typeIcon} />
                <div className={styles.typeInfo}>
                  <span className={styles.typeLabel}>{type.label}</span>
                  <span className={styles.typeDescription}>{type.description}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            className={styles.generateButton}
            onClick={handleGenerateInsights}
            disabled={isGenerating || (!cachedImageFile && !imageFile && analysisData.imageUrl)}
          >
            <FontAwesomeIcon icon={selectedType.icon} />
            <span>
              {(!cachedImageFile && !imageFile && analysisData.imageUrl) 
                ? "Loading image..." 
                : `Analyze Image (${selectedType.label})`}
            </span>
          </button>
        </div>
      )}

      {isGenerating && (
        <div className={styles.loadingSection}>
          <FontAwesomeIcon icon={faSpinner} className={styles.spinner} />
          <p>
            {selectedAnalysisType === "all" 
              ? "Analyzing image with all analysis types..." 
              : `Analyzing image with ${selectedType.label.toLowerCase()}...`}
          </p>
          {selectedAnalysisType === "all" && allInsights && (
            <div className={styles.progressInfo}>
              <p>Completed: {Object.keys(allInsights).length} / {ALL_ANALYSIS_TYPES.length} analyses</p>
            </div>
          )}
          <div className={styles.loadingDots}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorSection}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={handleGenerateInsights}>
            Try Again
          </button>
        </div>
      )}

      {(insights || allInsights) && isExpanded && (
        <div className={styles.insightsContent}>
          <div className={styles.previewActions}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
                setParsedInsights(null);
                setAllInsights(null);
                setError(null);
                // Clear cache when changing type
                try {
                  sessionStorage.removeItem(cacheKey);
                } catch (err) {
                  console.error('Failed to clear cache:', err);
                }
              }}
            >
              Change Analysis Type
            </button>
          </div>
          {allInsights ? (
            // Display all analyses
            <div className={styles.allInsightsContainer}>
              <div className={styles.analysisTypeBadge}>
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>All Analyses ({Object.keys(allInsights).length} completed)</span>
              </div>
              
              {Object.entries(allInsights).map(([typeId, result]) => {
                const typeInfo = ALL_ANALYSIS_TYPES.find(t => t.id === typeId);
                const parsed = parseImageInsights(result.content || result.text || '');
                console.log(`[ImageInsightGenerator] Rendering ${typeId} analysis:`, {
                  hasContent: !!(result.content || result.text),
                  contentLength: (result.content || result.text || '').length,
                  parsedSectionsCount: parsed?.sections?.length || 0
                });
                return (
                  <div key={typeId} className={styles.singleAnalysisSection}>
                    <div className={styles.analysisSectionHeader}>
                      <FontAwesomeIcon icon={typeInfo?.icon || faEye} />
                      <h4>{result.type}</h4>
                    </div>
                    {typeId === "general" && <ImageGeneralAnalysis data={parsed} rawText={result.content || result.text} />}
                    {typeId === "detailed" && <ImageDetailedAnalysis data={parsed} rawText={result.content || result.text} />}
                    {typeId === "ocr" && (
                      <ImageTextExtraction
                        data={parsed}
                        rawText={result.rawText || result.content || result.text}
                        contextMeta={result.context || ocrContext}
                      />
                    )}
                    {typeId === "objects" && (
                      <ImageObjectDetection
                        data={parsed}
                        rawText={result.objectsJson ? JSON.stringify(result.objectsJson) : (result.content || result.text)}
                        imageUrl={analysisData.imageUrl}
                        imageFile={cachedImageFile || imageFile}
                      />
                    )}
                    {typeId === "scene" && (
                      <ImageSceneAnalysis 
                        data={parsed} 
                        rawText={result.objectsJson ? JSON.stringify(result.objectsJson) : (result.content || result.text || '')} 
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
                    {typeId === "document" && <ImageDocumentAnalysis data={parsed} rawText={result.content || result.text} />}
                    {!["general", "detailed", "ocr", "objects", "scene", "chart", "document"].includes(typeId) && (
                      <div className={`${styles.insightsText} ${result.error ? styles.errorText : ''}`}>
                        {result.content.split("\n").map((line, i) => {
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <React.Fragment key={i}>
                              {parts.map((part, j) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return <strong key={j}>{part.slice(2, -2)}</strong>;
                                }
                                return <span key={j}>{part}</span>;
                              })}
                              {i < result.content.split("\n").length - 1 && <br />}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Display single analysis with preview component
            <>
              <div className={styles.analysisTypeBadge}>
                <FontAwesomeIcon icon={selectedType.icon} />
                <span>{selectedType.label}</span>
              </div>
              
              {selectedAnalysisType === "general" && parsedInsights && (
                <ImageGeneralAnalysis 
                  data={parsedInsights} 
                  rawText={insights}
                  structuredData={generalStructuredData}
                />
              )}
              {selectedAnalysisType === "detailed" && parsedInsights && (
                <ImageDetailedAnalysis data={parsedInsights} rawText={insights} />
              )}
              {selectedAnalysisType === "ocr" && parsedInsights && (
                <ImageTextExtraction
                  data={parsedInsights}
                  rawText={ocrRawText || insights}
                  contextMeta={ocrContext || analysisData.textContext}
                />
              )}
              {selectedAnalysisType === "objects" && parsedInsights && (
                <ImageObjectDetection
                  data={parsedInsights}
                  rawText={objectsJson ? JSON.stringify(objectsJson) : insights}
                  imageUrl={analysisData.imageUrl}
                  imageFile={cachedImageFile || imageFile}
                />
              )}
              {selectedAnalysisType === "scene" && (
                <ImageSceneAnalysis 
                  data={parsedInsights} 
                  rawText={objectsJson ? JSON.stringify(objectsJson) : insights} 
                />
              )}
              {selectedAnalysisType === "chart" && parsedInsights && (
                <ImageChartAnalysis
                  data={parsedInsights}
                  rawText={
                    objectsJson ? JSON.stringify(objectsJson) : insights
                  }
                />
              )}
              {selectedAnalysisType === "document" && parsedInsights && (
                <ImageDocumentAnalysis data={parsedInsights} rawText={insights} />
              )}
              {!parsedInsights && insights && (
                <div className={styles.insightsText}>
                  {insights.split("\n").map((line, i) => {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <React.Fragment key={i}>
                        {parts.map((part, j) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                        {i < insights.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className={styles.actionsRow}>
            <button
              className={styles.regenerateButton}
              onClick={handleGenerateInsights}
              disabled={isGenerating}
            >
              <FontAwesomeIcon icon={selectedType.icon} />
              <span>Regenerate Analysis</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageInsightGenerator;

