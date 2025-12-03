import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faMusic,
  faMicrophone,
  faLayerGroup,
  faClock,
  faLightbulb,
  faTable,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioContentAnalysis.module.css";

const AudioContentAnalysis = ({ data, rawText, analysisData }) => {
  const [expandedTopics, setExpandedTopics] = useState({});

  const parsedData = useMemo(() => {
    const result = {
      topicClusters: [],
      topicTree: [],
      discussionFlow: [],
      themeSummary: "",
      keyConcepts: [],
    };

    const text = rawText || "";
    const sections = data?.sections || [];

    console.log("[AudioContentAnalysis] Raw sections:", sections);
    console.log("[AudioContentAnalysis] Raw text length:", text.length);
    if (text) {
      console.log(
        "[AudioContentAnalysis] Raw text preview:",
        text.substring(0, 500)
      );
    }

    // Parse Topic Clusters from sections or rawText
    const mainTopicsSection = sections.find(
      (s) =>
        s.name?.toLowerCase().includes("main topics") ||
        (s.name?.toLowerCase().includes("topic") &&
          !s.name?.toLowerCase().includes("hierarchy") &&
          !s.name?.toLowerCase().includes("distribution"))
    );

    if (mainTopicsSection) {
      console.log(
        "[AudioContentAnalysis] Found Main Topics section:",
        mainTopicsSection.name
      );
      console.log(
        "[AudioContentAnalysis] Section content:",
        mainTopicsSection.content
      );
      console.log(
        "[AudioContentAnalysis] Section text:",
        mainTopicsSection.text
      );

      // Try to parse from content array first
      const items = mainTopicsSection.content || [];
      if (items.length > 0) {
        items.forEach((item, idx) => {
          if (item.type === "bullet" || item.type === "text") {
            const itemText = item.text || item.value || "";
            // Skip if it contains "SECTION:" as that's a section marker
            if (
              itemText.includes("SECTION:") ||
              itemText.trim().toLowerCase().startsWith("section")
            )
              return;

            const match = itemText.match(/(.+?):\s*(.+)/);
            if (match && !match[1].trim().toLowerCase().includes("section")) {
              result.topicClusters.push({
                title: match[1].trim(),
                description: match[2].trim(),
                icon: faMusic,
              });
            } else if (
              itemText.length > 0 &&
              itemText.includes(":") &&
              !itemText.includes("SECTION:")
            ) {
              const parts = itemText.split(":");
              if (
                parts.length >= 2 &&
                !parts[0].trim().toLowerCase().includes("section")
              ) {
                result.topicClusters.push({
                  title: parts[0].trim(),
                  description: parts.slice(1).join(":").trim(),
                  icon: faMusic,
                });
              }
            }
          }
        });
      }

      // If no items from content, try parsing from section.text
      if (result.topicClusters.length === 0 && mainTopicsSection.text) {
        let sectionText = mainTopicsSection.text;
        // Remove any SECTION: markers
        sectionText = sectionText.replace(/SECTION:\s*/gi, "").trim();

        const lines = sectionText.split(/\n/).filter((l) => l.trim());
        lines.forEach((line) => {
          const cleaned = line.replace(/^[-•*]\s*/, "").trim();
          // Skip lines that are section headers or don't have colons
          if (
            cleaned &&
            cleaned.includes(":") &&
            !cleaned.toLowerCase().includes("section")
          ) {
            const match = cleaned.match(/(.+?):\s*(.+)/);
            if (match && !match[1].trim().toLowerCase().includes("section")) {
              result.topicClusters.push({
                title: match[1].trim(),
                description: match[2].trim(),
                icon: faMusic,
              });
            } else {
              const parts = cleaned.split(":");
              if (
                parts.length >= 2 &&
                !parts[0].trim().toLowerCase().includes("section")
              ) {
                result.topicClusters.push({
                  title: parts[0].trim(),
                  description: parts.slice(1).join(":").trim(),
                  icon: faMusic,
                });
              }
            }
          }
        });
      }
    }

    // Parse Topic Tree/Hierarchy
    const keyConceptsSection = sections.find(
      (s) =>
        s.name?.toLowerCase().includes("concept") ||
        s.name?.toLowerCase().includes("topic distribution")
    );
    if (keyConceptsSection) {
      const items = keyConceptsSection.content || [];
      let currentTopic = null;
      items.forEach((item) => {
        const text = item.text || item.value || "";
        if (text.match(/^[A-Z][^:]+$/)) {
          currentTopic = {
            title: text,
            items: [],
          };
          result.topicTree.push(currentTopic);
        } else if (
          currentTopic &&
          (item.type === "bullet" || text.startsWith("•"))
        ) {
          currentTopic.items.push(text.replace(/^[-•*]\s*/, "").trim());
        }
      });
    }

    // Parse Discussion Flow Timeline
    const discussionFlowSection = sections.find(
      (s) =>
        s.name?.toLowerCase().includes("discussion flow") ||
        (s.name?.toLowerCase().includes("flow") &&
          !s.name?.toLowerCase().includes("topic"))
    );

    if (discussionFlowSection) {
      console.log(
        "[AudioContentAnalysis] Found Discussion Flow section:",
        discussionFlowSection.name
      );
      console.log(
        "[AudioContentAnalysis] Flow content:",
        discussionFlowSection.content
      );
      console.log(
        "[AudioContentAnalysis] Flow text:",
        discussionFlowSection.text
      );

      // Try to parse from content array first
      const items = discussionFlowSection.content || [];
      if (items.length > 0) {
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          // Skip if it contains "SECTION:" as that's a section marker
          if (itemText.includes("SECTION:")) return;

          // Always try to split by time patterns (handles concatenated items)
          // Pattern: time (MM:SS) followed by optional dash and description, until next time or end
          // Use a more precise pattern that stops at the next time pattern
          const timePattern =
            /(\d{1,2}:\d{2})\s*[-—]?\s*((?:(?!\d{1,2}:\d{2}).)+?)(?=\d{1,2}:\d{2}|$)/gs;
          const matches = [...itemText.matchAll(timePattern)];

          if (matches.length > 0) {
            console.log(
              `[AudioContentAnalysis] Found ${matches.length} timeline items in content array`
            );
            // Extract all timeline items
            matches.forEach((match, idx) => {
              if (match[1] && match[2]) {
                const description = match[2].trim();
                // Clean up description - remove trailing periods that might be separators
                const cleanedDesc = description.replace(/\.$/, "").trim();
                if (cleanedDesc.length > 0) {
                  console.log(
                    `[AudioContentAnalysis] Timeline item ${idx + 1}: ${
                      match[1]
                    } - ${cleanedDesc.substring(0, 50)}...`
                  );
                  result.discussionFlow.push({
                    time: match[1],
                    description: cleanedDesc,
                  });
                }
              }
            });
          } else {
            // Single timeline item
            const timeMatch = itemText.match(/(\d{1,2}:\d{2})\s*[-—]\s*(.+)/);
            if (timeMatch) {
              result.discussionFlow.push({
                time: timeMatch[1],
                description: timeMatch[2].trim(),
              });
            } else if (itemText.match(/\d{1,2}:\d{2}/)) {
              // Try without dash separator
              const timeMatch2 = itemText.match(/(\d{1,2}:\d{2})\s+(.+)/);
              if (timeMatch2) {
                result.discussionFlow.push({
                  time: timeMatch2[1],
                  description: timeMatch2[2].trim(),
                });
              }
            }
          }
        });
      }

      // If no items from content, try parsing from section.text
      if (result.discussionFlow.length === 0 && discussionFlowSection.text) {
        let sectionText = discussionFlowSection.text;
        // Remove any SECTION: markers
        sectionText = sectionText.replace(/SECTION:\s*/gi, "").trim();

        // Always use regex to split by time patterns (handles both newline-separated and concatenated)
        // Pattern: time (MM:SS) followed by optional dash and description, until next time or end
        // Use a more precise pattern that stops at the next time pattern
        const timePattern =
          /(\d{1,2}:\d{2})\s*[-—]?\s*((?:(?!\d{1,2}:\d{2}).)+?)(?=\d{1,2}:\d{2}|$)/gs;
        const matches = [...sectionText.matchAll(timePattern)];

        if (matches.length > 0) {
          console.log(
            `[AudioContentAnalysis] Found ${matches.length} timeline items in section.text`
          );
          // Extract all timeline items
          matches.forEach((match, idx) => {
            if (match[1] && match[2]) {
              const description = match[2].trim();
              // Clean up description - remove trailing periods that might be separators
              const cleanedDesc = description.replace(/\.$/, "").trim();
              if (cleanedDesc.length > 0) {
                console.log(
                  `[AudioContentAnalysis] Timeline item ${idx + 1}: ${
                    match[1]
                  } - ${cleanedDesc.substring(0, 50)}...`
                );
                result.discussionFlow.push({
                  time: match[1],
                  description: cleanedDesc,
                });
              }
            }
          });
        } else {
          // Fallback: try line by line
          const lines = sectionText.split(/\n/).filter((l) => l.trim());
          lines.forEach((line) => {
            const cleaned = line.replace(/^[-•*]\s*/, "").trim();
            if (cleaned && cleaned.match(/\d{1,2}:\d{2}/)) {
              const timeMatch = cleaned.match(/(\d{1,2}:\d{2})\s*[-—]\s*(.+)/);
              if (timeMatch) {
                result.discussionFlow.push({
                  time: timeMatch[1],
                  description: timeMatch[2].trim(),
                });
              } else {
                const timeMatch2 = cleaned.match(
                  /(\d{1,2}:\d{2})\s+(.+?)(?=\d{1,2}:\d{2}|$)/
                );
                if (timeMatch2) {
                  result.discussionFlow.push({
                    time: timeMatch2[1],
                    description: timeMatch2[2].trim(),
                  });
                }
              }
            }
          });
        }
      }
    }

    // Parse Theme Summary
    const contentStructureSection = sections.find(
      (s) =>
        s.name?.toLowerCase().includes("structure") ||
        s.name?.toLowerCase().includes("theme")
    );
    if (contentStructureSection) {
      const textItems = contentStructureSection.content
        ?.filter((item) => item.type === "text")
        .map((item) => item.text || item.value || "")
        .filter(Boolean);
      if (textItems && textItems.length > 0) {
        result.themeSummary = textItems.join(" ");
      }
    }

    // Parse Key Concepts Table
    if (keyConceptsSection) {
      const items = keyConceptsSection.content || [];
      items.forEach((item) => {
        const text = item.text || item.value || "";
        if (item.type === "keyValue") {
          result.keyConcepts.push({
            concept: item.key || "",
            category: "Theme",
            relevance: item.value || "Medium",
          });
        } else if (text.includes("|") || text.includes(":")) {
          const parts = text.split(/[|:]/).map((p) => p.trim());
          if (parts.length >= 2) {
            result.keyConcepts.push({
              concept: parts[0],
              category: parts[1] || "Theme",
              relevance: parts[2] || "Medium",
            });
          }
        }
      });
    }

    // Fallback: Parse from rawText if sections are empty or parsing failed
    if (
      (sections.length === 0 ||
        (result.topicClusters.length === 0 &&
          result.discussionFlow.length === 0)) &&
      text
    ) {
      // Try to extract topic clusters
      const topicMatch = text.match(
        /SECTION:\s*Main\s+Topics\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (topicMatch) {
        const topicsText = topicMatch[1];
        const lines = topicsText.split(/\n/).filter((l) => l.trim());
        lines.forEach((line) => {
          const cleaned = line.replace(/^[-•*]\s*/, "").trim();
          if (cleaned && cleaned.includes(":")) {
            const match = cleaned.match(/(.+?):\s*(.+)/);
            if (match) {
              result.topicClusters.push({
                title: match[1].trim(),
                description: match[2].trim(),
                icon: faMusic,
              });
            } else {
              const parts = cleaned.split(":");
              if (parts.length >= 2) {
                result.topicClusters.push({
                  title: parts[0].trim(),
                  description: parts.slice(1).join(":").trim(),
                  icon: faMusic,
                });
              }
            }
          }
        });
      }

      // Try to extract discussion flow
      const flowMatch = text.match(
        /SECTION:\s*Discussion\s+Flow\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (flowMatch) {
        const flowText = flowMatch[1];
        const lines = flowText.split(/\n/).filter((l) => l.trim());
        lines.forEach((line) => {
          const cleaned = line.replace(/^[-•*]\s*/, "").trim();
          if (cleaned) {
            const timeMatch = cleaned.match(/(\d{1,2}:\d{2})\s*[-—]\s*(.+)/);
            if (timeMatch) {
              result.discussionFlow.push({
                time: timeMatch[1],
                description: timeMatch[2].trim(),
              });
            } else if (cleaned.match(/\d{1,2}:\d{2}/)) {
              const timeMatch2 = cleaned.match(/(\d{1,2}:\d{2})\s+(.+)/);
              if (timeMatch2) {
                result.discussionFlow.push({
                  time: timeMatch2[1],
                  description: timeMatch2[2].trim(),
                });
              }
            }
          }
        });
      }

      // Try to extract theme summary
      const themeMatch = text.match(
        /SECTION:\s*Theme\s+Summary\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (themeMatch) {
        result.themeSummary = themeMatch[1].trim();
      }

      // Try to extract key concepts
      const conceptsMatch = text.match(
        /SECTION:\s*Key\s+Concepts\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (conceptsMatch) {
        const conceptsText = conceptsMatch[1];
        const lines = conceptsText.split(/\n/).filter((l) => l.trim());
        lines.forEach((line) => {
          const cleaned = line.replace(/^[-•*]\s*/, "").trim();
          if (cleaned && cleaned.includes(":")) {
            const parts = cleaned.split(/[:|]/).map((p) => p.trim());
            if (parts.length >= 2) {
              result.keyConcepts.push({
                concept: parts[0],
                category: parts[1] || "Theme",
                relevance: parts[2] || "Medium",
              });
            }
          }
        });
      }
    }

    console.log("[AudioContentAnalysis] Parsed data:", result);

    return result;
  }, [data, rawText]);

  const toggleTopic = (index) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Normalize discussion flow in case some items still contain multiple
  // time segments concatenated into a single string
  const normalizedDiscussionFlow = useMemo(() => {
    if (!parsedData.discussionFlow || parsedData.discussionFlow.length === 0) {
      return [];
    }

    const result = [];
    const segmentPattern =
      /(\d{1,2}:\d{2})\s*[-—]?\s*((?:(?!\d{1,2}:\d{2}).)+)(?=\d{1,2}:\d{2}|$)/gs;

    parsedData.discussionFlow.forEach((item) => {
      // Combine time + description into one string so we can resplit reliably
      const combined = `${item.time} ${item.description || ""}`.trim();

      const matches = [...combined.matchAll(segmentPattern)];

      if (matches.length > 0) {
        matches.forEach((match) => {
          if (match[1] && match[2]) {
            const time = match[1];
            const desc = match[2].trim();
            if (desc.length > 0) {
              result.push({ time, description: desc });
            }
          }
        });
      } else if (combined.match(/\d{1,2}:\d{2}/)) {
        // Fallback: treat the whole thing as one item
        const singleMatch = combined.match(/(\d{1,2}:\d{2})\s*[-—]?\s*(.+)/);
        if (singleMatch) {
          result.push({
            time: singleMatch[1],
            description: singleMatch[2].trim(),
          });
        } else {
          result.push(item);
        }
      } else if (item.time && item.description) {
        result.push(item);
      }
    });

    console.log(
      "[AudioContentAnalysis] Normalized discussion flow items:",
      result.length
    );

    return result;
  }, [parsedData.discussionFlow]);

  const getIconForTopic = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes("theme") || lower.includes("spiritual"))
      return faLightbulb;
    if (lower.includes("vocal") || lower.includes("voice")) return faMicrophone;
    if (lower.includes("musical") || lower.includes("composition"))
      return faMusic;
    if (lower.includes("style") || lower.includes("technique"))
      return faLayerGroup;
    return faMusic;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faSearch} />
        </div>
        <div>
          <h2 className={styles.title}>Content Analysis</h2>
          <p className={styles.subtitle}>Topics, themes, and discussion flow</p>
        </div>
      </div>

      {/* Topic Clusters Grid */}
      {parsedData.topicClusters.length > 0 && (
        <div className={styles.topicClustersSection}>
          <h3 className={styles.sectionTitle}>Topic Clusters</h3>
          <div className={styles.topicClustersGrid}>
            {parsedData.topicClusters.map((cluster, index) => (
              <div key={index} className={styles.topicClusterCard}>
                <div className={styles.topicClusterIcon}>
                  <FontAwesomeIcon icon={getIconForTopic(cluster.title)} />
                </div>
                <h4 className={styles.topicClusterTitle}>{cluster.title}</h4>
                <p className={styles.topicClusterDescription}>
                  {cluster.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Topic Tree / Hierarchy */}
      {parsedData.topicTree.length > 0 && (
        <div className={styles.topicTreeSection}>
          <h3 className={styles.sectionTitle}>Topic Hierarchy</h3>
          <div className={styles.topicTree}>
            {parsedData.topicTree.map((topic, index) => (
              <div key={index} className={styles.topicTreeItem}>
                <button
                  className={styles.topicTreeHeader}
                  onClick={() => toggleTopic(index)}
                >
                  <FontAwesomeIcon
                    icon={
                      expandedTopics[index] ? faChevronDown : faChevronRight
                    }
                    className={styles.topicTreeChevron}
                  />
                  <span className={styles.topicTreeTitle}>{topic.title}</span>
                </button>
                {expandedTopics[index] && (
                  <ul className={styles.topicTreeList}>
                    {topic.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussion Flow Timeline */}
      {normalizedDiscussionFlow.length > 0 && (
        <div className={styles.timelineSection}>
          <h3 className={styles.sectionTitle}>Discussion Flow Timeline</h3>
          <div className={styles.timeline}>
            {normalizedDiscussionFlow.map((item, index) => (
              <div key={index} className={styles.timelineItem}>
                <div className={styles.timelineMarker}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTime}>{item.time}</div>
                  <div className={styles.timelineDescription}>
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Analysis Card */}
      {parsedData.themeSummary && (
        <div className={styles.themeAnalysisCard}>
          <div className={styles.themeAnalysisHeader}>
            <FontAwesomeIcon
              icon={faLightbulb}
              className={styles.themeAnalysisIcon}
            />
            <h3 className={styles.themeAnalysisTitle}>Theme Summary</h3>
          </div>
          <p className={styles.themeAnalysisText}>{parsedData.themeSummary}</p>
        </div>
      )}

      {/* Key Concepts Table */}
      {parsedData.keyConcepts.length > 0 && (
        <div className={styles.keyConceptsSection}>
          <div className={styles.keyConceptsHeader}>
            <FontAwesomeIcon
              icon={faTable}
              className={styles.keyConceptsIcon}
            />
            <h3 className={styles.sectionTitle}>Key Concepts</h3>
          </div>
          <div className={styles.keyConceptsTable}>
            <table>
              <thead>
                <tr>
                  <th>Concept</th>
                  <th>Category</th>
                  <th>Relevance</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.keyConcepts.map((concept, index) => (
                  <tr key={index}>
                    <td>{concept.concept}</td>
                    <td>{concept.category}</td>
                    <td>
                      <span
                        className={`${styles.relevanceBadge} ${
                          concept.relevance.toLowerCase() === "high"
                            ? styles.relevanceHigh
                            : concept.relevance.toLowerCase() === "medium"
                            ? styles.relevanceMedium
                            : styles.relevanceLow
                        }`}
                      >
                        {concept.relevance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fallback: Show raw sections if no parsed data available */}
      {parsedData.topicClusters.length === 0 &&
        parsedData.topicTree.length === 0 &&
        parsedData.discussionFlow.length === 0 &&
        !parsedData.themeSummary &&
        parsedData.keyConcepts.length === 0 &&
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
                        <div key={itemIndex} className={styles.bullet}>
                          • {item.text}
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
                  {(!section.content || section.content.length === 0) &&
                    section.text && (
                      <div className={styles.text}>{section.text}</div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Fallback: Show raw text only if absolutely nothing was parsed */}
      {parsedData.topicClusters.length === 0 &&
        parsedData.topicTree.length === 0 &&
        parsedData.discussionFlow.length === 0 &&
        !parsedData.themeSummary &&
        parsedData.keyConcepts.length === 0 &&
        (!data?.sections || data.sections.length === 0) &&
        rawText && <div className={styles.rawText}>{rawText}</div>}
    </div>
  );
};

export default AudioContentAnalysis;
