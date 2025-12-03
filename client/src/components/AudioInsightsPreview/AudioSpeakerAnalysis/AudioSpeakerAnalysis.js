import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faClock,
  faChartBar,
  faLightbulb,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import {
  SPEAKER_TIMELINE_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import styles from "./AudioSpeakerAnalysis.module.css";

const AudioSpeakerAnalysis = ({ data, rawText }) => {
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const result = {
        speakers: [],
        timeline: [],
        conversationPatterns: [],
        speakerBreakdown: [],
      };

      const text = rawText || "";
      const sections = data?.sections || [];

      // Parse Speaker Overview
      const overviewSection = sections.find((s) =>
        s.name?.toLowerCase().includes("speaker overview")
      );

      if (overviewSection) {
        const items = overviewSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Extract number of speakers
          const speakerCountMatch = itemText.match(
            /number\s+of\s+speakers[:\s]*(\d+)/i
          );
          if (speakerCountMatch) {
            result.speakerCount = parseInt(speakerCountMatch[1]);
          }
        });
      }

      // Parse Speaking Time Distribution
      const timeDistributionSection = sections.find((s) =>
        s.name?.toLowerCase().includes("speaking time distribution")
      );

      if (timeDistributionSection) {
        const items = timeDistributionSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Parse format: "Speaker A: 3:20: 55%: 7 words: 12 segments"
          const speakerMatch = itemText.match(
            /(Speaker\s+[A-Z]|[^:]+):\s*(\d+):(\d+):\s*(\d+)%:\s*(\d+)\s+words:\s*(\d+)\s+segments/i
          );
          if (speakerMatch) {
            const minutes = parseInt(speakerMatch[2]);
            const seconds = parseInt(speakerMatch[3]);
            const totalSeconds = minutes * 60 + seconds;

            result.speakers.push({
              label: speakerMatch[1].trim(),
              totalTime: `${minutes}:${seconds.toString().padStart(2, "0")}`,
              totalSeconds: totalSeconds,
              percentage: parseInt(speakerMatch[4]),
              avgSentenceLength: parseInt(speakerMatch[5]),
              segmentCount: parseInt(speakerMatch[6]),
            });
          } else {
            // Try simpler format: "Speaker A: 3:20: 55%"
            const speakerMatch2 = itemText.match(
              /(Speaker\s+[A-Z]|[^:]+):\s*(\d+):(\d+):\s*(\d+)%/i
            );
            if (speakerMatch2) {
              const minutes = parseInt(speakerMatch2[2]);
              const seconds = parseInt(speakerMatch2[3]);
              const totalSeconds = minutes * 60 + seconds;

              result.speakers.push({
                label: speakerMatch2[1].trim(),
                totalTime: `${minutes}:${seconds.toString().padStart(2, "0")}`,
                totalSeconds: totalSeconds,
                percentage: parseInt(speakerMatch2[4]),
                avgSentenceLength: 0,
                segmentCount: 0,
              });
            }
          }
        });
      }

      // Parse Speaker Timeline
      const timelineSection = sections.find((s) =>
        s.name?.toLowerCase().includes("speaker timeline")
      );

      if (timelineSection) {
        const items = timelineSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Parse format: "00:00-00:15: Speaker A: Description"
          const timelineMatch = itemText.match(
            /(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*(Speaker\s+[A-Z]|[^:]+):\s*(.+)/i
          );
          if (timelineMatch) {
            result.timeline.push({
              startTime: timelineMatch[1],
              endTime: timelineMatch[2],
              speaker: timelineMatch[3].trim(),
              description: timelineMatch[4].trim(),
            });
          }
        });
      }

      // Parse Conversation Patterns
      const patternsSection = sections.find((s) =>
        s.name?.toLowerCase().includes("conversation patterns")
      );

      if (patternsSection) {
        const items = patternsSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Extract bullet points or lines
          const lines = itemText
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          lines.forEach((line) => {
            const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
            if (cleanLine.length > 0) {
              result.conversationPatterns.push(cleanLine);
            }
          });
        });
      }

      // Parse Speaker Breakdown
      const breakdownSection = sections.find((s) =>
        s.name?.toLowerCase().includes("speaker breakdown")
      );

      if (breakdownSection) {
        const items = breakdownSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          if (itemText.includes("SECTION:")) return;

          // Parse format: "Speaker A: 3:20: 55%: 12: 15 sec: Notes"
          const breakdownMatch = itemText.match(
            /(Speaker\s+[A-Z]|[^:]+):\s*(\d+):(\d+):\s*(\d+)%:\s*(\d+):\s*(\d+)\s+sec:\s*(.+)/i
          );
          if (breakdownMatch) {
            result.speakerBreakdown.push({
              speaker: breakdownMatch[1].trim(),
              totalTime: `${breakdownMatch[2]}:${breakdownMatch[3].padStart(
                2,
                "0"
              )}`,
              percentage: parseInt(breakdownMatch[4]),
              segments: parseInt(breakdownMatch[5]),
              avgSegmentLength: `${breakdownMatch[6]} sec`,
              notes: breakdownMatch[7].trim(),
            });
          }
        });
      }

      // Always try parsing from rawText (more reliable than sections)
      if (text) {
        // Parse Speaking Time Distribution from rawText
        const timeDistMatch = text.match(
          /SECTION:\s*Speaking\s+Time\s+Distribution\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
        );
        if (timeDistMatch) {
          const timeDistText = timeDistMatch[1];

          // Handle concatenated entries - use regex to find all speaker entries
          // Format variations:
          // "Speaker A: 0:11: 3.6%: 7 words: 12 segments"
          // "Speaker A: 0:11: 3.6%" (simpler format)
          // Handle decimal percentages like "3.6%"
          const speakerPattern =
            /(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(\d+):(\d+):\s*([\d.]+)%(?::\s*(\d+)\s+words:\s*(\d+)\s+segments)?/gi;
          const matches = [...timeDistText.matchAll(speakerPattern)];

          if (matches.length > 0) {
            matches.forEach((match) => {
              // Clean speaker label - remove any trailing numbers or "segments" text
              let speakerLabel = match[1].trim();
              // Remove "X segments" at the end (with or without space)
              speakerLabel = speakerLabel
                .replace(/\s*\d+\s*segments?\s*$/i, "")
                .trim();
              // Remove "X segments" at the beginning (with or without space)
              speakerLabel = speakerLabel
                .replace(/^\s*\d+\s*segments?\s*/i, "")
                .trim();
              // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
              speakerLabel = speakerLabel
                .replace(/\d+\s*segments?(?=Speaker)/i, "")
                .trim();

              const minutes = parseInt(match[2]);
              const seconds = parseInt(match[3]);
              result.speakers.push({
                label: speakerLabel,
                totalTime: `${minutes}:${seconds.toString().padStart(2, "0")}`,
                totalSeconds: minutes * 60 + seconds,
                percentage: parseFloat(match[4]),
                avgSentenceLength: match[5] ? parseInt(match[5]) : 0,
                segmentCount: match[6] ? parseInt(match[6]) : 0,
              });
            });
          } else {
            // Fallback: Try splitting by newlines
            const lines = timeDistText
              .split(/\n/)
              .filter((line) => line.trim().length > 0);
            lines.forEach((line) => {
              // Try full format first
              const speakerMatch = line.match(
                /(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(\d+):(\d+):\s*([\d.]+)%:\s*(\d+)\s+words:\s*(\d+)\s+segments/i
              );
              if (speakerMatch) {
                // Clean speaker label - remove any trailing numbers or "segments" text
                let speakerLabel = speakerMatch[1].trim();
                // Remove "X segments" at the end (with or without space)
                speakerLabel = speakerLabel
                  .replace(/\s*\d+\s*segments?\s*$/i, "")
                  .trim();
                // Remove "X segments" at the beginning (with or without space)
                speakerLabel = speakerLabel
                  .replace(/^\s*\d+\s*segments?\s*/i, "")
                  .trim();
                // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
                speakerLabel = speakerLabel
                  .replace(/\d+\s*segments?(?=Speaker)/i, "")
                  .trim();

                const minutes = parseInt(speakerMatch[2]);
                const seconds = parseInt(speakerMatch[3]);
                result.speakers.push({
                  label: speakerLabel,
                  totalTime: `${minutes}:${seconds
                    .toString()
                    .padStart(2, "0")}`,
                  totalSeconds: minutes * 60 + seconds,
                  percentage: parseFloat(speakerMatch[4]),
                  avgSentenceLength: parseInt(speakerMatch[5]),
                  segmentCount: parseInt(speakerMatch[6]),
                });
              } else {
                // Try simpler format without words/segments
                const speakerMatch2 = line.match(
                  /(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(\d+):(\d+):\s*([\d.]+)%/i
                );
                if (speakerMatch2) {
                  // Clean speaker label
                  let speakerLabel = speakerMatch2[1].trim();
                  // Remove "X segments" at the end (with or without space)
                  speakerLabel = speakerLabel
                    .replace(/\s*\d+\s*segments?\s*$/i, "")
                    .trim();
                  // Remove "X segments" at the beginning (with or without space)
                  speakerLabel = speakerLabel
                    .replace(/^\s*\d+\s*segments?\s*/i, "")
                    .trim();
                  // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
                  speakerLabel = speakerLabel
                    .replace(/\d+\s*segments?(?=Speaker)/i, "")
                    .trim();

                  const minutes = parseInt(speakerMatch2[2]);
                  const seconds = parseInt(speakerMatch2[3]);
                  result.speakers.push({
                    label: speakerLabel,
                    totalTime: `${minutes}:${seconds
                      .toString()
                      .padStart(2, "0")}`,
                    totalSeconds: minutes * 60 + seconds,
                    percentage: parseFloat(speakerMatch2[4]),
                    avgSentenceLength: 0,
                    segmentCount: 0,
                  });
                }
              }
            });
          }
        } else {
          // Try to extract speakers from breakdown if available
          if (result.speakerBreakdown.length > 0) {
            result.speakerBreakdown.forEach((breakdown) => {
              // Check if speaker already exists
              const existingSpeaker = result.speakers.find(
                (s) => s.label === breakdown.speaker
              );
              if (!existingSpeaker) {
                // Parse time from breakdown
                const [minutes, seconds] = breakdown.totalTime
                  .split(":")
                  .map(Number);
                // Clean speaker label - remove any trailing numbers or "segments" text
                let speakerLabel = breakdown.speaker.trim();
                // Remove "X segments" at the end (with or without space)
                speakerLabel = speakerLabel
                  .replace(/\s*\d+\s*segments?\s*$/i, "")
                  .trim();
                // Remove "X segments" at the beginning (with or without space)
                speakerLabel = speakerLabel
                  .replace(/^\s*\d+\s*segments?\s*/i, "")
                  .trim();
                // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
                speakerLabel = speakerLabel
                  .replace(/\d+\s*segments?(?=Speaker)/i, "")
                  .trim();

                result.speakers.push({
                  label: speakerLabel,
                  totalTime: breakdown.totalTime,
                  totalSeconds: minutes * 60 + seconds,
                  percentage: breakdown.percentage,
                  avgSentenceLength: 0,
                  segmentCount: breakdown.segments,
                });
              }
            });
          }
        }

        // Parse Speaker Timeline from rawText
        const timelineMatch = text.match(
          createSectionPattern("Speaker\\s+Timeline")
        );
        if (timelineMatch) {
          const timelineText = timelineMatch[1];

          // Handle concatenated timeline entries (e.g., "00:00-00:01: Speaker A: Text00:01-00:02: Speaker B: Text")
          // Use regex with negative lookahead to split at time patterns
          // Using centralized pattern with global flag for matchAll
          const timelinePatternGlobal = new RegExp(
            SPEAKER_TIMELINE_PATTERN.source
              .replace(/^\^/, "")
              .replace(/\$$/, "") + "(?=\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2}|$)",
            "gi"
          );
          const matches = [...timelineText.matchAll(timelinePatternGlobal)];

          if (matches.length > 0) {
            matches.forEach((match) => {
              result.timeline.push({
                startTime: match[1],
                endTime: match[2],
                speaker: match[3].trim(),
                description: match[4].trim(),
              });
            });
          } else {
            // Fallback: Try splitting by newlines first
            const lines = timelineText
              .split(/\n/)
              .filter((line) => line.trim().length > 0);
            lines.forEach((line) => {
              // Try format: "00:00-00:15: Speaker A: Description"
              const timelineItemMatch = line.match(
                /(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(.+)/i
              );
              if (timelineItemMatch) {
                result.timeline.push({
                  startTime: timelineItemMatch[1],
                  endTime: timelineItemMatch[2],
                  speaker: timelineItemMatch[3].trim(),
                  description: timelineItemMatch[4].trim(),
                });
              } else {
                // Try format without colon separator: "00:00-00:15 Speaker A Description"
                const timelineItemMatch2 = line.match(
                  /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(Speaker\s+[A-Z]|[^\n]+)/i
                );
                if (timelineItemMatch2) {
                  result.timeline.push({
                    startTime: timelineItemMatch2[1],
                    endTime: timelineItemMatch2[2],
                    speaker: timelineItemMatch2[3].trim(),
                    description: "",
                  });
                }
              }
            });
          }
        }

        // Parse Conversation Patterns from rawText
        const patternsMatch = text.match(
          createSectionPattern("Conversation\\s+Patterns")
        );
        if (patternsMatch) {
          const patternsText = patternsMatch[1];

          // Handle concatenated patterns (e.g., "Pattern 1- Pattern 2- Pattern 3")
          // Split by dash or bullet at start of line, but also handle cases where they're concatenated
          let patternsContent = patternsText;

          // First try splitting by newlines
          const lines = patternsContent
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          if (lines.length > 0) {
            lines.forEach((line) => {
              const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
              if (cleanLine.length > 0 && !cleanLine.startsWith("SECTION:")) {
                // Check if line contains multiple patterns separated by "- " (but not time ranges like "00:00-00:01")
                if (
                  cleanLine.includes("- ") &&
                  !cleanLine.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/)
                ) {
                  // Split by "- " but preserve the dash
                  const subPatterns = cleanLine.split(/(?<!:\d{2})-\s+/);
                  subPatterns.forEach((pattern) => {
                    const trimmed = pattern.trim();
                    if (trimmed.length > 0) {
                      result.conversationPatterns.push(trimmed);
                    }
                  });
                } else {
                  result.conversationPatterns.push(cleanLine);
                }
              }
            });
          } else {
            // If no newlines, try splitting by "- " pattern
            const splitPatterns = patternsText.split(/(?<!:\d{2})-\s+/);
            splitPatterns.forEach((pattern) => {
              const trimmed = pattern.replace(/^[-•*]\s*/, "").trim();
              if (trimmed.length > 0 && !trimmed.startsWith("SECTION:")) {
                result.conversationPatterns.push(trimmed);
              }
            });
          }
        }

        // Parse Speaker Breakdown from rawText
        const breakdownMatch = text.match(
          createSectionPattern("Speaker\\s+Breakdown")
        );
        if (breakdownMatch) {
          const breakdownText = breakdownMatch[1];

          // Handle concatenated entries - use regex to find all speaker entries
          // Format: "Speaker A: 0:11: 3.6%: 12: 0.92 sec: Notes.Speaker B: 4:54: 96.4%:1: 294 sec: Notes"
          // Note: Handle variations like "3.6%" (decimal), "12: 0.92 sec" (space after colon), "96.4%:1:" (no space after %)
          const breakdownPattern =
            /(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(\d+):(\d+):\s*([\d.]+)%:?\s*(\d+):?\s*([\d.]+)\s+sec:\s*((?:(?!Speaker\s+[A-Z]|[A-Z][^:]*?:\s*\d+:\d+).)+?)(?=Speaker\s+[A-Z]|[A-Z][^:]*?:\s*\d+:\d+|$)/gi;
          const matches = [...breakdownText.matchAll(breakdownPattern)];

          if (matches.length > 0) {
            matches.forEach((match) => {
              // Clean speaker label - remove any trailing numbers or "segments" text
              let speakerLabel = match[1].trim();
              // Remove "X segments" at the end (with or without space)
              speakerLabel = speakerLabel
                .replace(/\s*\d+\s*segments?\s*$/i, "")
                .trim();
              // Remove "X segments" at the beginning (with or without space)
              speakerLabel = speakerLabel
                .replace(/^\s*\d+\s*segments?\s*/i, "")
                .trim();
              // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
              speakerLabel = speakerLabel
                .replace(/\d+\s*segments?(?=Speaker)/i, "")
                .trim();

              // Clean notes - add space after periods if missing
              let notes = match[7].trim();
              notes = notes.replace(/\.([A-Z])/g, ". $1");

              result.speakerBreakdown.push({
                speaker: speakerLabel,
                totalTime: `${match[2]}:${match[3].padStart(2, "0")}`,
                percentage: parseFloat(match[4]),
                segments: parseInt(match[5]),
                avgSegmentLength: `${match[6]} sec`,
                notes: notes,
              });
            });
          } else {
            // Fallback: Try splitting by newlines
            const lines = breakdownText
              .split(/\n/)
              .filter((line) => line.trim().length > 0);
            lines.forEach((line) => {
              // Parse format: "Speaker A: 3:20: 55%: 12: 15 sec: Notes"
              const breakdownItemMatch = line.match(
                /(Speaker\s+[A-Z][^:]*?|[^:]+?):\s*(\d+):(\d+):\s*([\d.]+)%:?\s*(\d+):?\s*([\d.]+)\s+sec:\s*(.+)/i
              );
              if (breakdownItemMatch) {
                // Clean speaker label
                let speakerLabel = breakdownItemMatch[1].trim();
                // Remove "X segments" at the end (with or without space)
                speakerLabel = speakerLabel
                  .replace(/\s*\d+\s*segments?\s*$/i, "")
                  .trim();
                // Remove "X segments" at the beginning (with or without space)
                speakerLabel = speakerLabel
                  .replace(/^\s*\d+\s*segments?\s*/i, "")
                  .trim();
                // Remove "segments" followed immediately by "Speaker" (e.g., "17 segmentsSpeaker B")
                speakerLabel = speakerLabel
                  .replace(/\d+\s*segments?(?=Speaker)/i, "")
                  .trim();

                // Clean notes
                let notes = breakdownItemMatch[7].trim();
                notes = notes.replace(/\.([A-Z])/g, ". $1");

                result.speakerBreakdown.push({
                  speaker: speakerLabel,
                  totalTime: `${
                    breakdownItemMatch[2]
                  }:${breakdownItemMatch[3].padStart(2, "0")}`,
                  percentage: parseFloat(breakdownItemMatch[4]),
                  segments: parseInt(breakdownItemMatch[5]),
                  avgSegmentLength: `${breakdownItemMatch[6]} sec`,
                  notes: notes,
                });
              }
            });
          }
        }
      }

      // Sort speakers by percentage (descending)
      result.speakers.sort((a, b) => b.percentage - a.percentage);

      // Validate parsed data
      const isValid = validateParsedData(
        result,
        {
          speakers: "array",
          timeline: "array",
          conversationPatterns: "array",
          speakerBreakdown: "array",
        },
        "AudioSpeakerAnalysis"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioSpeakerAnalysis", "Parsing error:", error);
      setParsingError(error);
      return {
        speakers: [],
        timeline: [],
        conversationPatterns: [],
        speakerBreakdown: [],
      };
    }
  }, [data, rawText]);

  const getSpeakerColor = (index) => {
    const colors = [
      "#9333ea", // Purple
      "#3b82f6", // Blue
      "#22c55e", // Green
      "#f59e0b", // Orange
      "#ef4444", // Red
      "#8b5cf6", // Violet
      "#06b6d4", // Cyan
      "#ec4899", // Pink
    ];
    return colors[index % colors.length];
  };

  const calculateTimelinePosition = (startTime, totalDuration) => {
    const [minutes, seconds] = startTime.split(":").map(Number);
    const startSeconds = minutes * 60 + seconds;
    return (startSeconds / totalDuration) * 100;
  };

  const calculateTimelineWidth = (startTime, endTime, totalDuration) => {
    const [startM, startS] = startTime.split(":").map(Number);
    const [endM, endS] = endTime.split(":").map(Number);
    const startSeconds = startM * 60 + startS;
    const endSeconds = endM * 60 + endS;
    const duration = endSeconds - startSeconds;
    return (duration / totalDuration) * 100;
  };

  // Calculate total duration from timeline or speakers
  const totalDuration = useMemo(() => {
    if (parsedData.timeline.length > 0) {
      const lastItem = parsedData.timeline[parsedData.timeline.length - 1];
      const [minutes, seconds] = lastItem.endTime.split(":").map(Number);
      return minutes * 60 + seconds;
    }
    // Fallback: calculate from speakers' total time
    if (parsedData.speakers.length > 0) {
      const maxTotalSeconds = Math.max(
        ...parsedData.speakers.map((s) => s.totalSeconds)
      );
      return maxTotalSeconds;
    }
    return 0;
  }, [parsedData.timeline, parsedData.speakers]);

  // Group timeline by speaker
  const timelineBySpeaker = useMemo(() => {
    const grouped = {};
    parsedData.timeline.forEach((item) => {
      if (!grouped[item.speaker]) {
        grouped[item.speaker] = [];
      }
      grouped[item.speaker].push(item);
    });
    return grouped;
  }, [parsedData.timeline]);

  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <h2 className={styles.title}>Speaker Analysis</h2>
            <p className={styles.subtitle}>
              Speaker identification and patterns
            </p>
          </div>
        </div>
        <ParsingError
          message="Failed to parse speaker data. The analysis may be in an unexpected format."
          showRawData={true}
          rawData={rawText}
        />
      </div>
    );
  }

  const hasData =
    parsedData.speakers.length > 0 ||
    parsedData.timeline.length > 0 ||
    parsedData.conversationPatterns.length > 0 ||
    parsedData.speakerBreakdown.length > 0;

  if (!hasData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <h2 className={styles.title}>Speaker Analysis</h2>
            <p className={styles.subtitle}>
              Speaker identification and patterns
            </p>
          </div>
        </div>
        <EmptyState
          icon={faUsers}
          title="No Speaker Data Found"
          message="No speaker identification or analysis data was extracted from this audio."
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faUsers} />
        </div>
        <div>
          <h2 className={styles.title}>Speaker Analysis</h2>
          <p className={styles.subtitle}>Speaker identification and patterns</p>
        </div>
      </div>

      {/* Speaker List Cards */}
      {parsedData.speakers.length > 0 && (
        <div className={styles.speakerCardsSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faUsers} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Speakers</h3>
          </div>
          <div className={styles.speakerCardsGrid}>
            {parsedData.speakers.map((speaker, index) => (
              <div key={index} className={styles.speakerCard}>
                <div
                  className={styles.speakerIndicator}
                  style={{ backgroundColor: getSpeakerColor(index) }}
                ></div>
                <div className={styles.speakerCardContent}>
                  <h4 className={styles.speakerLabel}>{speaker.label}</h4>
                  {speaker.percentage >= 50 && (
                    <div className={styles.dominantBadge}>Dominant speaker</div>
                  )}
                  <div className={styles.speakerStats}>
                    <div className={styles.speakerStat}>
                      <span className={styles.statLabel}>Speaking time:</span>
                      <span className={styles.statValue}>
                        {speaker.totalTime}
                      </span>
                    </div>
                    <div className={styles.speakerStat}>
                      <span className={styles.statLabel}>Percentage:</span>
                      <span className={styles.statValue}>
                        {speaker.percentage}%
                      </span>
                    </div>
                    {speaker.avgSentenceLength > 0 && (
                      <div className={styles.speakerStat}>
                        <span className={styles.statLabel}>
                          Avg sentence length:
                        </span>
                        <span className={styles.statValue}>
                          {speaker.avgSentenceLength} words
                        </span>
                      </div>
                    )}
                    {speaker.segmentCount > 0 && (
                      <div className={styles.speakerStat}>
                        <span className={styles.statLabel}>Segments:</span>
                        <span className={styles.statValue}>
                          {speaker.segmentCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speaker Timeline Visualization */}
      {(parsedData.timeline.length > 0 || parsedData.speakers.length > 0) &&
        totalDuration > 0 && (
          <div className={styles.timelineSection}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faClock} className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>Speaker Timeline</h3>
            </div>
            <div className={styles.timelineContainer}>
              <div className={styles.timelineScale}>
                <span>0:00</span>
                <span>
                  {Math.floor(totalDuration / 60)}:
                  {String(totalDuration % 60).padStart(2, "0")}
                </span>
              </div>
              <div className={styles.timelineTracks}>
                {parsedData.speakers.map((speaker, speakerIndex) => {
                  const speakerTimeline =
                    timelineBySpeaker[speaker.label] || [];
                  // If no timeline data, create a simple bar based on percentage
                  const hasTimelineData = speakerTimeline.length > 0;

                  return (
                    <div key={speakerIndex} className={styles.timelineTrack}>
                      <div className={styles.timelineTrackLabel}>
                        <div
                          className={styles.timelineTrackColor}
                          style={{
                            backgroundColor: getSpeakerColor(speakerIndex),
                          }}
                        ></div>
                        <span>{speaker.label}</span>
                      </div>
                      <div className={styles.timelineTrackBar}>
                        {hasTimelineData ? (
                          speakerTimeline.map((item, itemIndex) => {
                            const left = calculateTimelinePosition(
                              item.startTime,
                              totalDuration
                            );
                            const width = calculateTimelineWidth(
                              item.startTime,
                              item.endTime,
                              totalDuration
                            );
                            return (
                              <div
                                key={itemIndex}
                                className={styles.timelineSegment}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  backgroundColor:
                                    getSpeakerColor(speakerIndex),
                                }}
                                title={`${item.startTime}-${item.endTime}: ${item.description}`}
                              ></div>
                            );
                          })
                        ) : (
                          // Fallback: show a single bar based on percentage
                          <div
                            className={styles.timelineSegment}
                            style={{
                              left: "0%",
                              width: `${speaker.percentage}%`,
                              backgroundColor: getSpeakerColor(speakerIndex),
                            }}
                            title={`${speaker.label}: ${speaker.percentage}% of total time`}
                          ></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* Speaking Duration Chart */}
      {parsedData.speakers.length > 0 && (
        <div className={styles.durationChartSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faChartBar} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Speaking Duration</h3>
          </div>
          <div className={styles.durationChart}>
            {parsedData.speakers.map((speaker, index) => {
              const maxPercentage = Math.max(
                ...parsedData.speakers.map((s) => s.percentage)
              );
              const barWidth = (speaker.percentage / maxPercentage) * 100;

              return (
                <div key={index} className={styles.durationBar}>
                  <div className={styles.durationBarLabel}>{speaker.label}</div>
                  <div className={styles.durationBarContainer}>
                    <div
                      className={styles.durationBarFill}
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: getSpeakerColor(index),
                      }}
                    ></div>
                    <span className={styles.durationBarPercentage}>
                      {speaker.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversation Pattern Insights */}
      {parsedData.conversationPatterns.length > 0 && (
        <div className={styles.patternsSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon
              icon={faLightbulb}
              className={styles.sectionIcon}
            />
            <h3 className={styles.sectionTitle}>Conversation Patterns</h3>
          </div>
          <div className={styles.patternsCard}>
            <ul className={styles.patternsList}>
              {parsedData.conversationPatterns.map((pattern, index) => (
                <li key={index} className={styles.patternItem}>
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Speaker Breakdown Table */}
      {parsedData.speakerBreakdown.length > 0 && (
        <div className={styles.breakdownTableSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faTable} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Speaker Breakdown</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.breakdownTable}>
              <thead>
                <tr>
                  <th>Speaker</th>
                  <th>Total Time</th>
                  <th>% Talk</th>
                  <th>Speaking Segments</th>
                  <th>Avg Segment Length</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.speakerBreakdown.map((speaker, index) => (
                  <tr key={index}>
                    <td className={styles.speakerCell}>
                      <div
                        className={styles.speakerDot}
                        style={{ backgroundColor: getSpeakerColor(index) }}
                      ></div>
                      {speaker.speaker}
                    </td>
                    <td className={styles.timeCell}>{speaker.totalTime}</td>
                    <td className={styles.percentageCell}>
                      {speaker.percentage}%
                    </td>
                    <td className={styles.segmentsCell}>{speaker.segments}</td>
                    <td className={styles.avgLengthCell}>
                      {speaker.avgSegmentLength}
                    </td>
                    <td className={styles.notesCell}>{speaker.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioSpeakerAnalysis;
