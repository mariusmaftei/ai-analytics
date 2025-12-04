import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faKey,
  faStickyNote,
  faBullseye,
  faCommentDots,
  faThumbtack,
  faChartLine,
  faFilter,
  faUser,
  faEye,
  faEyeSlash,
  faGavel,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { TIMELINE_SCHEMA } from "../../../utils/audioJsonSchemas";
import {
  DISCUSSION_TIMELINE_PATTERN,
  DISCUSSION_TIMELINE_SIMPLE_PATTERN,
  DISCUSSION_TIMELINE_GLOBAL_PATTERN,
  KEY_MOMENT_PATTERN,
  KEY_MOMENT_GLOBAL_PATTERN,
  TOPIC_TRANSITION_PATTERN,
  TOPIC_TRANSITION_GLOBAL_PATTERN,
  TRANSCRIPT_HIGHLIGHT_PATTERN,
  TRANSCRIPT_HIGHLIGHT_QUOTED_PATTERN,
  TRANSCRIPT_HIGHLIGHT_QUOTED_CONTENT_PATTERN,
  TRANSCRIPT_HIGHLIGHT_CONTENT_PATTERN,
  TRANSCRIPT_HIGHLIGHT_GLOBAL_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import styles from "./AudioTimeline.module.css";

const AudioTimeline = ({ data, rawText }) => {
  const [filters, setFilters] = useState({
    keyMoments: true,
    speakers: true,
    sentiment: true,
    actionItems: true,
    decisions: true,
  });
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const text = rawText || "";

      // Try JSON parsing first (new architecture)
      const jsonResult = parseAudioAnalysisData(
        text,
        TIMELINE_SCHEMA,
        null, // Will use text parser as fallback
        "AudioTimeline"
      );

      // If JSON parsing succeeded, transform to expected format
      if (jsonResult.data && jsonResult.format === 'json') {
        const jsonData = jsonResult.data;
        
        // Transform JSON format to component's expected format
        const transformed = {
          timeline: (jsonData.timeline || []).map(item => ({
            startTime: item.startTime,
            endTime: item.endTime,
            speaker: item.speaker || null,
            topic: item.topic || null,
            transcript: item.transcript || null,
          })),
          keyMoments: (jsonData.keyMoments || []).map(moment => ({
            timestamp: moment.timestamp,
            type: moment.type || null,
            description: moment.description,
            transcript: moment.transcript || null,
          })),
          topicTransitions: (jsonData.topicTransitions || []).map(transition => ({
            timestamp: transition.timestamp,
            fromTopic: transition.fromTopic || null,
            toTopic: transition.toTopic,
            trigger: transition.trigger || null,
          })),
          transcriptHighlights: (jsonData.transcriptHighlights || []).map(highlight => ({
            timestamp: highlight.timestamp,
            text: highlight.text,
            type: highlight.type || null,
            iconLabel: highlight.iconLabel || null,
          })),
        };

        return transformed;
      }

      // Fallback to text parsing (existing logic)
      const result = {
        timeline: [],
        keyMoments: [],
        topicTransitions: [],
        transcriptHighlights: [],
      };

      // Parse Discussion Timeline from rawText
      const timelineMatch = text.match(
        createSectionPattern("Discussion\\s+Timeline")
      );
      if (timelineMatch) {
        const timelineText = timelineMatch[1];

        // Handle concatenated entries - split by time pattern
        const matches = [
          ...timelineText.matchAll(DISCUSSION_TIMELINE_GLOBAL_PATTERN),
        ];

        if (matches.length > 0) {
          matches.forEach((match) => {
            const content = match[3].trim();
            // Try full format: "Speaker Label: Topic/Description: Transcript Snippet"
            const fullMatch = content.match(/^([^:]+?):\s*([^:]+?):\s*(.+)$/);
            if (fullMatch) {
              result.timeline.push({
                startTime: match[1],
                endTime: match[2],
                speaker: fullMatch[1].trim(),
                topic: fullMatch[2].trim(),
                transcript: fullMatch[3].trim(),
              });
            } else {
              // Simpler format
              result.timeline.push({
                startTime: match[1],
                endTime: match[2],
                speaker: null,
                topic: content,
                transcript: "",
              });
            }
          });
        } else {
          // Fallback: Try splitting by newlines
          const lines = timelineText
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          lines.forEach((line) => {
            const timelineMatch = line.match(DISCUSSION_TIMELINE_PATTERN);
            if (timelineMatch) {
              result.timeline.push({
                startTime: timelineMatch[1],
                endTime: timelineMatch[2],
                speaker: timelineMatch[3].trim(),
                topic: timelineMatch[4].trim(),
                transcript: timelineMatch[5].trim(),
              });
            } else {
              const simpleMatch = line.match(
                DISCUSSION_TIMELINE_SIMPLE_PATTERN
              );
              if (simpleMatch && !simpleMatch[3].includes("SECTION:")) {
                result.timeline.push({
                  startTime: simpleMatch[1],
                  endTime: simpleMatch[2],
                  speaker: null,
                  topic: simpleMatch[3].trim(),
                  transcript: "",
                });
              }
            }
          });
        }
      }

      // Parse Key Moments from rawText
      const keyMomentsMatch = text.match(
        createSectionPattern("Key\\s+Moments")
      );
      if (keyMomentsMatch) {
        const keyMomentsText = keyMomentsMatch[1];

        // Handle concatenated entries - split by type pattern
        const matches = [...keyMomentsText.matchAll(KEY_MOMENT_GLOBAL_PATTERN)];

        if (matches.length > 0) {
          matches.forEach((match) => {
            const content = match[3].trim();
            // Try format: "Description: Transcript Snippet"
            const contentMatch = content.match(/^([^:]+?):\s*(.+)$/);
            if (contentMatch) {
              result.keyMoments.push({
                type: match[1].trim(),
                timestamp: match[2].trim(),
                description: contentMatch[1].trim(),
                transcript: contentMatch[2].trim(),
              });
            } else {
              result.keyMoments.push({
                type: match[1].trim(),
                timestamp: match[2].trim(),
                description: content,
                transcript: "",
              });
            }
          });
        } else {
          // Fallback: Try splitting by newlines
          const lines = keyMomentsText
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          lines.forEach((line) => {
            const momentMatch = line.match(KEY_MOMENT_PATTERN);
            if (momentMatch) {
              result.keyMoments.push({
                type: momentMatch[1].trim(),
                timestamp: momentMatch[2].trim(),
                description: momentMatch[3].trim(),
                transcript: momentMatch[4].trim(),
              });
            } else {
              // Simple format: "timestamp: description"
              const simpleMatch = line.match(/^(\d{1,2}:\d{2}):\s*(.+)$/i);
              if (simpleMatch && !simpleMatch[2].includes("SECTION:")) {
                result.keyMoments.push({
                  type: "Insight",
                  timestamp: simpleMatch[1].trim(),
                  description: simpleMatch[2].trim(),
                  transcript: "",
                });
              }
            }
          });
        }
      }

      // Parse Topic Transitions from rawText
      const transitionsMatch = text.match(
        /SECTION:\s*Topic\s+Transitions\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
      );
      if (transitionsMatch) {
        const transitionsText = transitionsMatch[1];

        // Handle concatenated entries - split by time pattern
        const matches = [
          ...transitionsText.matchAll(TOPIC_TRANSITION_GLOBAL_PATTERN),
        ];

        if (matches.length > 0) {
          matches.forEach((match) => {
            const content = match[2].trim();
            // Try format: "From Topic → To Topic: Trigger/Reason"
            const transitionMatch = content.match(
              /^([^→]+?)\s*→\s*([^:]+?):\s*(.+)$/i
            );
            if (transitionMatch) {
              result.topicTransitions.push({
                timestamp: match[1].trim(),
                fromTopic: transitionMatch[1].trim(),
                toTopic: transitionMatch[2].trim(),
                trigger: transitionMatch[3].trim(),
              });
            }
          });
        } else {
          // Fallback: Try splitting by newlines
          const lines = transitionsText
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          lines.forEach((line) => {
            const transitionMatch = line.match(TOPIC_TRANSITION_PATTERN);
            if (transitionMatch) {
              result.topicTransitions.push({
                timestamp: transitionMatch[1].trim(),
                fromTopic: transitionMatch[2].trim(),
                toTopic: transitionMatch[3].trim(),
                trigger: transitionMatch[4].trim(),
              });
            }
          });
        }
      }

      // Parse Transcript Highlights from rawText
      const highlightsMatch = text.match(
        createSectionPattern("Transcript\\s+Highlights")
      );
      if (highlightsMatch) {
        const highlightsText = highlightsMatch[1];

        // Handle concatenated entries - split by time pattern
        const matches = [
          ...highlightsText.matchAll(TRANSCRIPT_HIGHLIGHT_GLOBAL_PATTERN),
        ];

        if (matches.length > 0) {
          matches.forEach((match) => {
            const content = match[2].trim();
            // Try format with quotes: "Transcript Text": Type: Icon Label
            const quotedMatch = content.match(
              TRANSCRIPT_HIGHLIGHT_QUOTED_CONTENT_PATTERN
            );
            if (quotedMatch) {
              result.transcriptHighlights.push({
                timestamp: match[1].trim(),
                text: quotedMatch[1].trim(),
                type: quotedMatch[2].trim(),
                iconLabel: quotedMatch[3].trim(),
              });
            } else {
              // Try format without quotes: Transcript Text: Type: Icon Label
              const unquotedMatch = content.match(
                TRANSCRIPT_HIGHLIGHT_CONTENT_PATTERN
              );
              if (unquotedMatch && !unquotedMatch[1].includes("SECTION:")) {
                result.transcriptHighlights.push({
                  timestamp: match[1].trim(),
                  text: unquotedMatch[1].trim(),
                  type: unquotedMatch[2].trim(),
                  iconLabel: unquotedMatch[3].trim(),
                });
              }
            }
          });
        } else {
          // Fallback: Try splitting by newlines
          const lines = highlightsText
            .split(/\n/)
            .filter((line) => line.trim().length > 0);
          lines.forEach((line) => {
            const highlightMatch = line.match(
              TRANSCRIPT_HIGHLIGHT_QUOTED_PATTERN
            );
            if (highlightMatch) {
              result.transcriptHighlights.push({
                timestamp: highlightMatch[1].trim(),
                text: highlightMatch[2].trim(),
                type: highlightMatch[3].trim(),
                iconLabel: highlightMatch[4].trim(),
              });
            } else {
              const simpleMatch = line.match(TRANSCRIPT_HIGHLIGHT_PATTERN);
              if (simpleMatch && !simpleMatch[2].includes("SECTION:")) {
                result.transcriptHighlights.push({
                  timestamp: simpleMatch[1].trim(),
                  text: simpleMatch[2].trim(),
                  type: simpleMatch[3].trim(),
                  iconLabel: simpleMatch[4].trim(),
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
          timeline: "array",
          keyMoments: "array",
          topicTransitions: "array",
          transcriptHighlights: "array",
        },
        "AudioTimeline"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioTimeline", "Parsing error:", error);
      setParsingError(error);
      return {
        timeline: [],
        keyMoments: [],
        topicTransitions: [],
        transcriptHighlights: [],
      };
    }
  }, [rawText]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (parsedData.timeline.length > 0) {
      const lastItem = parsedData.timeline[parsedData.timeline.length - 1];
      const [minutes, seconds] = lastItem.endTime.split(":").map(Number);
      return minutes * 60 + seconds;
    }
    return 0;
  }, [parsedData.timeline]);

  // Group timeline by speaker
  const timelineBySpeaker = useMemo(() => {
    const grouped = {};
    parsedData.timeline.forEach((item) => {
      const speaker = item.speaker || "Unknown";
      if (!grouped[speaker]) {
        grouped[speaker] = [];
      }
      grouped[speaker].push(item);
    });
    return grouped;
  }, [parsedData.timeline]);

  // Get unique speakers
  const speakers = useMemo(() => {
    return Object.keys(timelineBySpeaker);
  }, [timelineBySpeaker]);

  const getSpeakerColor = (speaker, index) => {
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
    const speakerIndex = speakers.indexOf(speaker);
    return colors[(speakerIndex >= 0 ? speakerIndex : index) % colors.length];
  };

  const calculatePosition = (timeString) => {
    const [minutes, seconds] = timeString.split(":").map(Number);
    const totalSeconds = minutes * 60 + seconds;
    return totalDuration > 0 ? (totalSeconds / totalDuration) * 100 : 0;
  };

  const calculateWidth = (startTime, endTime) => {
    const [startM, startS] = startTime.split(":").map(Number);
    const [endM, endS] = endTime.split(":").map(Number);
    const startSeconds = startM * 60 + startS;
    const endSeconds = endM * 60 + endS;
    const duration = endSeconds - startSeconds;
    return totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
  };

  const getMomentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "decision":
        return faGavel;
      case "action":
        return faStickyNote;
      case "topicshift":
        return faKey;
      case "emotional":
        return faCommentDots;
      case "keyword":
        return faThumbtack;
      case "insight":
        return faChartLine;
      default:
        return faBullseye;
    }
  };

  const getMomentColor = (type) => {
    switch (type?.toLowerCase()) {
      case "decision":
        return "#9333ea";
      case "action":
        return "#3b82f6";
      case "topicshift":
        return "#f59e0b";
      case "emotional":
        return "#ec4899";
      case "keyword":
        return "#22c55e";
      case "insight":
        return "#06b6d4";
      default:
        return "#6b7280";
    }
  };

  const toggleFilter = (filterName) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Show parsing error if occurred
  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div>
            <h2 className={styles.title}>Timeline</h2>
            <p className={styles.subtitle}>
              Discussion timeline and key moments
            </p>
          </div>
        </div>
        <RawDataViewer rawText={rawText} title="Raw AI Response (JSON parsing failed)" />
        <ParsingError
          message="Failed to parse timeline data. The analysis may be in an unexpected format."
        />
      </div>
    );
  }

  // Check if all data is empty
  const hasData =
    parsedData.timeline.length > 0 ||
    parsedData.keyMoments.length > 0 ||
    parsedData.topicTransitions.length > 0 ||
    parsedData.transcriptHighlights.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faClock} />
        </div>
        <div>
          <h2 className={styles.title}>Timeline</h2>
          <p className={styles.subtitle}>Discussion timeline and key moments</p>
        </div>
      </div>

      {!hasData && (
        <EmptyState
          icon={faClock}
          title="No Timeline Data Found"
          message="No timeline information was extracted from this audio analysis."
        />
      )}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersLabel}>
          <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
          <span>Show:</span>
        </div>
        <div className={styles.filtersList}>
          <button
            className={`${styles.filterButton} ${
              filters.keyMoments ? styles.filterActive : ""
            }`}
            onClick={() => toggleFilter("keyMoments")}
          >
            <FontAwesomeIcon icon={filters.keyMoments ? faEye : faEyeSlash} />
            Key Moments
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.speakers ? styles.filterActive : ""
            }`}
            onClick={() => toggleFilter("speakers")}
          >
            <FontAwesomeIcon icon={filters.speakers ? faEye : faEyeSlash} />
            Speakers
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.sentiment ? styles.filterActive : ""
            }`}
            onClick={() => toggleFilter("sentiment")}
          >
            <FontAwesomeIcon icon={filters.sentiment ? faEye : faEyeSlash} />
            Sentiment
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.actionItems ? styles.filterActive : ""
            }`}
            onClick={() => toggleFilter("actionItems")}
          >
            <FontAwesomeIcon icon={filters.actionItems ? faEye : faEyeSlash} />
            Action Items
          </button>
          <button
            className={`${styles.filterButton} ${
              filters.decisions ? styles.filterActive : ""
            }`}
            onClick={() => toggleFilter("decisions")}
          >
            <FontAwesomeIcon icon={filters.decisions ? faEye : faEyeSlash} />
            Decisions
          </button>
        </div>
      </div>

      {/* Main Timeline Bar */}
      {totalDuration > 0 && (
        <div className={styles.timelineSection}>
          <div className={styles.timelineHeader}>
            <span className={styles.timelineStart}>0:00</span>
            <span className={styles.timelineEnd}>
              {formatTime(totalDuration)}
            </span>
          </div>

          {/* Key Moments Markers */}
          {filters.keyMoments && parsedData.keyMoments.length > 0 && (
            <div className={styles.keyMomentsLayer}>
              {parsedData.keyMoments.map((moment, index) => {
                const position = calculatePosition(moment.timestamp);
                return (
                  <div
                    key={index}
                    className={styles.keyMomentMarker}
                    style={{ left: `${position}%` }}
                    title={`${moment.type}: ${moment.description} (${moment.timestamp})`}
                  >
                    <FontAwesomeIcon
                      icon={getMomentIcon(moment.type)}
                      style={{ color: getMomentColor(moment.type) }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Timeline Bar */}
          <div className={styles.mainTimelineBar}>
            {parsedData.timeline.map((item, index) => {
              const left = calculatePosition(item.startTime);
              const width = calculateWidth(item.startTime, item.endTime);
              const speaker = item.speaker || "Unknown";
              const color = getSpeakerColor(speaker, index);

              return (
                <div
                  key={index}
                  className={styles.timelineSegment}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: color,
                  }}
                  title={`${item.startTime}-${item.endTime}: ${speaker} - ${item.topic}`}
                >
                  {item.speaker && (
                    <span className={styles.segmentLabel}>
                      {speaker.charAt(speaker.length - 1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Speaker Activity Layer */}
          {filters.speakers && speakers.length > 0 && (
            <div className={styles.speakerActivityLayer}>
              {speakers.map((speaker, speakerIndex) => {
                const speakerTimeline = timelineBySpeaker[speaker] || [];
                const color = getSpeakerColor(speaker, speakerIndex);

                return (
                  <div key={speakerIndex} className={styles.speakerTrack}>
                    <div className={styles.speakerTrackLabel}>
                      <FontAwesomeIcon icon={faUser} />
                      <span>{speaker}</span>
                    </div>
                    <div className={styles.speakerTrackBar}>
                      {speakerTimeline.map((item, itemIndex) => {
                        const left = calculatePosition(item.startTime);
                        const width = calculateWidth(
                          item.startTime,
                          item.endTime
                        );
                        return (
                          <div
                            key={itemIndex}
                            className={styles.speakerSegment}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: color,
                            }}
                            title={`${item.startTime}-${item.endTime}: ${item.topic}`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Timestamped Transcript Highlights */}
      {parsedData.transcriptHighlights.length > 0 && (
        <div className={styles.highlightsSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faClock} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Transcript Highlights</h3>
          </div>
          <div className={styles.highlightsList}>
            {parsedData.transcriptHighlights.map((highlight, index) => {
              const filtered =
                (highlight.type === "Decision" && !filters.decisions) ||
                (highlight.type === "Action" && !filters.actionItems);

              if (filtered) return null;

              const handleTimestampClick = () => {
                // Scroll to timeline and highlight the position
                const timelineSection = document.querySelector(
                  `.${styles.timelineSection}`
                );
                if (timelineSection) {
                  timelineSection.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // Add a temporary highlight effect
                  timelineSection.style.boxShadow =
                    "0 0 20px rgba(147, 51, 234, 0.5)";
                  setTimeout(() => {
                    timelineSection.style.boxShadow = "";
                  }, 2000);
                }
              };

              return (
                <div key={index} className={styles.highlightItem}>
                  <div
                    className={styles.highlightTimestamp}
                    onClick={handleTimestampClick}
                    title={`Jump to ${highlight.timestamp} on timeline`}
                  >
                    {highlight.timestamp}
                  </div>
                  <div className={styles.highlightContent}>
                    <div className={styles.highlightText}>
                      "{highlight.text}"
                    </div>
                    <div className={styles.highlightMeta}>
                      <FontAwesomeIcon
                        icon={getMomentIcon(highlight.type)}
                        style={{ color: getMomentColor(highlight.type) }}
                      />
                      <span>
                        {highlight.type === "Topic"
                          ? "Topic Shift"
                          : highlight.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioTimeline;
