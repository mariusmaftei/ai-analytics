import { useState } from "react";
import { generateInsights } from "../../../services/insightService";
import { parseInsights } from "../utils/insightParser";

export const useInsightGenerator = (fileData, analysisData, tables) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [structuredInsights, setStructuredInsights] = useState([]);
  const [insightMetrics, setInsightMetrics] = useState({});
  const [documentDescription, setDocumentDescription] = useState(null);
  const [error, setError] = useState(null);


  const generateInsightsHandler = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const isCSV = analysisData.fileType === "CSV";
      let fullResponse = "";

      // Debug: Log data being sent
      console.log("[InsightGenerator] Generating insights for:", {
        fileType: analysisData.fileType,
        isCSV,
        hasData: isCSV ? !!analysisData.data : !!analysisData.text,
        dataLength: isCSV ? analysisData.data?.length : analysisData.text?.length,
        columns: isCSV ? analysisData.columns : null,
        metadata: analysisData.metadata,
      });

      // Call backend endpoint - prompts are built server-side for security
      await generateInsights(
        {
          fileType: analysisData.fileType,
          csvData: isCSV ? analysisData.data : null,
          columns: isCSV ? analysisData.columns : null,
          metadata: analysisData.metadata || {},
          text: analysisData.text || "",
          tables: tables || [],
          temperature: isCSV ? 0.3 : 0.7, // Lower temperature for CSV for more structured output
          max_tokens: isCSV ? 4096 : 2048, // More tokens for CSV to allow comprehensive insights
        },
        (chunk) => {
          fullResponse += chunk;
          setInsights(fullResponse);
          const parsed = parseInsights(fullResponse);
          setStructuredInsights(parsed.categories);
          setInsightMetrics(parsed.metrics);
          setDocumentDescription(parsed.description);
        }
      );

      console.log("[InsightGenerator] Full AI Response:", fullResponse);
      console.log("[InsightGenerator] Response length:", fullResponse.length);
      console.log("[InsightGenerator] Response preview (first 1000 chars):", fullResponse.substring(0, 1000));
      
      setInsights(fullResponse);
      const finalParsed = parseInsights(fullResponse);
      
      console.log("[InsightGenerator] Parsed categories:", finalParsed.categories);
      console.log("[InsightGenerator] Parsed metrics:", finalParsed.metrics);
      console.log("[InsightGenerator] Parsed description:", finalParsed.description);
      console.log("[InsightGenerator] Number of categories found:", finalParsed.categories.length);
      
      finalParsed.categories.forEach((cat, idx) => {
        console.log(`[InsightGenerator] Category ${idx + 1}:`, cat.category, "Key-Value pairs:", cat.keyValuePairs?.length || 0);
        if (cat.keyValuePairs && cat.keyValuePairs.length > 0) {
          console.log(`[InsightGenerator]   First few pairs:`, cat.keyValuePairs.slice(0, 3));
        }
      });
      
      setStructuredInsights(finalParsed.categories);
      setInsightMetrics(finalParsed.metrics);
      setDocumentDescription(finalParsed.description);
    } catch (error) {
      console.error("Insight generation error:", error);
      setError("Failed to generate insights. Please try again.");
      setInsights(null);
      setStructuredInsights([]);
      setInsightMetrics({});
      setDocumentDescription(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    insights,
    structuredInsights,
    insightMetrics,
    documentDescription,
    error,
    generateInsights: generateInsightsHandler,
  };
};

