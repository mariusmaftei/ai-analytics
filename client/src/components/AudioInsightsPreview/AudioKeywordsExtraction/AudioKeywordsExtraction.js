import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faTags,
  faChartBar,
  faClock,
  faLayerGroup,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import {
  KEYWORD_PATTERN,
  KEYWORD_PATTERN_ALT,
  KEY_PHRASE_PATTERN,
  NAMED_ENTITY_PATTERN,
  KEYWORD_CLUSTER_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { KEYWORDS_SCHEMA } from "../../../utils/audioJsonSchemas";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import styles from "./AudioKeywordsExtraction.module.css";

const AudioKeywordsExtraction = ({ data, rawText }) => {
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const text = rawText || "";
      
      // Try JSON parsing first (new architecture)
      const jsonResult = parseAudioAnalysisData(
        text,
        KEYWORDS_SCHEMA,
        null, // Will use text parser as fallback
        "AudioKeywordsExtraction"
      );

      // If JSON parsing succeeded, use it
      if (jsonResult.data && jsonResult.format === 'json') {
        return jsonResult.data;
      }

      // Fallback to text parsing (existing logic)
      const result = {
        keywords: [],
        keyPhrases: [],
        namedEntities: [],
        keywordClusters: [],
      };

      const sections = data?.sections || [];

      // Parse Top Keywords - try multiple section name variations
      const topKeywordsSection = sections.find((s) => {
        const name = s.name?.toLowerCase() || "";
        return (
          name.includes("top keywords") ||
          (name.includes("keyword") &&
            !name.includes("cluster") &&
            !name.includes("phrase") &&
            !name.includes("entity"))
        );
      });

      if (topKeywordsSection) {
        const items = topKeywordsSection.content || [];

        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Parse format: "Keyword: Relevance Score: Frequency: First Occurrence"
          // Example: "Ave: 0.98: 12: 00:04"
          const keywordMatch = itemText.match(KEYWORD_PATTERN);
          if (keywordMatch) {
            result.keywords.push({
              keyword: keywordMatch[1].trim(),
              relevanceScore: parseFloat(keywordMatch[2]),
              frequency: parseInt(keywordMatch[3]),
              firstOccurrence: keywordMatch[4],
            });
          } else {
            // Try format without timestamp: "Keyword: Relevance Score: Frequency"
            const keywordMatch2 = itemText.match(KEYWORD_PATTERN_ALT);
            if (keywordMatch2) {
              result.keywords.push({
                keyword: keywordMatch2[1].trim(),
                relevanceScore: parseFloat(keywordMatch2[2]),
                frequency: parseInt(keywordMatch2[3]),
                firstOccurrence: null,
              });
            } else {
              // Try simpler format: just keyword and frequency "Keyword: Frequency"
              const keywordMatch3 = itemText.match(/^([^:]+):\s*(\d+)/);
              if (keywordMatch3) {
                result.keywords.push({
                  keyword: keywordMatch3[1].trim(),
                  relevanceScore: 0.5, // Default score
                  frequency: parseInt(keywordMatch3[2]),
                  firstOccurrence: null,
                });
              } else if (
                itemText.trim().length > 0 &&
                !itemText.includes(":")
              ) {
                result.keywords.push({
                  keyword: itemText.trim(),
                  relevanceScore: 0.5,
                  frequency: 1,
                  firstOccurrence: null,
                });
              }
            }
          }
        });

        // Parse from section name if it contains the data (section name includes content)
        let sectionText = topKeywordsSection.name || "";
        // Also try section.text if available and longer
        if (
          topKeywordsSection.text &&
          topKeywordsSection.text.length > sectionText.length
        ) {
          sectionText = topKeywordsSection.text;
        }

        // Remove "Top Keywords" prefix if present
        sectionText = sectionText.replace(/^Top\s+Keywords\s*/i, "").trim();

        // Extract only the content before the next SECTION: marker
        const nextSectionIndex = sectionText.search(/SECTION:\s*/i);
        if (nextSectionIndex > 0) {
          sectionText = sectionText.substring(0, nextSectionIndex);
        }

        // Remove any remaining SECTION: markers
        sectionText = sectionText
          .replace(/SECTION:\s*Top\s+Keywords\s*/gi, "")
          .trim();

        // Handle concatenated keywords (no newlines between them)
        // Pattern: "Keyword: Score: Frequency: TimeKeyword: Score: ..."
        // Examples: "Ave: 0.99: 4: 00:02" or "Dominus: 0.85: 2:00:14"
        // Note: Space is optional before timestamp (handles "2:00:14" and "2: 00:14")
        // Allow special characters in keywords (e.g., "Australië")
        // The pattern must stop before the next keyword starts (capital letter) or end of string
        // Updated regex: frequency can be followed by colon with optional space, then timestamp
        // Using centralized pattern with global flag for matchAll
        const keywordPatternGlobal = new RegExp(
          KEYWORD_PATTERN.source + "(?=[A-Z]|$)",
          "g"
        );
        const matches = [...sectionText.matchAll(keywordPatternGlobal)];

        if (matches.length === 0) {
          // Try pattern without requiring space before timestamp (handles "2:00:14")
          const keywordPatternNoSpace =
            /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+):(\d{1,2}:\d{2})(?=[A-Z]|$)/g;
          const matchesNoSpace = [
            ...sectionText.matchAll(keywordPatternNoSpace),
          ];
          matchesNoSpace.forEach((match) => {
            result.keywords.push({
              keyword: match[1].trim(),
              relevanceScore: parseFloat(match[2]),
              frequency: parseInt(match[3]),
              firstOccurrence: match[4] ? match[4].trim() : null,
            });
          });
        } else {
          matches.forEach((match) => {
            result.keywords.push({
              keyword: match[1].trim(),
              relevanceScore: parseFloat(match[2]),
              frequency: parseInt(match[3]),
              firstOccurrence: match[4] ? match[4].trim() : null,
            });
          });
        }

        // If still no matches with timestamp, try without timestamp
        if (result.keywords.length === 0) {
          const keywordPattern2 =
            /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+)/g;
          const matches2 = [...sectionText.matchAll(keywordPattern2)];
          matches2.forEach((match) => {
            result.keywords.push({
              keyword: match[1].trim(),
              relevanceScore: parseFloat(match[2]),
              frequency: parseInt(match[3]),
              firstOccurrence: null,
            });
          });
        }

        // Deduplicate keywords by keyword name (case-insensitive)
        const seenKeywords = new Map();
        const deduplicatedKeywords = [];

        result.keywords.forEach((kw) => {
          const key = kw.keyword.toLowerCase();
          if (!seenKeywords.has(key)) {
            seenKeywords.set(key, true);
            deduplicatedKeywords.push(kw);
          }
        });

        result.keywords = deduplicatedKeywords;
      }

      // Parse Key Phrases
      const keyPhrasesSection = sections.find((s) =>
        s.name?.toLowerCase().includes("key phrases")
      );

      if (keyPhrasesSection) {
        const items = keyPhrasesSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          const phraseMatch = itemText.match(/^([^:]+):\s*([\d.]+):\s*(\d+)/);
          if (phraseMatch) {
            result.keyPhrases.push({
              phrase: phraseMatch[1].trim(),
              relevanceScore: parseFloat(phraseMatch[2]),
              frequency: parseInt(phraseMatch[3]),
            });
          }
        });
      }

      // Parse Named Entities
      const namedEntitiesSection = sections.find((s) =>
        s.name?.toLowerCase().includes("named entities")
      );

      if (namedEntitiesSection) {
        const items = namedEntitiesSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          const entityMatch = itemText.match(NAMED_ENTITY_PATTERN);
          if (entityMatch) {
            result.namedEntities.push({
              name: entityMatch[1].trim(),
              type: entityMatch[2].trim(),
              relevanceScore: parseFloat(entityMatch[3]),
            });
          }
        });
      }

      // Parse Keyword Clusters
      const clustersSection = sections.find(
        (s) =>
          s.name?.toLowerCase().includes("keyword clusters") ||
          s.name?.toLowerCase().includes("cluster")
      );

      if (clustersSection) {
        const items = clustersSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          const clusterMatch = itemText.match(KEYWORD_CLUSTER_PATTERN);
          if (clusterMatch) {
            let keywordsString = clusterMatch[2].trim();

            // Try splitting by comma first
            let keywords = keywordsString
              .split(",")
              .map((k) => k.trim())
              .filter((k) => k.length > 0);

            // If no commas or only one item, try splitting by capital letters (for concatenated words)
            if (keywords.length <= 1) {
              // Split by capital letters - matches words that start with uppercase
              // Handles cases like "AveMariaGratia" -> ["Ave", "Maria", "Gratia"]
              const splitByCaps = keywordsString.match(
                /[A-Z][a-z\u00C0-\u017F]*/g
              );
              if (splitByCaps && splitByCaps.length > 1) {
                keywords = splitByCaps;
              } else {
                keywords = keywordsString
                  .split(/\s+/)
                  .filter((k) => k.length > 0);
              }
            }

            result.keywordClusters.push({
              clusterName: clusterMatch[1].trim(),
              keywords: keywords,
            });
          }
        });

        // Also try parsing from section.text
        if (clustersSection.text) {
          let sectionText = clustersSection.text;
          // Extract only the content before the next SECTION: marker
          const nextSectionIndex = sectionText.search(
            /SECTION:\s*(?!Keyword\s+Clusters)/i
          );
          if (nextSectionIndex > 0) {
            sectionText = sectionText.substring(0, nextSectionIndex);
          }
          sectionText = sectionText
            .replace(/SECTION:\s*Keyword\s+Clusters\s*/gi, "")
            .trim();

          const lines = sectionText
            .split(/\n/)
            .filter(
              (line) =>
                line.trim().length > 0 && !line.trim().startsWith("SECTION:")
            );

          lines.forEach((line) => {
            const clusterMatch = line.match(KEYWORD_CLUSTER_PATTERN);
            if (clusterMatch) {
              let keywordsString = clusterMatch[2].trim();

              // Try splitting by comma first
              let keywords = keywordsString
                .split(",")
                .map((k) => k.trim())
                .filter((k) => k.length > 0);

              // If no commas or only one item, try splitting by capital letters (for concatenated words)
              if (keywords.length <= 1) {
                // Split by capital letters - matches words that start with uppercase
                // Handles cases like "AveMariaGratia" -> ["Ave", "Maria", "Gratia"]
                const splitByCaps = keywordsString.match(
                  /[A-Z][a-z\u00C0-\u017F]*/g
                );
                if (splitByCaps && splitByCaps.length > 1) {
                  keywords = splitByCaps;
                } else {
                  keywords = keywordsString
                    .split(/\s+/)
                    .filter((k) => k.length > 0);
                }
              }

              result.keywordClusters.push({
                clusterName: clusterMatch[1].trim(),
                keywords: keywords,
              });
            }
          });
        }
      }

      // Fallback: Parse from rawText if sections are empty or parsing failed
      // Also parse clusters from rawText even if keywords were found from sections
      if (text) {
        // Parse Top Keywords from rawText
        const keywordsMatch = text.match(
          createSectionPattern("Top\\s+Keywords")
        );
        if (keywordsMatch) {
          const keywordsText = keywordsMatch[1];

          // Handle concatenated keywords (no newlines between them)
          // Pattern: "Keyword: Score: Frequency: TimeKeyword: Score: ..."
          // Note: Space is optional before timestamp (handles "2:00:07" and "2: 00:07")
          // Allow special characters in keywords (e.g., "Australië")
          const keywordPattern =
            /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+):\s*(\d{1,2}:\d{2})(?=[A-Z]|$)/g;
          const matches = [...keywordsText.matchAll(keywordPattern)];

          matches.forEach((match) => {
            result.keywords.push({
              keyword: match[1].trim(),
              relevanceScore: parseFloat(match[2]),
              frequency: parseInt(match[3]),
              firstOccurrence: match[4] ? match[4].trim() : null,
            });
          });

          // If no matches with timestamp, try without timestamp
          if (matches.length === 0) {
            const keywordPattern2 =
              /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+)/g;
            const matches2 = [...keywordsText.matchAll(keywordPattern2)];
            matches2.forEach((match) => {
              result.keywords.push({
                keyword: match[1].trim(),
                relevanceScore: parseFloat(match[2]),
                frequency: parseInt(match[3]),
                firstOccurrence: null,
              });
            });
          }
        } else {
          // Try to find any keyword-like patterns in the text
          const allLines = text
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          allLines.forEach((line, idx) => {
            const pattern1 = line.match(KEY_PHRASE_PATTERN);
            if (pattern1 && idx < 20) {
              result.keywords.push({
                keyword: pattern1[1].trim(),
                relevanceScore: parseFloat(pattern1[2]),
                frequency: parseInt(pattern1[3]),
                firstOccurrence: null,
              });
            }
          });
        }

        // Parse Keyword Clusters from rawText (always try, even if clusters were found in sections)
        const clustersMatch = text.match(
          createSectionPattern("Keyword\\s+Clusters")
        );
        if (clustersMatch) {
          const clustersText = clustersMatch[1];

          const lines = clustersText
            .split(/\n/)
            .filter(
              (line) =>
                line.trim().length > 0 && !line.trim().startsWith("SECTION:")
            );

          lines.forEach((line) => {
            const clusterMatch = line.match(KEYWORD_CLUSTER_PATTERN);
            if (clusterMatch) {
              let keywordsString = clusterMatch[2].trim();
              // Try splitting by comma first
              let keywords = keywordsString
                .split(",")
                .map((k) => k.trim())
                .filter((k) => k.length > 0);

              // If no commas, try splitting by capital letters (for concatenated words)
              if (keywords.length === 1 && keywords[0].length > 10) {
                const splitByCaps = keywordsString.match(/[A-Z][a-z]*/g);
                if (splitByCaps && splitByCaps.length > 1) {
                  keywords = splitByCaps;
                } else {
                  keywords = keywordsString
                    .split(/\s+/)
                    .filter((k) => k.length > 0);
                }
              }

              result.keywordClusters.push({
                clusterName: clusterMatch[1].trim(),
                keywords: keywords,
              });
            }
          });
        }
      }

      // Final deduplication of all keywords (in case they were added from multiple sources)
      const finalSeenKeywords = new Map();
      const finalDeduplicatedKeywords = [];

      result.keywords.forEach((kw) => {
        const key = kw.keyword.toLowerCase();
        if (!finalSeenKeywords.has(key)) {
          finalSeenKeywords.set(key, true);
          finalDeduplicatedKeywords.push(kw);
        }
      });

      result.keywords = finalDeduplicatedKeywords;

      // Sort keywords by relevance score (descending)
      result.keywords.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Validate parsed data
      const isValid = validateParsedData(
        result,
        {
          keywords: "array",
          keyPhrases: "array",
          namedEntities: "array",
          keywordClusters: "array",
        },
        "AudioKeywordsExtraction"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioKeywordsExtraction", "Parsing error:", error);
      setParsingError(error);
      return {
        keywords: [],
        keyPhrases: [],
        namedEntities: [],
        keywordClusters: [],
      };
    }
  }, [data, rawText]);

  const getRelevanceColor = (score) => {
    if (score >= 0.8) return "#22c55e"; // Green - High relevance
    if (score >= 0.6) return "#f59e0b"; // Orange - Medium-high relevance
    if (score >= 0.4) return "#3b82f6"; // Blue - Medium relevance
    return "#6b7280"; // Gray - Low relevance
  };

  const getRelevanceSize = (score) => {
    if (score >= 0.8) return "1.2em";
    if (score >= 0.6) return "1.1em";
    if (score >= 0.4) return "1em";
    return "0.9em";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faKey} />
        </div>
        <div>
          <h2 className={styles.title}>Keywords</h2>
          <p className={styles.subtitle}>Important terms and phrases</p>
        </div>
      </div>

      {/* Show raw data viewer if parsing failed */}
      {parsingError && rawText && (
        <RawDataViewer rawText={rawText} title="Raw AI Response (JSON parsing failed)" />
      )}

      {/* Show error or empty state */}
      {parsingError ? (
        <ParsingError
          message="Failed to parse keywords data. The analysis may be in an unexpected format."
        />
      ) : parsedData.keywords.length === 0 &&
        parsedData.keyPhrases.length === 0 &&
        parsedData.namedEntities.length === 0 &&
        parsedData.keywordClusters.length === 0 ? (
        <EmptyState
          icon={faKey}
          title="No Keywords Found"
          message="No keywords, phrases, or entities were extracted from this audio analysis."
        />
      ) : (
        <>
          {/* Keyword Cloud / Chips */}
          {parsedData.keywords.length > 0 && (
            <div className={styles.keywordCloudSection}>
              <div className={styles.sectionHeader}>
                <FontAwesomeIcon icon={faTags} className={styles.sectionIcon} />
                <h3 className={styles.sectionTitle}>Keyword Cloud</h3>
              </div>
              <div className={styles.keywordCloud}>
                {parsedData.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className={styles.keywordChip}
                    style={{
                      backgroundColor: getRelevanceColor(
                        keyword.relevanceScore
                      ),
                      fontSize: getRelevanceSize(keyword.relevanceScore),
                    }}
                  >
                    <span className={styles.keywordText}>
                      {keyword.keyword}
                    </span>
                    <span className={styles.keywordScore}>
                      ({keyword.relevanceScore.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keyword List Table */}
          {parsedData.keywords.length > 0 && (
            <div className={styles.keywordTableSection}>
              <div className={styles.sectionHeader}>
                <FontAwesomeIcon
                  icon={faTable}
                  className={styles.sectionIcon}
                />
                <h3 className={styles.sectionTitle}>Keyword List</h3>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.keywordTable}>
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Relevance Score</th>
                      <th>Frequency</th>
                      <th>First Occurrence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.keywords.map((keyword, index) => (
                      <tr key={index}>
                        <td className={styles.keywordCell}>
                          {keyword.keyword}
                        </td>
                        <td className={styles.scoreCell}>
                          <span
                            className={styles.scoreBadge}
                            style={{
                              backgroundColor: getRelevanceColor(
                                keyword.relevanceScore
                              ),
                            }}
                          >
                            {keyword.relevanceScore.toFixed(2)}
                          </span>
                        </td>
                        <td className={styles.frequencyCell}>
                          {keyword.frequency}
                        </td>
                        <td className={styles.occurrenceCell}>
                          {keyword.firstOccurrence || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Keyword Frequency Chart */}
          {parsedData.keywords.length > 0 && (
            <div className={styles.frequencyChartSection}>
              <div className={styles.sectionHeader}>
                <FontAwesomeIcon
                  icon={faChartBar}
                  className={styles.sectionIcon}
                />
                <h3 className={styles.sectionTitle}>Frequency Distribution</h3>
              </div>
              <div className={styles.frequencyChart}>
                {(() => {
                  const topKeywords = parsedData.keywords.slice(0, 10);
                  const maxFrequency = Math.max(
                    ...parsedData.keywords.map((k) => k.frequency),
                    1
                  );

                  return topKeywords.map((keyword, index) => {
                    const percentage = (keyword.frequency / maxFrequency) * 100;

                    return (
                      <div key={index} className={styles.frequencyBar}>
                        <div className={styles.frequencyLabel}>
                          {keyword.keyword}
                        </div>
                        <div className={styles.frequencyBarContainer}>
                          <div
                            className={styles.frequencyBarFill}
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getRelevanceColor(
                                keyword.relevanceScore
                              ),
                            }}
                          ></div>
                          <span className={styles.frequencyValue}>
                            {keyword.frequency}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Occurrence Timeline */}
          {parsedData.keywords.length > 0 &&
            parsedData.keywords.some((k) => k.firstOccurrence) && (
              <div className={styles.occurrenceTimelineSection}>
                <div className={styles.sectionHeader}>
                  <FontAwesomeIcon
                    icon={faClock}
                    className={styles.sectionIcon}
                  />
                  <h3 className={styles.sectionTitle}>Occurrence Timeline</h3>
                </div>
                <div className={styles.occurrenceTimeline}>
                  {parsedData.keywords
                    .filter((k) => k.firstOccurrence)
                    .sort((a, b) => {
                      // Sort by timestamp (convert MM:SS to seconds for comparison)
                      const timeA = a.firstOccurrence
                        .split(":")
                        .reduce((acc, val) => acc * 60 + parseInt(val), 0);
                      const timeB = b.firstOccurrence
                        .split(":")
                        .reduce((acc, val) => acc * 60 + parseInt(val), 0);
                      return timeA - timeB;
                    })
                    .map((keyword, index) => (
                      <div key={index} className={styles.timelineItem}>
                        <div className={styles.timelineMarker}></div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTime}>
                            {keyword.firstOccurrence}
                          </div>
                          <div className={styles.timelineKeyword}>
                            {keyword.keyword}
                          </div>
                          <div className={styles.timelineFrequency}>
                            Frequency: {keyword.frequency}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Keyword Clusters */}
          {parsedData.keywordClusters.length > 0 && (
            <div className={styles.clustersSection}>
              <div className={styles.sectionHeader}>
                <FontAwesomeIcon
                  icon={faLayerGroup}
                  className={styles.sectionIcon}
                />
                <h3 className={styles.sectionTitle}>Keyword Clusters</h3>
              </div>
              <div className={styles.clustersGrid}>
                {parsedData.keywordClusters.map((cluster, index) => (
                  <div key={index} className={styles.clusterCard}>
                    <h4 className={styles.clusterTitle}>
                      {cluster.clusterName}
                    </h4>
                    <div className={styles.clusterKeywords}>
                      {cluster.keywords.map((keyword, keywordIndex) => (
                        <span
                          key={keywordIndex}
                          className={styles.clusterKeyword}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AudioKeywordsExtraction;
