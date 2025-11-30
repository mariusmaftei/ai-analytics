import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faFileAlt,
  faSearch,
  faLayerGroup,
  faKey,
  faInfoCircle,
  faSitemap,
  faLayerGroup as faAll,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parsePDFInsights } from "./utils/pdfInsightParser";
import PDFOverview from "../PDFInsightsPreview/PDFOverview/PDFOverview";
import PDFSummary from "../PDFInsightsPreview/PDFSummary/PDFSummary";
import PDFContentAnalysis from "../PDFInsightsPreview/PDFContentAnalysis/PDFContentAnalysis";
import PDFStructureAnalysis from "../PDFInsightsPreview/PDFStructureAnalysis/PDFStructureAnalysis";
import PDFMetadataAnalysis from "../PDFInsightsPreview/PDFMetadataAnalysis/PDFMetadataAnalysis";
import PDFKeywordsExtraction from "../PDFInsightsPreview/PDFKeywordsExtraction/PDFKeywordsExtraction";
import ProgressBar from "../Shared/ProgressBar/ProgressBar";
import styles from "./PDFInsightGenerator.module.css";

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

const ALL_ANALYSIS_TYPES = ANALYSIS_TYPES;

const PDFInsightGenerator = ({ fileData, analysisData }) => {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [completedAnalyses, setCompletedAnalyses] = useState({});
  const [expandedAnalyses, setExpandedAnalyses] = useState({});
  const [expandedAllInsights, setExpandedAllInsights] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalysisSelector, setShowAnalysisSelector] = useState(false);
  const [allInsights, setAllInsights] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, currentType: null });
  const hasInitializedRef = useRef(false);

  const cacheKey = `pdf_insights_${fileData.fileName}_${fileData.fileSize}`;

  useEffect(() => {
    // Only restore from cache if we don't already have data loaded
    // Check if state is empty, not just if ref is set (ref persists across unmounts)
    // This allows cache restoration when component remounts after being hidden
    const hasData = Object.keys(completedAnalyses).length > 0 || allInsights;
    if (hasInitializedRef.current && hasData) {
      return;
    }

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.completedAnalyses && Object.keys(parsed.completedAnalyses).length > 0) {
          setCompletedAnalyses(parsed.completedAnalyses);
          if (parsed.expandedAnalyses) {
            setExpandedAnalyses(parsed.expandedAnalyses);
          }
          setIsExpanded(true);
          hasInitializedRef.current = true;
        } else if (parsed.allInsights && Object.keys(parsed.allInsights).length > 0) {
          setAllInsights(parsed.allInsights);
          setIsExpanded(true);
          // Initialize all sections as expanded when restoring from cache
          if (parsed.expandedAllInsights) {
            setExpandedAllInsights(parsed.expandedAllInsights);
          } else {
            const allExpanded = {};
            Object.keys(parsed.allInsights).forEach((key) => {
              allExpanded[key] = true;
            });
            setExpandedAllInsights(allExpanded);
          }
          hasInitializedRef.current = true;
        }
      }
    } catch (err) {
      console.error('Error restoring PDF insights from cache:', err);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (Object.keys(completedAnalyses).length > 0 || allInsights) {
      try {
        const toCache = {
          completedAnalyses,
          expandedAnalyses,
          allInsights,
          expandedAllInsights,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch (err) {
      }
    }
  }, [completedAnalyses, expandedAnalyses, allInsights, expandedAllInsights, cacheKey]);

  useEffect(() => {
    if (
      (Object.keys(completedAnalyses).length > 0 || allInsights) &&
      !isGenerating &&
      !error
    ) {
      setIsExpanded(true);
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
  }, [completedAnalyses, allInsights, isGenerating, error, expandedAnalyses, showAnalysisSelector]);

  const selectedType =
    selectedAnalysisType === "all"
      ? {
          id: "all",
          label: "All Analyses",
          icon: faAll,
          description: "Run all analysis types",
        }
      : ANALYSIS_TYPES.find((type) => type.id === selectedAnalysisType);

  const handleGenerate = async () => {
    if (!analysisData.text) {
      setError("PDF text is not available. Please upload the file again.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAllInsights(null);
    setExpandedAllInsights({});
    setShowAnalysisSelector(false);

    try {
      if (selectedAnalysisType === "all") {
        const results = {};
        const totalTypes = ALL_ANALYSIS_TYPES.length;
        
        // Initialize progress
        setAnalysisProgress({ current: 0, total: totalTypes, currentType: null });

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
                // Don't update allInsights during streaming to avoid showing partial results
              }
            );
            const parsed = parsePDFInsights(fullResponse);
            const analysisResult = {
              insights: fullResponse,
              parsedInsights: parsed,
            };

            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: fullResponse,
            };
            
            // Only update allInsights after each analysis is complete
            setAllInsights({ ...results });

            // Update progress after completion
            setAnalysisProgress({ 
              current: i + 1, 
              total: totalTypes, 
              currentType: type.label 
            });

            // Initialize all sections as expanded by default
            setExpandedAllInsights((prev) => ({
              ...prev,
              [type.id]: true,
            }));

            // Don't add to completedAnalyses when doing "Analyze All" to avoid duplicates
          } catch (err) {
            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: `Error: ${err.message || "Failed to analyze"}`,
              error: true,
            };
            setAllInsights({ ...results });
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
        let fullResponse = "";

        await generateInsights(
          {
            fileType: "PDF",
            text: analysisData.text,
            metadata: analysisData.metadata || {},
            tables: analysisData.tables || [],
            analysisType: selectedAnalysisType,
            temperature: 0.7,
            max_tokens: 2048,
          },
          (chunk) => {
            fullResponse += chunk;
          }
        );

        const parsed = parsePDFInsights(fullResponse);

        const analysisResult = {
          insights: fullResponse,
          parsedInsights: parsed,
        };

        setCompletedAnalyses((prev) => ({
          ...prev,
          [selectedAnalysisType]: analysisResult,
        }));
        setExpandedAnalyses((prev) => ({
          ...prev,
          [selectedAnalysisType]: true,
        }));
      }
    } catch (err) {
      console.error("PDF insight generation error:", err);
      setError(err.message || "Failed to generate PDF insights. Please try again.");
      setAllInsights(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreviewComponent = (typeId, data, rawText) => {
    switch (typeId) {
      case "overview":
        return <PDFOverview data={data} rawText={rawText} fileData={fileData} analysisData={analysisData} />;
      case "summary":
        return <PDFSummary data={data} rawText={rawText} analysisData={analysisData} />;
      case "content":
        return <PDFContentAnalysis data={data} rawText={rawText} analysisData={analysisData} />;
      case "structure":
        return <PDFStructureAnalysis data={data} rawText={rawText} analysisData={analysisData} />;
      case "metadata":
        return <PDFMetadataAnalysis data={data} rawText={rawText} analysisData={analysisData} />;
      case "keywords":
        return <PDFKeywordsExtraction data={data} rawText={rawText} analysisData={analysisData} />;
      default:
        return <pre>{rawText}</pre>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faFilePdf} className={styles.icon} />
          <div>
            <h3>PDF Analysis</h3>
            <p className={styles.headerSubtitle}>
              AI-powered document analysis and insights
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
          {Object.keys(completedAnalyses).length > 0 && (
            <p className={styles.completedHint}>
              {Object.keys(completedAnalyses).length} analysis type{Object.keys(completedAnalyses).length !== 1 ? 's' : ''} completed. Click on a completed card above to view insights.
            </p>
          )}
          <p className={styles.promptText}>
            Analyze your PDF document with AI to extract insights, understand
            content structure, identify key information, or extract metadata.
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
                icon={faAll}
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
                } ${completedAnalyses[type.id] ? styles.completed : ""}`}
                onClick={() => {
                  setSelectedAnalysisType(type.id);
                  if (completedAnalyses[type.id]) {
                    setExpandedAnalyses({ [type.id]: true });
                    setShowAnalysisSelector(false);
                  } else {
                    setExpandedAnalyses({});
                  }
                }}
                disabled={isGenerating}
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
            onClick={handleGenerate}
            disabled={isGenerating || !analysisData.text}
          >
            {isGenerating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Generating Insights...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={selectedType.icon} />
                <span>
                  {completedAnalyses[selectedAnalysisType]
                    ? `Re-run Analysis (${selectedType.label})`
                    : `Generate ${selectedType.label}`}
                </span>
              </>
            )}
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
              color="orange"
              fileType="PDF"
            />
          ) : (
            <p>Analyzing PDF with {selectedType.label.toLowerCase()}...</p>
          )}
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

            {Object.keys(completedAnalyses).length > 0 && !allInsights && (
              <div className={styles.completedAnalysesList}>
                {Object.entries(completedAnalyses).map(
                  ([typeId, analysisResult]) => {
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
                              icon={typeInfo?.icon || faFileAlt}
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
                            {analysisResult.parsedInsights &&
                              (typeId === "summary" ? (
                                <PDFSummary 
                                  data={analysisResult.parsedInsights} 
                                  rawText={analysisResult.insights}
                                  analysisData={analysisData}
                                />
                              ) : typeId === "content" ? (
                                <PDFContentAnalysis 
                                  data={analysisResult.parsedInsights} 
                                  rawText={analysisResult.insights}
                                  analysisData={analysisData}
                                />
                              ) : (
                                renderPreviewComponent(
                                  typeId,
                                  analysisResult.parsedInsights,
                                  analysisResult.insights
                                )
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {allInsights && (
              <div className={styles.allInsightsContainer}>
                <div className={styles.analysisTypeBadge}>
                  <FontAwesomeIcon icon={faAll} />
                  <span>
                    All Analyses ({Object.keys(allInsights).length} completed)
                  </span>
                </div>

                {Object.entries(allInsights).map(([typeId, result]) => {
                  const typeInfo = ALL_ANALYSIS_TYPES.find(
                    (t) => t.id === typeId
                  );
                  const parsed = parsePDFInsights(
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
                        <FontAwesomeIcon icon={typeInfo?.icon || faFileAlt} />
                        <h4>{result.type}</h4>
                      </div>
                      {isExpanded && (
                        <div className={styles.analysisContent}>
                          {result.error ? (
                            <div className={styles.errorText}>{result.content}</div>
                          ) : (
                            typeId === "overview" ? (
                              <PDFOverview 
                                data={parsed} 
                                rawText={result.content || result.text}
                                fileData={fileData}
                                analysisData={analysisData}
                              />
                            ) : typeId === "summary" ? (
                              <PDFSummary 
                                data={parsed} 
                                rawText={result.content || result.text}
                                analysisData={analysisData}
                              />
                            ) : typeId === "content" ? (
                              <PDFContentAnalysis 
                                data={parsed} 
                                rawText={result.content || result.text}
                                analysisData={analysisData}
                              />
                            ) : (
                              renderPreviewComponent(
                                typeId,
                                parsed,
                                result.content || result.text
                              )
                            )
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

export default PDFInsightGenerator;

