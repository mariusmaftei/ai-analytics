import React, { useState, useEffect, useRef } from "react";
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
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { generateInsights } from "../../services/insightService";
import { parseCSVInsights } from "./utils/csvInsightParser";
import CSVOverview from "../CSVInsightsPreview/CSVOverview/CSVOverview";
import CSVStatisticalAnalysis from "../CSVInsightsPreview/CSVStatisticalAnalysis/CSVStatisticalAnalysis";
import CSVPatternDetection from "../CSVInsightsPreview/CSVPatternDetection/CSVPatternDetection";
import CSVDataQuality from "../CSVInsightsPreview/CSVDataQuality/CSVDataQuality";
import CSVTrendsAnalysis from "../CSVInsightsPreview/CSVTrendsAnalysis/CSVTrendsAnalysis";
import CSVCorrelationAnalysis from "../CSVInsightsPreview/CSVCorrelationAnalysis/CSVCorrelationAnalysis";
import ProgressBar from "../Shared/ProgressBar/ProgressBar";
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

const ALL_ANALYSIS_TYPES = ANALYSIS_TYPES;

const CSVInsightGenerator = ({ fileData, analysisData }) => {
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

  const cacheKey = `csv_insights_${fileData.fileName}_${fileData.fileSize}`;

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
        }
      }
    } catch (err) {
    }
  }, [cacheKey]);

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
    setAllInsights(null);
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
                // Don't update allInsights during streaming to avoid showing partial results
              }
            );
            const parsed = parseCSVInsights(fullResponse);
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

            // Don't add to completedAnalyses when doing "Analyze All" to avoid duplicates
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

        const parsed = parseCSVInsights(fullResponse);

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
      console.error("CSV insight generation error:", err);
      setError(err.message || "Failed to generate CSV insights. Please try again.");
      setAllInsights(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreviewComponent = (typeId, data, rawText) => {
    switch (typeId) {
      case "overview":
        return <CSVOverview data={data} rawText={rawText} />;
      case "statistical":
        return <CSVStatisticalAnalysis data={data} rawText={rawText} />;
      case "patterns":
        return <CSVPatternDetection data={data} rawText={rawText} />;
      case "quality":
        return <CSVDataQuality data={data} rawText={rawText} />;
      case "trends":
        return <CSVTrendsAnalysis data={data} rawText={rawText} />;
      case "correlation":
        return <CSVCorrelationAnalysis data={data} rawText={rawText} />;
      default:
        return <pre>{rawText}</pre>;
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
              color="green"
              fileType="CSV"
            />
          ) : (
            <p>Analyzing CSV data with {selectedType.label.toLowerCase()}...</p>
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
                              icon={typeInfo?.icon || faTable}
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
                            {analysisData.parsedInsights &&
                              renderPreviewComponent(
                                typeId,
                                analysisData.parsedInsights,
                                analysisData.insights
                              )}
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
                  <FontAwesomeIcon icon={faLayerGroup} />
                  <span>
                    All Analyses ({Object.keys(allInsights).length} completed)
                  </span>
                </div>

                {Object.entries(allInsights).map(([typeId, result]) => {
                  const typeInfo = ALL_ANALYSIS_TYPES.find(
                    (t) => t.id === typeId
                  );
                  const parsed = parseCSVInsights(
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
                        <FontAwesomeIcon icon={typeInfo?.icon || faTable} />
                        <h4>{result.type}</h4>
                      </div>
                      {isExpanded && (
                        <div className={styles.analysisContent}>
                          {result.error ? (
                            <div className={styles.errorText}>{result.content}</div>
                          ) : (
                            renderPreviewComponent(
                              typeId,
                              parsed,
                              result.content || result.text
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

export default CSVInsightGenerator;
