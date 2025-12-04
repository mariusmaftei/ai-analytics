import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSmile,
  faChartPie,
  faClock,
  faFaceSmile,
  faFaceMeh,
  faFaceFrown,
  faFaceAngry,
  faFaceSurprise,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { SENTIMENT_SCHEMA } from "../../../utils/audioJsonSchemas";
import {
  SENTIMENT_SCORE_PATTERN,
  SCORE_PATTERN,
  NUMERIC_SCORE_PATTERN,
  EMOTIONAL_INTENSITY_PATTERN,
  EMOTION_BREAKDOWN_GLOBAL_PATTERN,
  SENTIMENT_TIMELINE_WITH_ARROW_PATTERN,
  SENTIMENT_TIMELINE_WITHOUT_ARROW_PATTERN,
  SENTIMENT_TIMELINE_GLOBAL_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import { parseTimestamp } from "../../../utils/audioParsingHelpers";
import styles from "./AudioSentimentAnalysis.module.css";

// Helper to parse timestamp string (MM:SS) to seconds
const parseTimestampToSeconds = (timestamp) => {
  if (!timestamp || typeof timestamp !== "string") return 0;
  try {
    const parts = timestamp.split(":");
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return minutes * 60 + seconds;
  } catch {
    return 0;
  }
};

const AudioSentimentAnalysis = ({ data, rawText }) => {
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const text = rawText || "";

      // Try JSON parsing first (new architecture)
      const jsonResult = parseAudioAnalysisData(
        text,
        SENTIMENT_SCHEMA,
        null, // Will use text parser as fallback
        "AudioSentimentAnalysis"
      );

      // If JSON parsing succeeded, transform to expected format
      if (jsonResult.data && jsonResult.format === 'json') {
        const jsonData = jsonResult.data;
        
        // Transform JSON format to component's expected format
        const transformed = {
          overallSentiment: {
            label: jsonData.overallSentiment?.label || "Neutral",
            score: jsonData.overallSentiment?.score || 0.5,
            intensity: jsonData.overallSentiment?.intensity || "Medium",
          },
          emotionBreakdown: (jsonData.emotionBreakdown || []).map(emotion => ({
            emotion: emotion.emotion,
            percentage: emotion.percentage,
            intensity: emotion.intensity || null,
          })),
          sentimentTimeline: (jsonData.sentimentTimeline || []).map(item => ({
            startTime: item.timestamp || "00:00",
            endTime: item.timestamp || "00:00", // JSON only has single timestamp
            startSeconds: parseTimestampToSeconds(item.timestamp || "00:00"),
            endSeconds: parseTimestampToSeconds(item.timestamp || "00:00"),
            sentiment: item.sentiment,
            score: item.score || null,
            transcript: item.transcript || null,
          })),
        };

        return transformed;
      }

      // Fallback to text parsing (existing logic)
      const result = {
        overallSentiment: {
          label: "Neutral",
          score: 0.5,
          intensity: "Medium",
        },
        emotionBreakdown: [],
        sentimentTimeline: [],
      };

      const sections = data?.sections || [];

      // Parse Overall Sentiment
      const overallSentimentSection = sections.find(
        (s) =>
          s.name?.toLowerCase().includes("overall sentiment") ||
          (s.name?.toLowerCase().includes("sentiment") &&
            !s.name?.toLowerCase().includes("by segment") &&
            !s.name?.toLowerCase().includes("emotional indicators"))
      );

      if (overallSentimentSection) {
        const items = overallSentimentSection.content || [];
        items.forEach((item) => {
          if (item.type === "keyValue") {
            const key = (item.key || "").toLowerCase();
            const value = item.value || "";

            if (key.includes("sentiment score")) {
              // Extract score from text like "Positive 0.78" or "0.78"
              const scoreMatch = value.match(NUMERIC_SCORE_PATTERN);
              if (scoreMatch) {
                result.overallSentiment.score = parseFloat(scoreMatch[1]);
              }
              // Extract label
              if (value.toLowerCase().includes("positive")) {
                result.overallSentiment.label = "Positive";
              } else if (value.toLowerCase().includes("negative")) {
                result.overallSentiment.label = "Negative";
              } else {
                result.overallSentiment.label = "Neutral";
              }
            } else if (key.includes("emotional tone")) {
              // Use tone as label if sentiment score not found
              if (
                !result.overallSentiment.label ||
                result.overallSentiment.label === "Neutral"
              ) {
                if (
                  value.toLowerCase().includes("positive") ||
                  value.toLowerCase().includes("joy") ||
                  value.toLowerCase().includes("happy") ||
                  value.toLowerCase().includes("joyful")
                ) {
                  result.overallSentiment.label = "Positive";
                } else if (
                  value.toLowerCase().includes("negative") ||
                  value.toLowerCase().includes("sad") ||
                  value.toLowerCase().includes("angry")
                ) {
                  result.overallSentiment.label = "Negative";
                }
              }
            } else if (
              key.includes("intensity") ||
              key.includes("emotional intensity")
            ) {
              result.overallSentiment.intensity = value;
            }
          }
        });

        // Also try parsing from section.text
        if (overallSentimentSection.text) {
          let sectionText = overallSentimentSection.text;
          // Remove any SECTION: markers
          sectionText = sectionText.replace(/SECTION:\s*/gi, "").trim();

          // Extract score - look for pattern like "Positive 0.85" or "Sentiment Score: Positive 0.85"
          const scoreMatch = sectionText.match(SENTIMENT_SCORE_PATTERN);
          if (scoreMatch) {
            result.overallSentiment.score = parseFloat(scoreMatch[1]);
          } else {
            // Try just finding a number after "score"
            const scoreMatch2 = sectionText.match(SCORE_PATTERN);
            if (scoreMatch2) {
              result.overallSentiment.score = parseFloat(scoreMatch2[1]);
            }
          }

          // Extract label
          if (sectionText.toLowerCase().includes("positive")) {
            result.overallSentiment.label = "Positive";
          } else if (sectionText.toLowerCase().includes("negative")) {
            result.overallSentiment.label = "Negative";
          }

          // Extract intensity
          const intensityMatch = sectionText.match(EMOTIONAL_INTENSITY_PATTERN);
          if (intensityMatch) {
            result.overallSentiment.intensity = intensityMatch[1];
          } else if (sectionText.toLowerCase().includes("high")) {
            result.overallSentiment.intensity = "High";
          } else if (sectionText.toLowerCase().includes("medium")) {
            result.overallSentiment.intensity = "Medium";
          } else if (sectionText.toLowerCase().includes("low")) {
            result.overallSentiment.intensity = "Low";
          }
        }
      }

      // Parse Emotion Breakdown
      const emotionSection = sections.find(
        (s) =>
          s.name?.toLowerCase().includes("emotional indicators") ||
          (s.name?.toLowerCase().includes("emotion") &&
            !s.name?.toLowerCase().includes("overall") &&
            !s.name?.toLowerCase().includes("tone"))
      );

      if (emotionSection) {
        const items = emotionSection.content || [];
        const emotionMap = {
          joy: 0,
          happiness: 0,
          calmness: 0,
          calm: 0,
          sadness: 0,
          sad: 0,
          fear: 0,
          anger: 0,
          angry: 0,
          admiration: 0,
          awe: 0,
          excitement: 0,
          neutral: 0,
        };

        // Parse from content array
        items.forEach((item) => {
          const itemText = (item.text || item.value || "").toLowerCase();
          // Skip if it contains "SECTION:" as that's a section marker
          if (itemText.includes("section:")) return;

          // Look for percentage patterns like "Joy: 62%" or "Joy 62%"
          const percentMatch = itemText.match(EMOTION_BREAKDOWN_GLOBAL_PATTERN);
          if (percentMatch) {
            const emotion = percentMatch[1].toLowerCase();
            const percent = parseInt(percentMatch[2]);
            if (
              emotion.includes("joy") ||
              emotion.includes("happiness") ||
              emotion.includes("happy")
            ) {
              emotionMap.joy = Math.max(emotionMap.joy, percent);
            } else if (emotion.includes("calm") || emotion.includes("peace")) {
              emotionMap.calmness = Math.max(emotionMap.calmness, percent);
            } else if (emotion.includes("sad")) {
              emotionMap.sadness = Math.max(emotionMap.sadness, percent);
            } else if (
              emotion.includes("fear") ||
              emotion.includes("anxious")
            ) {
              emotionMap.fear = Math.max(emotionMap.fear, percent);
            } else if (emotion.includes("angry") || emotion.includes("anger")) {
              emotionMap.anger = Math.max(emotionMap.anger, percent);
            } else if (
              emotion.includes("admiration") ||
              emotion.includes("admire")
            ) {
              emotionMap.admiration = Math.max(emotionMap.admiration, percent);
            } else if (emotion.includes("awe") || emotion.includes("wonder")) {
              emotionMap.awe = Math.max(emotionMap.awe, percent);
            } else if (
              emotion.includes("excitement") ||
              emotion.includes("excited")
            ) {
              emotionMap.excitement = Math.max(emotionMap.excitement, percent);
            }
          }
        });

        // If no items from content, try parsing from section.text
        if (items.length === 0 && emotionSection.text) {
          let sectionText = emotionSection.text;
          // Extract only the content before the next SECTION: marker
          const nextSectionIndex = sectionText.search(
            /SECTION:\s*(?!Emotional\s+Indicators)/i
          );
          if (nextSectionIndex > 0) {
            sectionText = sectionText.substring(0, nextSectionIndex);
          }
          // Remove any SECTION: markers from the beginning
          sectionText = sectionText
            .replace(/SECTION:\s*Emotional\s+Indicators\s*/gi, "")
            .trim();

          // Look for all percentage patterns in the text (handles concatenated items like "Joy: 75%Admiration: 15%")
          const matches = [
            ...sectionText.matchAll(EMOTION_BREAKDOWN_GLOBAL_PATTERN),
          ];
          matches.forEach((match) => {
            const emotion = match[1].toLowerCase();
            const percent = parseInt(match[2]);
            if (
              emotion.includes("joy") ||
              emotion.includes("happiness") ||
              emotion.includes("happy")
            ) {
              emotionMap.joy = Math.max(emotionMap.joy, percent);
            } else if (emotion.includes("calm") || emotion.includes("peace")) {
              emotionMap.calmness = Math.max(emotionMap.calmness, percent);
            } else if (emotion.includes("sad")) {
              emotionMap.sadness = Math.max(emotionMap.sadness, percent);
            } else if (
              emotion.includes("fear") ||
              emotion.includes("anxious")
            ) {
              emotionMap.fear = Math.max(emotionMap.fear, percent);
            } else if (emotion.includes("angry") || emotion.includes("anger")) {
              emotionMap.anger = Math.max(emotionMap.anger, percent);
            } else if (
              emotion.includes("admiration") ||
              emotion.includes("admire")
            ) {
              emotionMap.admiration = Math.max(emotionMap.admiration, percent);
            } else if (emotion.includes("awe") || emotion.includes("wonder")) {
              emotionMap.awe = Math.max(emotionMap.awe, percent);
            } else if (
              emotion.includes("excitement") ||
              emotion.includes("excited")
            ) {
              emotionMap.excitement = Math.max(emotionMap.excitement, percent);
            }
          });
        }

        // Convert to array
        if (emotionMap.joy > 0) {
          result.emotionBreakdown.push({
            emotion: "Joy",
            percentage: emotionMap.joy,
          });
        }
        if (emotionMap.admiration > 0) {
          result.emotionBreakdown.push({
            emotion: "Admiration",
            percentage: emotionMap.admiration,
          });
        }
        if (emotionMap.awe > 0) {
          result.emotionBreakdown.push({
            emotion: "Awe",
            percentage: emotionMap.awe,
          });
        }
        if (emotionMap.calmness > 0) {
          result.emotionBreakdown.push({
            emotion: "Calmness",
            percentage: emotionMap.calmness,
          });
        }
        if (emotionMap.excitement > 0) {
          result.emotionBreakdown.push({
            emotion: "Excitement",
            percentage: emotionMap.excitement,
          });
        }
        if (emotionMap.sadness > 0) {
          result.emotionBreakdown.push({
            emotion: "Sadness",
            percentage: emotionMap.sadness,
          });
        }
        if (emotionMap.fear > 0) {
          result.emotionBreakdown.push({
            emotion: "Fear",
            percentage: emotionMap.fear,
          });
        }
        if (emotionMap.anger > 0) {
          result.emotionBreakdown.push({
            emotion: "Anger",
            percentage: emotionMap.anger,
          });
        }
      }

      // Parse Sentiment Timeline
      const timelineSection = sections.find(
        (s) =>
          s.name?.toLowerCase().includes("sentiment by segment") ||
          (s.name?.toLowerCase().includes("segment") &&
            !s.name?.toLowerCase().includes("overall"))
      );

      if (timelineSection) {
        const items = timelineSection.content || [];
        items.forEach((item) => {
          const itemText = item.text || item.value || "";
          // Skip if it contains "SECTION:" as that's a section marker
          if (itemText.includes("SECTION:")) return;

          // Match patterns like "0:00–0:30 → Neutral" or "0:00-0:30: Positive" or "00:00–00:03 → Neutral"
          const timelineMatch = itemText.match(
            SENTIMENT_TIMELINE_WITH_ARROW_PATTERN
          );
          if (timelineMatch) {
            result.sentimentTimeline.push({
              startTime: timelineMatch[1],
              endTime: timelineMatch[2],
              sentiment: timelineMatch[3].trim(),
            });
          } else {
            // Try without arrow
            const timelineMatch2 = itemText.match(
              SENTIMENT_TIMELINE_WITHOUT_ARROW_PATTERN
            );
            if (timelineMatch2) {
              result.sentimentTimeline.push({
                startTime: timelineMatch2[1],
                endTime: timelineMatch2[2],
                sentiment: timelineMatch2[3].trim(),
              });
            }
          }
        });

        // Also try parsing from section.text (even if content array had items, in case they were empty)
        if (timelineSection.text) {
          let sectionText = timelineSection.text;

          // Extract only the content before the next SECTION: marker
          const nextSectionIndex = sectionText.search(
            /SECTION:\s*(?!Sentiment\s+by\s+Segment)/i
          );
          if (nextSectionIndex > 0) {
            sectionText = sectionText.substring(0, nextSectionIndex);
          }
          // Remove any SECTION: markers from the beginning
          sectionText = sectionText
            .replace(/SECTION:\s*Sentiment\s+by\s+Segment\s*/gi, "")
            .trim();

          // Use regex to find all timeline patterns (handles concatenated items like "00:00–00:03 → Neutral00:03–00:07 → Positive")
          const matches = [
            ...sectionText.matchAll(SENTIMENT_TIMELINE_GLOBAL_PATTERN),
          ];
          if (matches.length > 0) {
            // Clear existing timeline if we found matches in text (text is more reliable)
            result.sentimentTimeline = [];
          }
          matches.forEach((match) => {
            if (match[1] && match[2] && match[3]) {
              const sentiment = match[3].trim();
              // Skip if sentiment is empty or just whitespace
              if (sentiment && sentiment.length > 0) {
                result.sentimentTimeline.push({
                  startTime: match[1],
                  endTime: match[2],
                  sentiment: sentiment,
                });
              }
            }
          });
        }
      }

      // Fallback: Parse from rawText if sections are empty or parsing failed
      if (
        (sections.length === 0 ||
          result.overallSentiment.score === 0.5 ||
          result.emotionBreakdown.length === 0 ||
          result.sentimentTimeline.length === 0) &&
        text
      ) {
        // Try to extract overall sentiment
        const sentimentMatch = text.match(
          createSectionPattern("Overall\\s+Sentiment")
        );
        if (sentimentMatch) {
          const sentimentText = sentimentMatch[1];
          // Extract score - look for pattern like "Positive 0.85" or "Sentiment Score: Positive 0.85"
          const scoreMatch = sentimentText.match(SENTIMENT_SCORE_PATTERN);
          if (scoreMatch) {
            result.overallSentiment.score = parseFloat(scoreMatch[1]);
          } else {
            const scoreMatch2 = sentimentText.match(SCORE_PATTERN);
            if (scoreMatch2) {
              result.overallSentiment.score = parseFloat(scoreMatch2[1]);
            }
          }
          if (sentimentText.toLowerCase().includes("positive")) {
            result.overallSentiment.label = "Positive";
          } else if (sentimentText.toLowerCase().includes("negative")) {
            result.overallSentiment.label = "Negative";
          }
          // Extract intensity
          const intensityMatch = sentimentText.match(
            /emotional\s+intensity[:\s]*(\w+)/i
          );
          if (intensityMatch) {
            result.overallSentiment.intensity = intensityMatch[1];
          } else if (sentimentText.toLowerCase().includes("high")) {
            result.overallSentiment.intensity = "High";
          } else if (sentimentText.toLowerCase().includes("medium")) {
            result.overallSentiment.intensity = "Medium";
          } else if (sentimentText.toLowerCase().includes("low")) {
            result.overallSentiment.intensity = "Low";
          }
        }

        // Try to extract emotion breakdown
        const emotionMatch = text.match(
          createSectionPattern("Emotional\\s+Indicators")
        );
        if (emotionMatch && result.emotionBreakdown.length === 0) {
          const emotionText = emotionMatch[1];
          // Remove SECTION: markers
          const cleanedEmotionText = emotionText
            .replace(/SECTION:\s*/gi, "")
            .trim();
          // Look for all percentage patterns (handles concatenated items)
          const percentMatches = cleanedEmotionText.matchAll(
            EMOTION_BREAKDOWN_GLOBAL_PATTERN
          );
          const emotionMap = {};
          for (const match of percentMatches) {
            const emotion = match[1].toLowerCase();
            const percent = parseInt(match[2]);

            // Map emotions to standard names
            if (
              emotion.includes("joy") ||
              emotion.includes("happiness") ||
              emotion.includes("happy")
            ) {
              emotionMap.joy = Math.max(emotionMap.joy || 0, percent);
            } else if (emotion.includes("calm") || emotion.includes("peace")) {
              emotionMap.calmness = Math.max(emotionMap.calmness || 0, percent);
            } else if (emotion.includes("sad")) {
              emotionMap.sadness = Math.max(emotionMap.sadness || 0, percent);
            } else if (
              emotion.includes("fear") ||
              emotion.includes("anxious")
            ) {
              emotionMap.fear = Math.max(emotionMap.fear || 0, percent);
            } else if (emotion.includes("angry") || emotion.includes("anger")) {
              emotionMap.anger = Math.max(emotionMap.anger || 0, percent);
            } else if (
              emotion.includes("admiration") ||
              emotion.includes("admire")
            ) {
              emotionMap.admiration = Math.max(
                emotionMap.admiration || 0,
                percent
              );
            } else if (emotion.includes("awe") || emotion.includes("wonder")) {
              emotionMap.awe = Math.max(emotionMap.awe || 0, percent);
            } else if (
              emotion.includes("excitement") ||
              emotion.includes("excited")
            ) {
              emotionMap.excitement = Math.max(
                emotionMap.excitement || 0,
                percent
              );
            }
          }

          // Convert to array
          if (emotionMap.joy)
            result.emotionBreakdown.push({
              emotion: "Joy",
              percentage: emotionMap.joy,
            });
          if (emotionMap.admiration)
            result.emotionBreakdown.push({
              emotion: "Admiration",
              percentage: emotionMap.admiration,
            });
          if (emotionMap.awe)
            result.emotionBreakdown.push({
              emotion: "Awe",
              percentage: emotionMap.awe,
            });
          if (emotionMap.calmness)
            result.emotionBreakdown.push({
              emotion: "Calmness",
              percentage: emotionMap.calmness,
            });
          if (emotionMap.excitement)
            result.emotionBreakdown.push({
              emotion: "Excitement",
              percentage: emotionMap.excitement,
            });
          if (emotionMap.sadness)
            result.emotionBreakdown.push({
              emotion: "Sadness",
              percentage: emotionMap.sadness,
            });
          if (emotionMap.fear)
            result.emotionBreakdown.push({
              emotion: "Fear",
              percentage: emotionMap.fear,
            });
          if (emotionMap.anger)
            result.emotionBreakdown.push({
              emotion: "Anger",
              percentage: emotionMap.anger,
            });
        }

        // Try to extract sentiment timeline
        const timelineMatch = text.match(
          createSectionPattern("Sentiment\\s+by\\s+Segment")
        );
        if (timelineMatch && result.sentimentTimeline.length === 0) {
          const timelineText = timelineMatch[1];
          // Remove SECTION: markers
          const cleanedTimelineText = timelineText
            .replace(/SECTION:\s*/gi, "")
            .trim();
          // Use regex to find all timeline patterns (handles concatenated items)
          const matches = [
            ...cleanedTimelineText.matchAll(SENTIMENT_TIMELINE_GLOBAL_PATTERN),
          ];
          matches.forEach((match) => {
            if (match[1] && match[2] && match[3]) {
              const sentiment = match[3].trim();
              if (sentiment && sentiment.length > 0) {
                result.sentimentTimeline.push({
                  startTime: match[1],
                  endTime: match[2],
                  sentiment: sentiment,
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
          overallSentiment: "object",
          emotionBreakdown: "array",
          sentimentTimeline: "array",
        },
        "AudioSentimentAnalysis"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioSentimentAnalysis", "Parsing error:", error);
      setParsingError(error);
      return {
        overallSentiment: {
          label: "Neutral",
          score: 0.5,
          tone: "Neutral",
          intensity: "Medium",
        },
        emotionBreakdown: [],
        sentimentTimeline: [],
      };
    }
  }, [data, rawText]);

  const getSentimentColor = (sentiment) => {
    const lower = sentiment.toLowerCase();
    if (
      lower.includes("positive") ||
      lower.includes("joy") ||
      lower.includes("happy")
    ) {
      return "#22c55e"; // Green
    } else if (
      lower.includes("negative") ||
      lower.includes("sad") ||
      lower.includes("angry")
    ) {
      return "#ef4444"; // Red
    } else if (lower.includes("neutral")) {
      return "#6b7280"; // Gray
    }
    return "#9333ea"; // Purple (default)
  };

  const getSentimentIcon = (sentiment) => {
    const lower = sentiment.toLowerCase();
    if (
      lower.includes("positive") ||
      lower.includes("joy") ||
      lower.includes("happy")
    ) {
      return faFaceSmile;
    } else if (lower.includes("negative") || lower.includes("sad")) {
      return faFaceFrown;
    } else if (lower.includes("angry")) {
      return faFaceAngry;
    } else if (lower.includes("fear") || lower.includes("surprise")) {
      return faFaceSurprise;
    }
    return faFaceMeh;
  };

  const getEmotionIcon = (emotion) => {
    const lower = emotion.toLowerCase();
    if (lower.includes("joy") || lower.includes("happiness"))
      return faFaceSmile;
    if (lower.includes("calm")) return faFaceMeh;
    if (lower.includes("sad")) return faFaceFrown;
    if (lower.includes("fear")) return faFaceSurprise;
    if (lower.includes("angry") || lower.includes("anger")) return faFaceAngry;
    if (
      lower.includes("awe") ||
      lower.includes("admiration") ||
      lower.includes("wonder")
    )
      return faFaceSmile;
    if (lower.includes("excitement") || lower.includes("excited"))
      return faFaceSmile;
    return faFaceMeh;
  };

  const getIntensityColor = (intensity) => {
    const lower = intensity.toLowerCase();
    if (lower.includes("high") || lower.includes("very")) return "#ef4444";
    if (lower.includes("medium") || lower.includes("moderate"))
      return "#f59e0b";
    if (lower.includes("low") || lower.includes("slight")) return "#22c55e";
    return "#6b7280";
  };

  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faSmile} />
          </div>
          <div>
            <h2 className={styles.title}>Sentiment Analysis</h2>
            <p className={styles.subtitle}>Emotional tone and sentiment</p>
          </div>
        </div>
        <RawDataViewer rawText={rawText} title="Raw AI Response (JSON parsing failed)" />
        <ParsingError
          message="Failed to parse sentiment data. The analysis may be in an unexpected format."
        />
      </div>
    );
  }

  const hasData =
    parsedData.overallSentiment.score !== 0.5 ||
    parsedData.emotionBreakdown.length > 0 ||
    parsedData.sentimentTimeline.length > 0;

  if (!hasData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faSmile} />
          </div>
          <div>
            <h2 className={styles.title}>Sentiment Analysis</h2>
            <p className={styles.subtitle}>Emotional tone and sentiment</p>
          </div>
        </div>
        <EmptyState
          icon={faSmile}
          title="No Sentiment Data Found"
          message="No sentiment or emotional analysis data was extracted from this audio."
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faSmile} />
        </div>
        <div>
          <h2 className={styles.title}>Sentiment Analysis</h2>
          <p className={styles.subtitle}>Emotional tone and sentiment</p>
        </div>
      </div>

      {/* Overall Sentiment Card */}
      <div className={styles.overallSentimentCard}>
        <h3 className={styles.overallSentimentTitle}>Overall Sentiment</h3>
        <div className={styles.overallSentimentContent}>
          <div className={styles.sentimentLabel}>
            <FontAwesomeIcon
              icon={getSentimentIcon(parsedData.overallSentiment.label)}
              style={{
                color: getSentimentColor(parsedData.overallSentiment.label),
              }}
            />
            <span>{parsedData.overallSentiment.label}</span>
          </div>
          <div className={styles.sentimentScore}>
            <span className={styles.scoreLabel}>Score:</span>
            <span className={styles.scoreValue}>
              {parsedData.overallSentiment.score.toFixed(2)} / 1.00
            </span>
          </div>
          <div className={styles.sentimentIntensity}>
            <span className={styles.intensityLabel}>Emotional Intensity:</span>
            <span
              className={styles.intensityValue}
              style={{
                color: getIntensityColor(parsedData.overallSentiment.intensity),
              }}
            >
              {parsedData.overallSentiment.intensity}
            </span>
          </div>
        </div>
      </div>

      {/* Emotion Breakdown Chart */}
      {parsedData.emotionBreakdown.length > 0 && (
        <div className={styles.emotionBreakdownSection}>
          <div className={styles.emotionBreakdownHeader}>
            <FontAwesomeIcon icon={faChartPie} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Emotion Breakdown</h3>
          </div>
          <div className={styles.emotionBreakdownChart}>
            {parsedData.emotionBreakdown.map((emotion, index) => (
              <div key={index} className={styles.emotionBar}>
                <div className={styles.emotionBarHeader}>
                  <div className={styles.emotionLabel}>
                    <FontAwesomeIcon
                      icon={getEmotionIcon(emotion.emotion)}
                      className={styles.emotionIcon}
                    />
                    <span>{emotion.emotion}</span>
                  </div>
                  <span className={styles.emotionPercentage}>
                    {emotion.percentage}%
                  </span>
                </div>
                <div className={styles.emotionBarContainer}>
                  <div
                    className={styles.emotionBarFill}
                    style={{
                      width: `${emotion.percentage}%`,
                      backgroundColor: getSentimentColor(emotion.emotion),
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Timeline */}
      {parsedData.sentimentTimeline.length > 0 && (
        <div className={styles.sentimentTimelineSection}>
          <div className={styles.sentimentTimelineHeader}>
            <FontAwesomeIcon icon={faClock} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Sentiment Timeline</h3>
          </div>
          <div className={styles.sentimentTimeline}>
            {parsedData.sentimentTimeline.map((item, index) => (
              <div key={index} className={styles.timelineItem}>
                <div className={styles.timelineTimeRange}>
                  {item.startTime}–{item.endTime}
                </div>
                <div className={styles.timelineArrow}>→</div>
                <div
                  className={styles.timelineSentiment}
                  style={{ color: getSentimentColor(item.sentiment) }}
                >
                  {item.sentiment}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioSentimentAnalysis;
