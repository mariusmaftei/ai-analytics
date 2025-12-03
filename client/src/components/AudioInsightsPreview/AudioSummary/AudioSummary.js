import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faList,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import {
  NO_CONTENT_PATTERN,
  EXECUTIVE_SUMMARY_FALLBACK_PATTERN,
  KEY_POINTS_FALLBACK_PATTERN,
  SECTION_HEADER_START_PATTERN,
  SUMMARY_HEADER_PATTERN,
  BULLET_MARKER_PATTERN,
  BULLET_SPLIT_PATTERN,
  SENTENCE_ENDING_PATTERN,
  SPACING_FIX_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import styles from "./AudioSummary.module.css";

// Parse sections from rawText if data.sections is empty
const parseSectionsFromRawText = (text) => {
  if (!text || typeof text !== "string") return [];
  const sections = [];

  // Normalize text - handle different line endings
  let normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Check for "no spoken content" message
  const noContentMatch = normalizedText.match(NO_CONTENT_PATTERN);
  if (noContentMatch) {
    return [
      {
        name: "No Content",
        text: "This audio contains no spoken content or lyrics, so a summary is not available.",
        content: [],
      },
    ];
  }

  // Extract Executive Summary - use a more direct approach
  // Find the position of "Executive Summary" and "Key Points"
  const execSummaryIndex = normalizedText.search(
    createSectionPattern("Executive\\s+Summary")
  );
  const keyPointsIndex = normalizedText.search(
    createSectionPattern("Key\\s+Points")
  );

  if (execSummaryIndex >= 0) {
    // Extract text after "Executive Summary"
    let startIndex = execSummaryIndex + "SECTION: Executive Summary".length;
    let endIndex = keyPointsIndex >= 0 ? keyPointsIndex : normalizedText.length;

    if (endIndex > startIndex) {
      let execText = normalizedText.substring(startIndex, endIndex).trim();

      // Remove any SECTION: markers that might be in the text
      execText = execText.replace(/SECTION:\s*/gi, "").trim();
      // Fix spacing issues (e.g., "sungby" -> "sung by", "liveperformance" -> "live performance")
      execText = execText.replace(SPACING_FIX_PATTERN, "$1 $2");
      execText = execText
        .replace(/\n{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (execText && execText.length > 10) {
        sections.push({
          name: "Executive Summary",
          text: execText,
          content: [{ type: "text", text: execText }],
        });
      }
    }
  }

  // Extract Key Points - use a more direct approach
  if (keyPointsIndex >= 0) {
    // Extract text after "Key Points"
    let startIndex = keyPointsIndex + "SECTION: Key Points".length;
    let endIndex = normalizedText.length;

    // Check if there's another SECTION after Key Points
    const nextSectionMatch = normalizedText
      .substring(startIndex)
      .match(SECTION_HEADER_START_PATTERN);
    if (nextSectionMatch) {
      endIndex = startIndex + nextSectionMatch.index;
    }

    if (endIndex > startIndex) {
      let keyPointsText = normalizedText.substring(startIndex, endIndex).trim();

      // Remove any SECTION: markers
      keyPointsText = keyPointsText.replace(/SECTION:\s*/gi, "").trim();

      // Split by newlines first
      let lines = keyPointsText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line);

      // If no newlines or only one line, try splitting by bullet markers (*, -, •)
      if (
        lines.length <= 1 &&
        (keyPointsText.includes("-") ||
          keyPointsText.includes("•") ||
          keyPointsText.includes("*"))
      ) {
        // Split by bullet markers
        lines = keyPointsText
          .split(BULLET_SPLIT_PATTERN)
          .map((line) => line.trim())
          .filter((line) => line && line.length > 0);
      }

      const content = lines
        .filter(
          (line) =>
            line && !line.match(SECTION_HEADER_START_PATTERN) && line.length > 0
        )
        .map((line) => {
          // Remove bullet markers (*, -, •)
          let cleaned = line.replace(BULLET_MARKER_PATTERN, "").trim();
          // Remove any remaining SECTION: markers
          cleaned = cleaned.replace(/SECTION:\s*/gi, "").trim();
          // Fix spacing issues (e.g., "Theaudio" -> "The audio", "singeris" -> "singer is")
          cleaned = cleaned
            .replace(SPACING_FIX_PATTERN, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return cleaned && cleaned.length > 2
            ? { type: "bullet", text: cleaned }
            : null;
        })
        .filter(Boolean);

      if (content.length > 0) {
        sections.push({
          name: "Key Points",
          text: keyPointsText,
          content: content,
        });
      }
    }
  }

  // Fallback: Try to extract content even without SECTION: markers
  if (sections.length === 0 && normalizedText.length > 50) {
    // Try to find "Executive Summary" text without SECTION: prefix
    const execFallback = normalizedText.match(
      EXECUTIVE_SUMMARY_FALLBACK_PATTERN
    );
    if (execFallback && execFallback[1]) {
      let execText = execFallback[1].trim();
      // Stop at "Key Points" if found
      const keyPointsIndex = execText.search(/Key\s+Points/i);
      if (keyPointsIndex > 0) {
        execText = execText.substring(0, keyPointsIndex).trim();
      }
      execText = execText
        .replace(/\n{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (execText && execText.length > 20) {
        sections.push({
          name: "Executive Summary",
          text: execText,
          content: [{ type: "text", text: execText }],
        });
      }
    }

    // Try to find "Key Points" text without SECTION: prefix
    const keyPointsFallback = normalizedText.match(KEY_POINTS_FALLBACK_PATTERN);
    if (keyPointsFallback && keyPointsFallback[1]) {
      let keyPointsText = keyPointsFallback[1].trim();
      const lines = keyPointsText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line);
      const content = lines
        .filter(
          (line) =>
            line && !line.match(SUMMARY_HEADER_PATTERN) && line.length > 0
        )
        .map((line) => {
          let cleaned = line.replace(BULLET_MARKER_PATTERN, "").trim();
          cleaned = cleaned.replace(/\s+/g, " ").trim();
          return cleaned && cleaned.length > 2
            ? { type: "bullet", text: cleaned }
            : null;
        })
        .filter(Boolean);

      if (content.length > 0) {
        sections.push({
          name: "Key Points",
          text: keyPointsText,
          content: content,
        });
      }
    }
  }

  return sections;
};

const AudioSummary = ({ data, rawText }) => {
  // Use parsed data or fallback to rawText parsing
  const effectiveData = useMemo(() => {
    // Always try to parse from rawText first if available, as it's the most reliable source
    if (rawText) {
      const parsedSections = parseSectionsFromRawText(rawText);
      if (parsedSections.length > 0) {
        return { sections: parsedSections };
      }
    }

    // Fallback to data.sections if it exists and has the sections we need
    if (data?.sections && data.sections.length > 0) {
      // Check if we have Executive Summary or Key Points sections
      const hasExecSummary = data.sections.some((s) =>
        s.name?.toLowerCase().includes("executive summary")
      );
      const hasKeyPoints = data.sections.some((s) =>
        s.name?.toLowerCase().includes("key points")
      );

      if (hasExecSummary || hasKeyPoints) {
        return data;
      }
    }

    return { sections: [] };
  }, [data, rawText]);

  const extractSection = React.useCallback(
    (sectionName) => {
      if (effectiveData?.sections) {
        const section = effectiveData.sections.find((s) =>
          s.name?.toLowerCase().includes(sectionName.toLowerCase())
        );
        return section;
      }
      return null;
    },
    [effectiveData]
  );

  const extractTextFromSection = (section) => {
    if (!section) return "";

    let text = "";
    if (section.text) {
      text = section.text.trim();
    } else if (section.content) {
      const textItems = section.content
        .filter((item) => item.type === "text")
        .map((item) => item.text || item.value || "")
        .filter(Boolean);

      if (textItems.length > 0) {
        text = textItems.join(" ");
      } else {
        text = section.content
          .map((item) => item.text || item.value || "")
          .filter(Boolean)
          .join(" ");
      }
    }

    // Remove SECTION: markers completely
    text = text.replace(/SECTION:\s*[^\n]*/gi, "");

    // Stop at first SECTION: marker
    let sectionIndex = text.search(/\n\s*SECTION:/i);
    if (sectionIndex <= 0) {
      sectionIndex = text.search(/SECTION:/i);
    }
    if (sectionIndex > 0) {
      text = text.substring(0, sectionIndex).trim();
    }

    // Clean up text
    text = text
      .replace(BULLET_MARKER_PATTERN, "")
      .replace(/\n{2,}/g, " ")
      .replace(SPACING_FIX_PATTERN, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();

    return text;
  };

  const extractListFromSection = (section) => {
    if (!section) return [];

    let items = [];

    if (section.content && Array.isArray(section.content)) {
      items = section.content
        .filter((item) => item.type === "bullet" || item.type === "text")
        .map((item) => {
          let text = item.text || item.value || "";
          text = text.replace(/SECTION:\s*[^\n]*/gi, "").trim();
          text = text.replace(BULLET_MARKER_PATTERN, "").trim();
          text = text
            .replace(SPACING_FIX_PATTERN, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return text;
        })
        .filter(
          (text) =>
            text && !text.match(SECTION_HEADER_START_PATTERN) && text.length > 0
        );
    } else if (section.text) {
      items = section.text
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line &&
            !line.match(SECTION_HEADER_START_PATTERN) &&
            !line.match(SUMMARY_HEADER_PATTERN)
          );
        })
        .map((line) => {
          line = line.replace(/SECTION:\s*[^\n]*/gi, "").trim();
          line = line.replace(BULLET_MARKER_PATTERN, "").trim();
          line = line
            .replace(SPACING_FIX_PATTERN, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return line;
        })
        .filter((line) => line && line.length > 0);
    }

    return items.filter(
      (item) =>
        !item.match(SECTION_HEADER_START_PATTERN) &&
        !item.match(SUMMARY_HEADER_PATTERN) &&
        item.length > 3
    );
  };

  const executiveSummary = extractSection("executive summary");
  const keyPoints = extractSection("key points");
  const noContent = extractSection("no content");

  // Extract Executive Summary text
  let executiveSummaryText = extractTextFromSection(executiveSummary);

  // Extract Key Points list
  const keyPointsList = useMemo(() => {
    return extractListFromSection(keyPoints);
  }, [keyPoints]);

  // Check if audio has no spoken content
  const hasNoSpokenContent = useMemo(() => {
    if (noContent) return true;
    const summaryText = rawText || executiveSummaryText || "";
    const noContentMessages = [
      "no spoken content",
      "no transcription available",
      "summary is not available",
      "contains no spoken content",
    ];
    return noContentMessages.some((msg) =>
      summaryText.toLowerCase().includes(msg.toLowerCase())
    );
  }, [noContent, rawText, executiveSummaryText]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faFileAlt} />
        </div>
        <div>
          <h2 className={styles.title}>Summary</h2>
          <p className={styles.subtitle}>Executive summary and key points</p>
        </div>
      </div>

      {/* No Content Message */}
      {hasNoSpokenContent && (
        <div className={styles.noContentMessage}>
          <p>
            This audio contains no spoken content or lyrics, so a summary is not
            available.
          </p>
        </div>
      )}

      {/* Executive Summary */}
      {!hasNoSpokenContent && executiveSummaryText && (
        <>
          {/* AI One-Sentence Summary Badge */}
          <div className={styles.summaryBadge}>
            <FontAwesomeIcon icon={faLightbulb} className={styles.badgeIcon} />
            <span className={styles.badgeText}>
              {(() => {
                const firstSentence = executiveSummaryText
                  .split(/[.!?]+/)[0]
                  ?.trim();
                if (firstSentence && firstSentence.length > 0) {
                  return (
                    firstSentence +
                    (firstSentence.match(SENTENCE_ENDING_PATTERN) ? "" : ".")
                  );
                }
                return (
                  executiveSummaryText.substring(0, 150) +
                  (executiveSummaryText.length > 150 ? "..." : "")
                );
              })()}
            </span>
          </div>

          {/* Executive Summary Card */}
          <div className={styles.executiveSummaryCard}>
            <h3 className={styles.executiveSummaryTitle}>Executive Summary</h3>
            <p className={styles.executiveSummaryText}>
              {executiveSummaryText}
            </p>
          </div>
        </>
      )}

      {/* Key Points */}
      {!hasNoSpokenContent && keyPointsList.length > 0 && (
        <div className={styles.keyPointsSection}>
          <div className={styles.keyPointsHeader}>
            <FontAwesomeIcon icon={faList} className={styles.keyPointsIcon} />
            <h3 className={styles.keyPointsTitle}>Key Points</h3>
          </div>
          <ul className={styles.keyPointsList}>
            {keyPointsList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {!hasNoSpokenContent &&
        !executiveSummaryText &&
        keyPointsList.length === 0 && (
          <EmptyState
            icon={faFileAlt}
            title="No Summary Available"
            message="Unable to extract summary data from this audio. The audio may not contain sufficient spoken content."
          />
        )}
    </div>
  );
};

export default AudioSummary;
