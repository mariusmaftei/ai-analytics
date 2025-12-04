import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faMusic,
  faMicrophone,
  faLayerGroup,
  faLightbulb,
  faTable,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { CONTENT_ANALYSIS_SCHEMA } from "../../../utils/audioJsonSchemas";
import {
  TOPIC_CLUSTER_PATTERN_LAZY,
  TOPIC_TREE_TITLE_PATTERN,
  DISCUSSION_FLOW_DASH_PATTERN,
  DISCUSSION_FLOW_SPACE_PATTERN,
  DISCUSSION_FLOW_GLOBAL_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import styles from "./AudioContentAnalysis.module.css";

const AudioContentAnalysis = ({ data, rawText }) => {
  const [expandedTopics, setExpandedTopics] = useState({});
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const result = {
        topicClusters: [],
        topicTree: [],
        discussionFlow: [],
        themeSummary: "",
        keyConcepts: [],
      };

      const text = rawText || "";
      const sections = data?.sections || [];

      // Try JSON parsing first (new architecture)
      if (text) {
        const jsonResult = parseAudioAnalysisData(
          text,
          CONTENT_ANALYSIS_SCHEMA,
          null, // Will use text parser as fallback
          "AudioContentAnalysis"
        );

        // If JSON parsing succeeded, transform to expected format
        if (jsonResult.data && jsonResult.format === 'json') {
          const jsonData = jsonResult.data;
          
          // Transform topicClusters
          if (jsonData.topicClusters && Array.isArray(jsonData.topicClusters)) {
            result.topicClusters = jsonData.topicClusters.map(cluster => ({
              title: cluster.topic || cluster.title || "",
              description: cluster.description || "",
              icon: faMusic,
            }));
          }

          // Transform discussionFlow
          if (jsonData.discussionFlow && Array.isArray(jsonData.discussionFlow)) {
            result.discussionFlow = jsonData.discussionFlow.map(item => ({
              time: item.timestamp || item.time || "",
              description: item.description || item.topic || "",
            }));
          }

          // Transform keyConcepts
          if (jsonData.keyConcepts && Array.isArray(jsonData.keyConcepts)) {
            result.keyConcepts = jsonData.keyConcepts.map((concept, index) => {
              // If concept is a string, create a simple object
              if (typeof concept === 'string') {
                return {
                  concept: concept,
                  category: "General",
                };
              }
              // If concept is an object, use it as-is
              return {
                concept: concept.concept || concept.name || "",
                category: concept.category || "General",
              };
            });
          }

          // If we got valid data from JSON, return early (skip text parsing)
          if (result.topicClusters.length > 0 || 
              result.discussionFlow.length > 0 || 
              result.keyConcepts.length > 0) {
            return result;
          }
        }
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

              const match = itemText.match(TOPIC_CLUSTER_PATTERN_LAZY);
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
              const match = cleaned.match(TOPIC_CLUSTER_PATTERN_LAZY);
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
          if (text.match(TOPIC_TREE_TITLE_PATTERN)) {
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
        // Try to parse from content array first
        const items = discussionFlowSection.content || [];
        if (items.length > 0) {
          items.forEach((item) => {
            const itemText = item.text || item.value || "";
            // Skip if it contains "SECTION:" as that's a section marker
            if (itemText.includes("SECTION:")) return;

            // Always try to split by time patterns (handles concatenated items)
            const matches = [
              ...itemText.matchAll(DISCUSSION_FLOW_GLOBAL_PATTERN),
            ];

            if (matches.length > 0) {
              matches.forEach((match) => {
                if (match[1] && match[2]) {
                  const description = match[2].trim();
                  const cleanedDesc = description.replace(/\.$/, "").trim();
                  if (cleanedDesc.length > 0) {
                    result.discussionFlow.push({
                      time: match[1],
                      description: cleanedDesc,
                    });
                  }
                }
              });
            } else {
              // Single timeline item
              const timeMatch = itemText.match(DISCUSSION_FLOW_DASH_PATTERN);
              if (timeMatch) {
                result.discussionFlow.push({
                  time: timeMatch[1],
                  description: timeMatch[2].trim(),
                });
              } else if (itemText.match(/\d{1,2}:\d{2}/)) {
                // Try without dash separator
                const timeMatch2 = itemText.match(
                  DISCUSSION_FLOW_SPACE_PATTERN
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

        // If no items from content, try parsing from section.text
        if (result.discussionFlow.length === 0 && discussionFlowSection.text) {
          let sectionText = discussionFlowSection.text;
          // Remove any SECTION: markers
          sectionText = sectionText.replace(/SECTION:\s*/gi, "").trim();

          // Always use regex to split by time patterns (handles both newline-separated and concatenated)
          const matches = [
            ...sectionText.matchAll(DISCUSSION_FLOW_GLOBAL_PATTERN),
          ];

          if (matches.length > 0) {
            matches.forEach((match) => {
              if (match[1] && match[2]) {
                const description = match[2].trim();
                const cleanedDesc = description.replace(/\.$/, "").trim();
                if (cleanedDesc.length > 0) {
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
                const timeMatch = cleaned.match(DISCUSSION_FLOW_DASH_PATTERN);
                if (timeMatch) {
                  result.discussionFlow.push({
                    time: timeMatch[1],
                    description: timeMatch[2].trim(),
                  });
                } else {
                  const timeMatch2 = cleaned.match(
                    DISCUSSION_FLOW_SPACE_PATTERN
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
        const topicMatch = text.match(createSectionPattern("Main\\s+Topics"));
        if (topicMatch) {
          const topicsText = topicMatch[1];
          const lines = topicsText.split(/\n/).filter((l) => l.trim());
          lines.forEach((line) => {
            const cleaned = line.replace(/^[-•*]\s*/, "").trim();
            if (cleaned && cleaned.includes(":")) {
              const match = cleaned.match(TOPIC_CLUSTER_PATTERN_LAZY);
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
          createSectionPattern("Discussion\\s+Flow")
        );
        if (flowMatch) {
          const flowText = flowMatch[1];
          const lines = flowText.split(/\n/).filter((l) => l.trim());
          lines.forEach((line) => {
            const cleaned = line.replace(/^[-•*]\s*/, "").trim();
            if (cleaned) {
              const timeMatch = cleaned.match(DISCUSSION_FLOW_DASH_PATTERN);
              if (timeMatch) {
                result.discussionFlow.push({
                  time: timeMatch[1],
                  description: timeMatch[2].trim(),
                });
              } else if (cleaned.match(/\d{1,2}:\d{2}/)) {
                const timeMatch2 = cleaned.match(DISCUSSION_FLOW_SPACE_PATTERN);
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
        const themeMatch = text.match(createSectionPattern("Theme\\s+Summary"));
        if (themeMatch) {
          result.themeSummary = themeMatch[1].trim();
        }

        // Try to extract key concepts
        const conceptsMatch = text.match(
          createSectionPattern("Key\\s+Concepts")
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

      // Validate parsed data
      const isValid = validateParsedData(
        result,
        {
          topicClusters: "array",
          topicTree: "array",
          discussionFlow: "array",
          themeSummary: "string",
          keyConcepts: "array",
        },
        "AudioContentAnalysis"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioContentAnalysis", "Parsing error:", error);
      setParsingError(error);
      return {
        topicClusters: [],
        topicTree: [],
        discussionFlow: [],
        themeSummary: "",
        keyConcepts: [],
      };
    }
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
    parsedData.discussionFlow.forEach((item) => {
      // Combine time + description into one string so we can resplit reliably
      const combined = `${item.time} ${item.description || ""}`.trim();

      const matches = [...combined.matchAll(DISCUSSION_FLOW_GLOBAL_PATTERN)];

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
        // Try with dash first, then without
        const singleMatch =
          combined.match(DISCUSSION_FLOW_DASH_PATTERN) ||
          combined.match(DISCUSSION_FLOW_SPACE_PATTERN);
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

    return result;
  }, [parsedData.discussionFlow]);

  const getIconForTopic = (title) => {
    if (!title || typeof title !== 'string') return faMusic;
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

  // Check if all data is empty
  const hasData =
    parsedData.topicClusters.length > 0 ||
    parsedData.topicTree.length > 0 ||
    normalizedDiscussionFlow.length > 0 ||
    parsedData.themeSummary ||
    parsedData.keyConcepts.length > 0;

  // Show parsing error if occurred
  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <div>
            <h2 className={styles.title}>Content Analysis</h2>
            <p className={styles.subtitle}>
              Topics, themes, and discussion flow
            </p>
          </div>
        </div>
        <ParsingError
          message="Failed to parse content analysis data. The analysis may be in an unexpected format."
          showRawData={true}
          rawData={rawText}
        />
        {rawText && <RawDataViewer data={rawText} />}
      </div>
    );
  }

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
                {parsedData.keyConcepts.map((concept, index) => {
                  const relevance = concept.relevance || "Medium";
                  const relevanceLower = relevance.toLowerCase();
                  return (
                    <tr key={index}>
                      <td>{concept.concept || ""}</td>
                      <td>{concept.category || "General"}</td>
                      <td>
                        <span
                          className={`${styles.relevanceBadge} ${
                            relevanceLower === "high"
                              ? styles.relevanceHigh
                              : relevanceLower === "medium"
                              ? styles.relevanceMedium
                              : styles.relevanceLow
                          }`}
                        >
                          {relevance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && (
        <EmptyState
          icon={faSearch}
          title="No Content Analysis Available"
          message="No topics, themes, or discussion flow were extracted from this audio analysis."
        />
      )}
    </div>
  );
};

export default AudioContentAnalysis;
