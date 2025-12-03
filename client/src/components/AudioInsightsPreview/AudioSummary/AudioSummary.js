import React, { useMemo, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faList,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioSummary.module.css";

// Parse sections from rawText if data.sections is empty
const parseSectionsFromRawText = (text) => {
  if (!text || typeof text !== "string") return [];
  const sections = [];

  // Normalize text - handle different line endings
  let normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  console.log(
    "[parseSectionsFromRawText] Input text length:",
    normalizedText.length
  );
  console.log(
    "[parseSectionsFromRawText] First 200 chars:",
    normalizedText.substring(0, 200)
  );

  // Check for "no spoken content" message
  const noContentMatch = normalizedText.match(
    /This audio contains no spoken content or lyrics, so a summary is not available/i
  );
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
    /SECTION:\s*Executive\s+Summary/i
  );
  const keyPointsIndex = normalizedText.search(/SECTION:\s*Key\s+Points/i);

  console.log(
    "[parseSectionsFromRawText] Exec Summary index:",
    execSummaryIndex
  );
  console.log("[parseSectionsFromRawText] Key Points index:", keyPointsIndex);

  if (execSummaryIndex >= 0) {
    // Extract text after "Executive Summary"
    let startIndex = execSummaryIndex + "SECTION: Executive Summary".length;
    let endIndex = keyPointsIndex >= 0 ? keyPointsIndex : normalizedText.length;

    if (endIndex > startIndex) {
      let execText = normalizedText.substring(startIndex, endIndex).trim();
      console.log(
        "[parseSectionsFromRawText] Extracted exec text (first 100 chars):",
        execText.substring(0, 100)
      );

      // Remove any SECTION: markers that might be in the text
      execText = execText.replace(/SECTION:\s*/gi, "").trim();
      // Fix spacing issues (e.g., "sungby" -> "sung by", "liveperformance" -> "live performance")
      execText = execText.replace(/([a-z])([A-Z])/g, "$1 $2");
      execText = execText
        .replace(/\n{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (execText && execText.length > 10) {
        console.log(
          "[parseSectionsFromRawText] Adding Executive Summary, length:",
          execText.length
        );
        sections.push({
          name: "Executive Summary",
          text: execText,
          content: [{ type: "text", text: execText }],
        });
      } else {
        console.log(
          "[parseSectionsFromRawText] Executive Summary text too short or empty:",
          execText.length
        );
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
      .match(/SECTION:/i);
    if (nextSectionMatch) {
      endIndex = startIndex + nextSectionMatch.index;
    }

    if (endIndex > startIndex) {
      let keyPointsText = normalizedText.substring(startIndex, endIndex).trim();
      console.log(
        "[parseSectionsFromRawText] Extracted key points text (first 200 chars):",
        keyPointsText.substring(0, 200)
      );

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
          .split(/(?=[-•*])/)
          .map((line) => line.trim())
          .filter((line) => line && line.length > 0);
      }

      console.log(
        "[parseSectionsFromRawText] Key points lines count:",
        lines.length
      );

      const content = lines
        .filter((line) => line && !line.match(/^SECTION:/i) && line.length > 0)
        .map((line) => {
          // Remove bullet markers (*, -, •)
          let cleaned = line.replace(/^[-•*]\s*/, "").trim();
          // Remove any remaining SECTION: markers
          cleaned = cleaned.replace(/SECTION:\s*/gi, "").trim();
          // Fix spacing issues (e.g., "Theaudio" -> "The audio", "singeris" -> "singer is")
          cleaned = cleaned
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return cleaned && cleaned.length > 2
            ? { type: "bullet", text: cleaned }
            : null;
        })
        .filter(Boolean);

      console.log(
        "[parseSectionsFromRawText] Key points content items:",
        content.length
      );

      if (content.length > 0) {
        sections.push({
          name: "Key Points",
          text: keyPointsText,
          content: content,
        });
      } else {
        console.log(
          "[parseSectionsFromRawText] No valid key points content found"
        );
      }
    }
  }

  // Fallback: Try to extract content even without SECTION: markers
  if (sections.length === 0 && normalizedText.length > 50) {
    // Try to find "Executive Summary" text without SECTION: prefix
    const execFallback = normalizedText.match(
      /(?:Executive\s+Summary|Executive Summary)[:\n\s]*([\s\S]{50,}?)(?=Key\s+Points|$)/i
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
    const keyPointsFallback = normalizedText.match(
      /(?:Key\s+Points|Key Points)[:\n\s]*([\s\S]*?)(?=\n\s*(?:SECTION:|$))/i
    );
    if (keyPointsFallback && keyPointsFallback[1]) {
      let keyPointsText = keyPointsFallback[1].trim();
      const lines = keyPointsText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line);
      const content = lines
        .filter(
          (line) =>
            line &&
            !line.match(/^(Executive Summary|Key Points):?/i) &&
            line.length > 0
        )
        .map((line) => {
          let cleaned = line.replace(/^[-•*]\s*/, "").trim();
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

  console.log(
    "[parseSectionsFromRawText] Final sections count:",
    sections.length
  );
  return sections;
};

const AudioSummary = ({ data, rawText, analysisData }) => {
  // Debug logging
  useEffect(() => {
    console.log("[AudioSummary] ========== DEBUG ==========");
    console.log("[AudioSummary] Data:", data);
    console.log("[AudioSummary] Data sections:", data?.sections);
    console.log("[AudioSummary] RawText:", rawText);
    console.log("[AudioSummary] RawText length:", rawText?.length);
    console.log("[AudioSummary] Sections count:", data?.sections?.length);
    if (rawText) {
      console.log(
        "[AudioSummary] RawText preview (first 500 chars):",
        rawText.substring(0, 500)
      );
      const parsed = parseSectionsFromRawText(rawText);
      console.log("[AudioSummary] Parsed sections:", parsed);
      console.log("[AudioSummary] Parsed sections count:", parsed.length);
      if (parsed.length > 0) {
        parsed.forEach((section, idx) => {
          console.log(
            `[AudioSummary] Section ${idx}:`,
            section.name,
            "Content length:",
            section.content?.length || 0,
            "Text length:",
            section.text?.length || 0
          );
        });
      }
    }
  }, [data, rawText]);

  // Use parsed data or fallback to rawText parsing
  const effectiveData = useMemo(() => {
    // Always try to parse from rawText first if available, as it's the most reliable source
    if (rawText) {
      const parsedSections = parseSectionsFromRawText(rawText);
      if (parsedSections.length > 0) {
        console.log(
          "[AudioSummary] Using parsed sections from rawText:",
          parsedSections.length
        );
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
        console.log(
          "[AudioSummary] Using data.sections:",
          data.sections.length
        );
        return data;
      }
    }

    console.log("[AudioSummary] No valid sections found, returning empty");
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
      .replace(/^[-•*]\s+/gm, "")
      .replace(/\n{2,}/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
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
          text = text.replace(/^[-•*]\s+/, "").trim();
          text = text
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return text;
        })
        .filter((text) => text && !text.match(/^SECTION:/i) && text.length > 0);
    } else if (section.text) {
      items = section.text
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => {
          return (
            line &&
            !line.match(/^SECTION:/i) &&
            !line.match(/^(Executive Summary|Key Points):?\s*$/i)
          );
        })
        .map((line) => {
          line = line.replace(/SECTION:\s*[^\n]*/gi, "").trim();
          line = line.replace(/^[-•*]\s+/, "").trim();
          line = line
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();
          return line;
        })
        .filter((line) => line && line.length > 0);
    }

    return items.filter(
      (item) =>
        !item.match(/^SECTION:/i) &&
        !item.match(/^(Executive Summary|Key Points):?\s*$/i) &&
        item.length > 3
    );
  };

  const executiveSummary = extractSection("executive summary");
  const keyPoints = extractSection("key points");
  const noContent = extractSection("no content");

  console.log("[AudioSummary] Executive Summary section:", executiveSummary);
  console.log("[AudioSummary] Key Points section:", keyPoints);

  // Extract Executive Summary text
  let executiveSummaryText = extractTextFromSection(executiveSummary);
  console.log(
    "[AudioSummary] Executive Summary text length:",
    executiveSummaryText.length
  );

  // Extract Key Points list
  const keyPointsList = useMemo(() => {
    const list = extractListFromSection(keyPoints);
    console.log("[AudioSummary] Key Points list length:", list.length);
    return list;
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
                    firstSentence + (firstSentence.match(/[.!?]$/) ? "" : ".")
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

      {/* Fallback: Show raw text if no sections were parsed */}
      {!hasNoSpokenContent &&
        !executiveSummaryText &&
        keyPointsList.length === 0 &&
        rawText && (
          <div className={styles.noContentMessage}>
            <p>Unable to parse summary data. Raw response:</p>
            <pre
              style={{
                marginTop: "1rem",
                whiteSpace: "pre-wrap",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
              }}
            >
              {rawText.substring(0, 1000)}
              {rawText.length > 1000 ? "..." : ""}
            </pre>
          </div>
        )}
    </div>
  );
};

export default AudioSummary;
