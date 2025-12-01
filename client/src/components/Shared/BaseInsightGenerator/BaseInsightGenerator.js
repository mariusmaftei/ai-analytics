import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faSpinner,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { useInsightGenerator } from "../../../hooks/useInsightGenerator";
import AnalysisTypeCard from "../AnalysisTypeCard/AnalysisTypeCard";
import LoadingSection from "../LoadingSection/LoadingSection";
import ExpandableSectionHeader from "../ExpandableSectionHeader/ExpandableSectionHeader";
import styles from "./BaseInsightGenerator.module.css";

const BaseInsightGenerator = ({
  fileData,
  analysisData,
  config,
}) => {
  const {
    analysisTypes,
    allAnalysisTypes,
    defaultAnalysisType = "overview",
    cachePrefix,
    accentColor,
    fileTypeName,
    headerIcon,
    headerTitle,
    headerSubtitle,
    promptText,
    validateData,
    performAnalysis,
    parseInsights,
    renderPreviewComponent,
    generateButtonText,
    loadingMessage,
    additionalProps = {},
  } = config;

  const {
    selectedAnalysisType,
    setSelectedAnalysisType,
    isGenerating,
    setIsGenerating,
    error,
    setError,
    completedAnalyses,
    setCompletedAnalyses,
    expandedAnalyses,
    setExpandedAnalyses,
    expandedAllInsights,
    setExpandedAllInsights,
    isExpanded,
    showAnalysisSelector,
    setShowAnalysisSelector,
    allInsights,
    setAllInsights,
    analysisProgress,
    setAnalysisProgress,
    toggleExpanded,
    removeAnalysis,
  } = useInsightGenerator({
    fileData,
    cachePrefix,
    defaultAnalysisType,
  });

  const selectedType =
    selectedAnalysisType === "all"
      ? {
          id: "all",
          label: "All Analyses",
          icon: faLayerGroup,
          description: "Run all analysis types",
        }
      : analysisTypes.find((type) => type.id === selectedAnalysisType);

  const handleGenerate = async () => {
    if (validateData) {
      const isValid = validateData(analysisData, false, additionalProps);
      if (!isValid) {
        const errorMsg = validateData(analysisData, true, additionalProps);
        setError(errorMsg || "Validation failed. Please check your data.");
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    setAllInsights(null);
    setExpandedAllInsights({});
    setShowAnalysisSelector(false);

    try {
      if (selectedAnalysisType === "all") {
        const results = {};
        const totalTypes = allAnalysisTypes.length;

        setAnalysisProgress({
          current: 0,
          total: totalTypes,
          currentType: null,
        });

        for (let i = 0; i < allAnalysisTypes.length; i++) {
          const type = allAnalysisTypes[i];

          setAnalysisProgress({
            current: i,
            total: totalTypes,
            currentType: type.label,
          });

          try {
            const result = await performAnalysis(
              type,
              analysisData,
              fileData,
              additionalProps
            );
            parseInsights(result.content || result.text || "");

            results[type.id] = {
              type: type.label,
              icon: type.icon,
              content: result.content || result.text || "",
              ...result,
            };

            setAllInsights({ ...results });

            setAnalysisProgress({
              current: i + 1,
              total: totalTypes,
              currentType: type.label,
            });

            setExpandedAllInsights((prev) => ({
              ...prev,
              [type.id]: true,
            }));
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

            setAnalysisProgress({
              current: i + 1,
              total: totalTypes,
              currentType: type.label,
            });
          }
        }

        setAnalysisProgress({ current: 0, total: 0, currentType: null });
      } else {
        const result = await performAnalysis(
          selectedType,
          analysisData,
          fileData,
          additionalProps
        );
        const parsed = parseInsights(result.content || result.text || "");

        const analysisResult = {
          insights: result.content || result.text || "",
          parsedInsights: parsed,
          ...result,
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
      console.error(`${fileTypeName} insight generation error:`, err);
      setError(
        err.message || `Failed to generate ${fileTypeName} insights. Please try again.`
      );
      setAllInsights(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const getToggleIcon = () => {
    if (Object.keys(completedAnalyses).length > 0) {
      return Object.values(expandedAnalyses).every((v) => v)
        ? faChevronUp
        : faChevronDown;
    } else if (allInsights) {
      return Object.keys(allInsights).every(
        (key) => expandedAllInsights[key] !== false
      )
        ? faChevronUp
        : faChevronDown;
    }
    return isExpanded ? faChevronUp : faChevronDown;
  };

  const getColorClass = () => {
    if (accentColor === "#f97316") return "orange";
    if (accentColor === "#22c55e") return "green";
    if (accentColor === "#3b82f6") return "blue";
    return "orange";
  };

  return (
    <div
      className={`${styles.container} ${styles[getColorClass()]}`}
      style={{ "--accent-color": accentColor }}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={headerIcon} className={styles.icon} />
          <div>
            <h3>{headerTitle}</h3>
            {headerSubtitle && <p className={styles.headerSubtitle}>{headerSubtitle}</p>}
          </div>
        </div>
        {(Object.keys(completedAnalyses).length > 0 || allInsights) && (
          <button
            className={styles.toggleButton}
            onClick={toggleExpanded}
            aria-label="Toggle insights"
          >
            <FontAwesomeIcon icon={getToggleIcon()} />
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
              {Object.keys(completedAnalyses).length} analysis type
              {Object.keys(completedAnalyses).length !== 1 ? "s" : ""} completed.
              Click on a completed card above to view insights.
            </p>
          )}
          <p className={styles.promptText}>{promptText}</p>

          <div className={styles.analysisTypesGrid}>
            <AnalysisTypeCard
              type={{
                id: "all",
                label: "Analyze All",
                icon: faLayerGroup,
                description: "Run all analysis types",
              }}
              isSelected={selectedAnalysisType === "all"}
              onClick={() => setSelectedAnalysisType("all")}
              disabled={isGenerating}
              isAnalyzeAll={true}
              accentColor={accentColor}
            />

            {analysisTypes.map((type) => (
              <AnalysisTypeCard
                key={type.id}
                type={type}
                isSelected={selectedAnalysisType === type.id}
                isCompleted={!!completedAnalyses[type.id]}
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
                accentColor={accentColor}
              />
            ))}
          </div>

          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (validateData && !validateData(analysisData, false, additionalProps))
            }
            style={{ "--accent-color": accentColor }}
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
                    : generateButtonText
                    ? generateButtonText(selectedType)
                    : `Generate ${selectedType.label}`}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <LoadingSection
        isLoading={isGenerating}
        error={error}
        onRetry={handleGenerate}
        progress={
          selectedAnalysisType === "all" && analysisProgress.total > 0
            ? {
                ...analysisProgress,
                color: accentColor === "#f97316" ? "orange" : accentColor === "#22c55e" ? "green" : "blue",
              }
            : null
        }
        loadingMessage={
          selectedAnalysisType === "all"
            ? null
            : loadingMessage
            ? loadingMessage(selectedType)
            : `Analyzing ${fileTypeName} with ${selectedType.label.toLowerCase()}...`
        }
        accentColor={accentColor}
        fileType={fileTypeName}
      />

      {(Object.keys(completedAnalyses).length > 0 ||
        (allInsights && !isGenerating)) &&
        !showAnalysisSelector && (
          <div className={styles.insightsContent}>
            <div className={styles.previewActions}>
              <button
                className={styles.changeTypeButton}
                onClick={() => {
                  setShowAnalysisSelector(true);
                  setExpandedAnalyses({});
                }}
                style={{ "--accent-color": accentColor }}
              >
                Change Analysis Type
              </button>
            </div>

            {Object.keys(completedAnalyses).length > 0 && !allInsights && (
              <div className={styles.completedAnalysesList}>
                {Object.entries(completedAnalyses).map(
                  ([typeId, analysisResult]) => {
                    const typeInfo = analysisTypes.find((t) => t.id === typeId);
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
                              icon={typeInfo?.icon || headerIcon}
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
                              removeAnalysis(typeId);
                            }}
                            title="Remove this analysis"
                          >
                            ×
                          </button>
                        </div>

                        {isExpanded && (
                          <div className={styles.analysisContent}>
                            {renderPreviewComponent(
                              typeId,
                              analysisResult.parsedInsights,
                              analysisResult.insights,
                              fileData,
                              analysisData,
                              analysisResult
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
                  const typeInfo = allAnalysisTypes.find((t) => t.id === typeId);
                  const parsed = parseInsights(
                    result.content || result.text || ""
                  );
                  const isExpanded = expandedAllInsights[typeId] !== false;

                  return (
                    <div key={typeId} className={styles.singleAnalysisSection}>
                      <ExpandableSectionHeader
                        isExpanded={isExpanded}
                        onToggle={() => {
                          setExpandedAllInsights((prev) => ({
                            ...prev,
                            [typeId]: !prev[typeId],
                          }));
                        }}
                        icon={typeInfo?.icon || headerIcon}
                        title={result.type}
                        accentColor={accentColor}
                      />
                      {isExpanded && (
                        <div className={styles.analysisContent}>
                          {result.error ? (
                            <div className={styles.errorText}>{result.content}</div>
                          ) : (
                            renderPreviewComponent(
                              typeId,
                              parsed,
                              result.content || result.text || "",
                              fileData,
                              analysisData,
                              result
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

export default BaseInsightGenerator;

