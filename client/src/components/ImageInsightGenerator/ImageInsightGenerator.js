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
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("all");
  const [insights, setInsights] = useState(null);
  const [allInsights, setAllInsights] = useState(null);
  const [error, setError] = useState(null);
  const [cachedImageFile, setCachedImageFile] = useState(null);
  const isLoadingFileRef = useRef(false);

  // Generate a unique cache key based on file name and size
  const cacheKey = `image_insights_${fileData.fileName}_${fileData.fileSize}`;

  // Load cached insights on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.allInsights) {
          setAllInsights(parsed.allInsights);
          setIsExpanded(true);
        } else if (parsed.insights) {
          setInsights(parsed.insights);
          setSelectedAnalysisType(parsed.analysisType || "all");
          setIsExpanded(true);
        }
      }
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
          allInsights,
          analysisType: selectedAnalysisType,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch (err) {
        console.error('Failed to cache insights:', err);
      }
    }
  }, [insights, allInsights, selectedAnalysisType, cacheKey]);

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
    setAllInsights(null);

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
            await analyzeImageStream(
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
              }
            );
            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: fullResponse,
            };
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

        await analyzeImageStream(
          fileToUse,
          {
            analysisType: selectedAnalysisType,
          },
          (chunk) => {
            fullResponse += chunk;
            setInsights(fullResponse);
          }
        );

        setInsights(fullResponse);
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
          {allInsights ? (
            // Display all analyses
            <div className={styles.allInsightsContainer}>
              <div className={styles.analysisTypeBadge}>
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>All Analyses ({Object.keys(allInsights).length} completed)</span>
              </div>
              
              {Object.entries(allInsights).map(([typeId, result]) => {
                const typeInfo = ALL_ANALYSIS_TYPES.find(t => t.id === typeId);
                return (
                  <div key={typeId} className={styles.singleAnalysisSection}>
                    <div className={styles.analysisSectionHeader}>
                      <FontAwesomeIcon icon={typeInfo?.icon || faEye} />
                      <h4>{result.type}</h4>
                    </div>
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
                  </div>
                );
              })}
            </div>
          ) : (
            // Display single analysis
            <>
              <div className={styles.analysisTypeBadge}>
                <FontAwesomeIcon icon={selectedType.icon} />
                <span>{selectedType.label}</span>
              </div>
              
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
            </>
          )}

          <div className={styles.actionsRow}>
            <button
              className={styles.changeTypeButton}
              onClick={() => {
                setInsights(null);
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
            <button
              className={styles.regenerateButton}
              onClick={handleGenerateInsights}
              disabled={isGenerating}
            >
              <FontAwesomeIcon icon={selectedType.icon} />
              <span>Regenerate Analysis</span>
            </button>
            <button
              className={styles.clearCacheButton}
              onClick={() => {
                setInsights(null);
                setAllInsights(null);
                setError(null);
                setIsExpanded(false);
                // Clear cache
                try {
                  sessionStorage.removeItem(cacheKey);
                } catch (err) {
                  console.error('Failed to clear cache:', err);
                }
              }}
              title="Clear cached results"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageInsightGenerator;

