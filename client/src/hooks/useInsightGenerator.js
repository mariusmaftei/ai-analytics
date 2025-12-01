import { useState, useEffect, useRef } from "react";

export const useInsightGenerator = ({
  fileData,
  cachePrefix,
  defaultAnalysisType = "overview",
}) => {
  const [selectedAnalysisType, setSelectedAnalysisType] =
    useState(defaultAnalysisType);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [completedAnalyses, setCompletedAnalyses] = useState({});
  const [expandedAnalyses, setExpandedAnalyses] = useState({});
  const [expandedAllInsights, setExpandedAllInsights] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalysisSelector, setShowAnalysisSelector] = useState(false);
  const [allInsights, setAllInsights] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
    currentType: null,
  });
  const hasInitializedRef = useRef(false);

  const cacheKey = `${cachePrefix}_insights_${fileData.fileName}_${fileData.fileSize}`;

  useEffect(() => {
    const hasData = Object.keys(completedAnalyses).length > 0 || allInsights;
    if (hasInitializedRef.current && hasData) {
      return;
    }

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed.completedAnalyses &&
          Object.keys(parsed.completedAnalyses).length > 0
        ) {
          setCompletedAnalyses(parsed.completedAnalyses);
          if (parsed.expandedAnalyses) {
            setExpandedAnalyses(parsed.expandedAnalyses);
          }
          setIsExpanded(true);
          hasInitializedRef.current = true;
        } else if (
          parsed.allInsights &&
          Object.keys(parsed.allInsights).length > 0
        ) {
          setAllInsights(parsed.allInsights);
          setIsExpanded(true);
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
      console.error(`Error restoring ${cachePrefix} insights from cache:`, err);
    }
  }, [cacheKey, cachePrefix, completedAnalyses, allInsights]);

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
        console.error(`Error caching ${cachePrefix} insights:`, err);
      }
    }
  }, [
    completedAnalyses,
    expandedAnalyses,
    allInsights,
    expandedAllInsights,
    cacheKey,
    cachePrefix,
  ]);

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
  }, [
    completedAnalyses,
    allInsights,
    isGenerating,
    error,
    expandedAnalyses,
    showAnalysisSelector,
  ]);

  const toggleExpanded = () => {
    if (allInsights) {
      const allExpanded = Object.keys(allInsights).every(
        (key) => expandedAllInsights[key] !== false
      );
      const newState = {};
      Object.keys(allInsights).forEach((key) => {
        newState[key] = !allExpanded;
      });
      setExpandedAllInsights(newState);
    } else {
      const allExpanded = Object.keys(completedAnalyses).every(
        (key) => expandedAnalyses[key]
      );
      const newState = {};
      Object.keys(completedAnalyses).forEach((key) => {
        newState[key] = !allExpanded;
      });
      setExpandedAnalyses(newState);
    }
  };

  const removeAnalysis = (typeId) => {
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
  };

  return {
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
    setIsExpanded,
    showAnalysisSelector,
    setShowAnalysisSelector,
    allInsights,
    setAllInsights,
    analysisProgress,
    setAnalysisProgress,
    toggleExpanded,
    removeAnalysis,
  };
};

