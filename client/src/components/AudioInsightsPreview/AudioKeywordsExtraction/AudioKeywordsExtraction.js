import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faTags,
  faChartBar,
  faClock,
  faLayerGroup,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioKeywordsExtraction.module.css";

const AudioKeywordsExtraction = ({ data, rawText, analysisData }) => {
  const parsedData = useMemo(() => {
    const result = {
      keywords: [],
      keyPhrases: [],
      namedEntities: [],
      keywordClusters: [],
    };

    const text = rawText || "";
    const sections = data?.sections || [];

    console.log("[AudioKeywordsExtraction] Raw sections:", sections);
    console.log("[AudioKeywordsExtraction] Raw text length:", text.length);
    if (text) {
      console.log(
        "[AudioKeywordsExtraction] Raw text preview:",
        text.substring(0, 500)
      );
    }

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
      console.log(
        "[AudioKeywordsExtraction] Found Top Keywords section:",
        topKeywordsSection.name
      );
      console.log(
        "[AudioKeywordsExtraction] Section content:",
        topKeywordsSection.content
      );
      console.log(
        "[AudioKeywordsExtraction] Section text:",
        topKeywordsSection.text?.substring(0, 500)
      );

      const items = topKeywordsSection.content || [];
      console.log(
        "[AudioKeywordsExtraction] Processing",
        items.length,
        "items from content array"
      );

      items.forEach((item, itemIdx) => {
        const itemText = item.text || item.value || "";
        console.log(
          `[AudioKeywordsExtraction] Item ${itemIdx}:`,
          itemText.substring(0, 100)
        );
        if (itemText.includes("SECTION:")) return;

        // Parse format: "Keyword: Relevance Score: Frequency: First Occurrence"
        // Example: "Ave: 0.98: 12: 00:04"
        const keywordMatch = itemText.match(
          /^([^:]+):\s*([\d.]+):\s*(\d+):\s*(\d{1,2}:\d{2})/
        );
        if (keywordMatch) {
          console.log(
            "[AudioKeywordsExtraction] Matched keyword with timestamp:",
            keywordMatch[1]
          );
          result.keywords.push({
            keyword: keywordMatch[1].trim(),
            relevanceScore: parseFloat(keywordMatch[2]),
            frequency: parseInt(keywordMatch[3]),
            firstOccurrence: keywordMatch[4],
          });
        } else {
          // Try format without timestamp: "Keyword: Relevance Score: Frequency"
          const keywordMatch2 = itemText.match(/^([^:]+):\s*([\d.]+):\s*(\d+)/);
          if (keywordMatch2) {
            console.log(
              "[AudioKeywordsExtraction] Matched keyword without timestamp:",
              keywordMatch2[1]
            );
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
              console.log(
                "[AudioKeywordsExtraction] Matched keyword simple format:",
                keywordMatch3[1]
              );
              result.keywords.push({
                keyword: keywordMatch3[1].trim(),
                relevanceScore: 0.5, // Default score
                frequency: parseInt(keywordMatch3[2]),
                firstOccurrence: null,
              });
            } else if (itemText.trim().length > 0 && !itemText.includes(":")) {
              // Just a keyword without any metadata
              console.log(
                "[AudioKeywordsExtraction] Adding plain keyword:",
                itemText.trim()
              );
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

      console.log(
        "[AudioKeywordsExtraction] Parsing from section text/name, length:",
        sectionText.length
      );
      console.log(
        "[AudioKeywordsExtraction] Section text to parse:",
        sectionText.substring(0, 500)
      );

      // Handle concatenated keywords (no newlines between them)
      // Pattern: "Keyword: Score: Frequency: TimeKeyword: Score: ..."
      // Examples: "Ave: 0.99: 4: 00:02" or "Dominus: 0.85: 2:00:14"
      // Note: Space is optional before timestamp (handles "2:00:14" and "2: 00:14")
      // Allow special characters in keywords (e.g., "Australië")
      // The pattern must stop before the next keyword starts (capital letter) or end of string
      // Updated regex: frequency can be followed by colon with optional space, then timestamp
      const keywordPattern =
        /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+):\s*(\d{1,2}:\d{2})(?=[A-Z]|$)/g;
      const matches = [...sectionText.matchAll(keywordPattern)];
      console.log(
        "[AudioKeywordsExtraction] Found keyword matches:",
        matches.length
      );

      if (matches.length === 0) {
        // Try pattern without requiring space before timestamp (handles "2:00:14")
        const keywordPatternNoSpace =
          /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+):(\d{1,2}:\d{2})(?=[A-Z]|$)/g;
        const matchesNoSpace = [...sectionText.matchAll(keywordPatternNoSpace)];
        console.log(
          "[AudioKeywordsExtraction] Trying pattern without space before timestamp, found:",
          matchesNoSpace.length
        );
        matchesNoSpace.forEach((match, matchIdx) => {
          console.log(
            `[AudioKeywordsExtraction] Match ${matchIdx}:`,
            "keyword:",
            match[1],
            "score:",
            match[2],
            "frequency:",
            match[3],
            "timestamp:",
            match[4]
          );
          result.keywords.push({
            keyword: match[1].trim(),
            relevanceScore: parseFloat(match[2]),
            frequency: parseInt(match[3]),
            firstOccurrence: match[4] ? match[4].trim() : null,
          });
        });
      } else {
        matches.forEach((match, matchIdx) => {
          console.log(
            `[AudioKeywordsExtraction] Match ${matchIdx}:`,
            "keyword:",
            match[1],
            "score:",
            match[2],
            "frequency:",
            match[3],
            "timestamp:",
            match[4]
          );
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
        console.log(
          "[AudioKeywordsExtraction] Found keyword matches (no timestamp):",
          matches2.length
        );
        matches2.forEach((match) => {
          result.keywords.push({
            keyword: match[1].trim(),
            relevanceScore: parseFloat(match[2]),
            frequency: parseInt(match[3]),
            firstOccurrence: null,
          });
        });
      }

      console.log(
        "[AudioKeywordsExtraction] Parsed keywords (before deduplication):",
        result.keywords.length
      );

      // Deduplicate keywords by keyword name (case-insensitive)
      const seenKeywords = new Map();
      const deduplicatedKeywords = [];

      result.keywords.forEach((kw) => {
        const key = kw.keyword.toLowerCase();
        if (!seenKeywords.has(key)) {
          seenKeywords.set(key, true);
          deduplicatedKeywords.push(kw);
        } else {
          console.log(
            `[AudioKeywordsExtraction] Duplicate keyword removed: ${kw.keyword}`
          );
        }
      });

      result.keywords = deduplicatedKeywords;

      console.log(
        "[AudioKeywordsExtraction] Parsed keywords (after deduplication):",
        result.keywords.length
      );
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

        const entityMatch = itemText.match(/^([^:]+):\s*(\w+):\s*([\d.]+)/);
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
      console.log(
        "[AudioKeywordsExtraction] Found Clusters section:",
        clustersSection.name
      );
      console.log(
        "[AudioKeywordsExtraction] Clusters content:",
        clustersSection.content
      );
      console.log(
        "[AudioKeywordsExtraction] Clusters text:",
        clustersSection.text?.substring(0, 500)
      );

      const items = clustersSection.content || [];
      items.forEach((item) => {
        const itemText = item.text || item.value || "";
        if (itemText.includes("SECTION:")) return;

        const clusterMatch = itemText.match(/^([^:]+):\s*(.+)/);
        if (clusterMatch) {
          let keywordsString = clusterMatch[2].trim();
          console.log(
            `[AudioKeywordsExtraction] Processing cluster from content: "${clusterMatch[1]}" with keywords: "${keywordsString}"`
          );

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
              console.log(
                `[AudioKeywordsExtraction] Split by caps from content:`,
                splitByCaps
              );
              keywords = splitByCaps;
            } else {
              // Try splitting by spaces
              keywords = keywordsString
                .split(/\s+/)
                .filter((k) => k.length > 0);
              console.log(
                `[AudioKeywordsExtraction] Split by spaces from content:`,
                keywords
              );
            }
          }

          console.log(
            `[AudioKeywordsExtraction] Final keywords for "${clusterMatch[1]}" from content:`,
            keywords
          );
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
          const clusterMatch = line.match(/^([^:]+):\s*(.+)/);
          if (clusterMatch) {
            let keywordsString = clusterMatch[2].trim();
            console.log(
              `[AudioKeywordsExtraction] Processing cluster line: "${clusterMatch[1]}" with keywords: "${keywordsString}"`
            );

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
                console.log(
                  `[AudioKeywordsExtraction] Split by caps:`,
                  splitByCaps
                );
                keywords = splitByCaps;
              } else {
                // Try splitting by spaces
                keywords = keywordsString
                  .split(/\s+/)
                  .filter((k) => k.length > 0);
                console.log(
                  `[AudioKeywordsExtraction] Split by spaces:`,
                  keywords
                );
              }
            }

            console.log(
              `[AudioKeywordsExtraction] Final keywords for "${clusterMatch[1]}":`,
              keywords
            );
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
      console.log("[AudioKeywordsExtraction] Falling back to rawText parsing");
      console.log(
        "[AudioKeywordsExtraction] Raw text full length:",
        text.length
      );

      // Parse Top Keywords from rawText
      const keywordsMatch = text.match(
        /SECTION:\s*Top\s+Keywords\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (keywordsMatch) {
        const keywordsText = keywordsMatch[1];
        console.log(
          "[AudioKeywordsExtraction] Found keywords section in rawText, length:",
          keywordsText.length
        );
        console.log(
          "[AudioKeywordsExtraction] Keywords text preview:",
          keywordsText.substring(0, 500)
        );

        // Handle concatenated keywords (no newlines between them)
        // Pattern: "Keyword: Score: Frequency: TimeKeyword: Score: ..."
        // Note: Space is optional before timestamp (handles "2:00:07" and "2: 00:07")
        // Allow special characters in keywords (e.g., "Australië")
        const keywordPattern =
          /([A-Za-z][A-Za-z0-9\u00C0-\u017F]*):\s*([\d.]+):\s*(\d+):\s*(\d{1,2}:\d{2})(?=[A-Z]|$)/g;
        const matches = [...keywordsText.matchAll(keywordPattern)];
        console.log(
          "[AudioKeywordsExtraction] Found keyword matches in rawText:",
          matches.length
        );

        matches.forEach((match, matchIdx) => {
          console.log(
            `[AudioKeywordsExtraction] RawText match ${matchIdx}:`,
            "keyword:",
            match[1],
            "score:",
            match[2],
            "frequency:",
            match[3],
            "timestamp:",
            match[4]
          );
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
          console.log(
            "[AudioKeywordsExtraction] Found keyword matches (no timestamp) in rawText:",
            matches2.length
          );
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
        console.log(
          "[AudioKeywordsExtraction] No 'Top Keywords' section found in rawText"
        );
        // Try to find any keyword-like patterns in the text
        const allLines = text
          .split(/\n/)
          .filter((line) => line.trim().length > 0);
        console.log(
          "[AudioKeywordsExtraction] Trying to parse all lines, count:",
          allLines.length
        );
        allLines.forEach((line, idx) => {
          // Look for patterns like "word: number: number" or "word: number"
          const pattern1 = line.match(/^([A-Za-z][^:]+?):\s*([\d.]+):\s*(\d+)/);
          if (pattern1 && idx < 20) {
            // Only check first 20 lines
            console.log(
              `[AudioKeywordsExtraction] Found pattern in line ${idx}:`,
              pattern1
            );
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
        /SECTION:\s*Keyword\s+Clusters\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (clustersMatch) {
        const clustersText = clustersMatch[1];
        console.log(
          "[AudioKeywordsExtraction] Found clusters section in rawText, length:",
          clustersText.length
        );
        console.log(
          "[AudioKeywordsExtraction] Clusters text preview:",
          clustersText.substring(0, 500)
        );

        const lines = clustersText
          .split(/\n/)
          .filter(
            (line) =>
              line.trim().length > 0 && !line.trim().startsWith("SECTION:")
          );
        console.log(
          "[AudioKeywordsExtraction] Found cluster lines in rawText:",
          lines.length
        );

        lines.forEach((line, lineIdx) => {
          console.log(
            `[AudioKeywordsExtraction] Parsing cluster line ${lineIdx}:`,
            line
          );
          const clusterMatch = line.match(/^([^:]+):\s*(.+)/);
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

            console.log(
              "[AudioKeywordsExtraction] Parsed cluster from rawText:",
              clusterMatch[1].trim(),
              "keywords:",
              keywords
            );
            result.keywordClusters.push({
              clusterName: clusterMatch[1].trim(),
              keywords: keywords,
            });
          }
        });
      } else {
        console.log(
          "[AudioKeywordsExtraction] No 'Keyword Clusters' section found in rawText"
        );
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
      } else {
        console.log(
          `[AudioKeywordsExtraction] Final deduplication: Removed duplicate "${kw.keyword}"`
        );
      }
    });

    result.keywords = finalDeduplicatedKeywords;

    // Sort keywords by relevance score (descending)
    result.keywords.sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(
      "[AudioKeywordsExtraction] Final parsed keywords count:",
      result.keywords.length
    );
    console.log("[AudioKeywordsExtraction] Parsed data:", result);
    return result;
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
                  backgroundColor: getRelevanceColor(keyword.relevanceScore),
                  fontSize: getRelevanceSize(keyword.relevanceScore),
                }}
              >
                <span className={styles.keywordText}>{keyword.keyword}</span>
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
            <FontAwesomeIcon icon={faTable} className={styles.sectionIcon} />
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
                    <td className={styles.keywordCell}>{keyword.keyword}</td>
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
            <FontAwesomeIcon icon={faChartBar} className={styles.sectionIcon} />
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
              <FontAwesomeIcon icon={faClock} className={styles.sectionIcon} />
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
                <h4 className={styles.clusterTitle}>{cluster.clusterName}</h4>
                <div className={styles.clusterKeywords}>
                  {cluster.keywords.map((keyword, keywordIndex) => (
                    <span key={keywordIndex} className={styles.clusterKeyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: Show raw sections if available */}
      {parsedData.keywords.length === 0 &&
        parsedData.keywordClusters.length === 0 &&
        data?.sections &&
        data.sections.length > 0 && (
          <div className={styles.sections}>
            {data.sections.map((section, index) => (
              <div key={index} className={styles.section}>
                <h3 className={styles.sectionTitle}>{section.name}</h3>
                <div className={styles.content}>
                  {section.content?.map((item, itemIndex) => {
                    if (item.type === "keyValue") {
                      return (
                        <div key={itemIndex} className={styles.keyValue}>
                          <span className={styles.key}>{item.key}:</span>
                          <span className={styles.value}>{item.value}</span>
                        </div>
                      );
                    } else if (item.type === "bullet") {
                      return (
                        <div key={itemIndex} className={styles.keywordTag}>
                          <FontAwesomeIcon icon={faTags} />
                          {item.text}
                        </div>
                      );
                    } else {
                      return (
                        <div key={itemIndex} className={styles.text}>
                          {item.text}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Fallback: Show raw text */}
      {parsedData.keywords.length === 0 &&
        parsedData.keywordClusters.length === 0 &&
        !data?.sections &&
        rawText && <div className={styles.rawText}>{rawText}</div>}
    </div>
  );
};

export default AudioKeywordsExtraction;
