import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVolumeUp,
  faUsers,
  faInfoCircle,
  faTags,
  faTasks,
  faSmile,
} from "@fortawesome/free-solid-svg-icons";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { OVERVIEW_SCHEMA } from "../../../utils/audioJsonSchemas";
import {
  CONTENT_TYPE_PATTERN,
  KEY_THEMES_PATTERN,
  KEY_THEMES_HEADER_PATTERN,
  BULLET_EXTRACTION_PATTERN,
  BULLET_MARKER_PATTERN,
  METADATA_FIELD_HEADER_PATTERN,
  ARTIST_EXTRACTION_PATTERN,
  ALBUM_EXTRACTION_PATTERN,
  TYPE_OF_MUSIC_EXTRACTION_PATTERN,
  GENRE_EXTRACTION_PATTERN,
  DESCRIPTION_EXTRACTION_PATTERN,
  SENTENCE_ENDING_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import { formatLanguage } from "../../../utils/audioParsingHelpers";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import styles from "./AudioOverview.module.css";

const AudioOverview = ({ data, rawText, fileData, analysisData }) => {
  const [parsingError, setParsingError] = useState(null);

  // Parse JSON data from rawText if available
  const parsedJsonData = useMemo(() => {
    setParsingError(null);

    if (!rawText) return null;

    try {
      const jsonResult = parseAudioAnalysisData(
        rawText,
        OVERVIEW_SCHEMA,
        null, // Will use text parser as fallback
        "AudioOverview"
      );

      if (jsonResult.data && jsonResult.format === 'json') {
        return jsonResult.data;
      }
    } catch (error) {
      setParsingError(error);
    }

    return null;
  }, [rawText]);

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getContentType = () => {
    if (parsedJsonData?.fileInfo?.contentType) {
      return parsedJsonData.fileInfo.contentType;
    }
    if (rawText) {
      const match = rawText.match(CONTENT_TYPE_PATTERN);
      if (match) return match[1].trim();
    }
    if (data?.sections) {
      for (const section of data.sections) {
        if (section.content) {
          for (const item of section.content) {
            if (
              item.type === "keyValue" &&
              item.key?.toLowerCase().includes("content type")
            ) {
              return item.value;
            }
          }
        }
      }
    }
    return "Audio Recording";
  };

  const getValue = (key) => {
    if (data?.sections) {
      for (const section of data.sections) {
        if (section.content) {
          for (const item of section.content) {
            if (
              item.type === "keyValue" &&
              item.key?.toLowerCase().includes(key.toLowerCase())
            ) {
              return item.value;
            }
          }
        }
      }
    }
    return null;
  };

  // Get metadata from analysisData first (most reliable), then fallback to parsed data
  // Duration is in seconds from backend - check multiple sources
  let duration = 0;
  if (analysisData?.metadata?.duration && analysisData.metadata.duration > 0) {
    duration = analysisData.metadata.duration;
  } else if (
    analysisData?.transcription?.duration &&
    analysisData.transcription.duration > 0
  ) {
    duration = analysisData.transcription.duration;
  } else if (fileData?.metadata?.duration && fileData.metadata.duration > 0) {
    duration = fileData.metadata.duration;
  }
  const format =
    analysisData?.metadata?.format?.toUpperCase() ||
    getValue("format")?.toUpperCase() ||
    "UNKNOWN";
  const fileSize =
    analysisData?.metadata?.fileSize || analysisData?.metadata?.file_size || 0;
  const languageCode =
    analysisData?.transcription?.language || getValue("language") || "UNKNOWN";
  const language = formatLanguage(languageCode);
  const wordCount =
    analysisData?.transcription?.wordCount ||
    analysisData?.transcription?.word_count ||
    0;

  // Calculate speakers from segments if available
  let speakers = 0;
  if (analysisData?.transcription?.segments) {
    const uniqueSpeakers = new Set();
    analysisData.transcription.segments.forEach((seg) => {
      if (seg.speaker) {
        uniqueSpeakers.add(seg.speaker);
      }
    });
    speakers = uniqueSpeakers.size;
  }
  if (speakers === 0) {
    speakers =
      parsedJsonData?.fileInfo?.speakersDetected ||
      getValue("speakers detected") ||
      getValue("number of speakers") ||
      analysisData?.transcription?.speakers?.length ||
      0;
  }

  // Extract key topics from Content Summary section
  const getKeyTopics = () => {
    const topics = [];
    if (data?.sections) {
      for (const section of data.sections) {
        if (
          section.name?.toLowerCase().includes("content summary") ||
          section.name?.toLowerCase().includes("key themes")
        ) {
          section.content?.forEach((item) => {
            if (item.type === "bullet") {
              // Check if the bullet contains multiple topics separated by dashes
              const topicText = item.text.trim();
              if (
                topicText.includes("-") &&
                !topicText.match(BULLET_MARKER_PATTERN)
              ) {
                // Split by dash and clean up each topic
                const splitTopics = topicText
                  .split(/\s*-\s*/)
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                topics.push(...splitTopics);
              } else {
                topics.push(topicText);
              }
            } else if (
              item.type === "keyValue" &&
              item.key?.toLowerCase().includes("theme")
            ) {
              // Handle key-value pairs like "Key Themes: topic1- topic2- topic3"
              const value = item.value || "";
              if (value.includes("-")) {
                // Split by dash and clean up
                const splitTopics = value
                  .split(/\s*-\s*/)
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                topics.push(...splitTopics);
              } else {
                topics.push(value);
              }
            } else if (item.type === "text") {
              // Handle text items that might contain topics separated by dashes
              const text = item.text || "";
              if (text.includes("-") && text.split("-").length > 2) {
                // Likely multiple topics in one text item
                const splitTopics = text
                  .split(/\s*-\s*/)
                  .map((t) => t.trim())
                  .filter(
                    (t) => t.length > 0 && !t.match(KEY_THEMES_HEADER_PATTERN)
                  );
                topics.push(...splitTopics);
              }
            }
          });
        }
      }
    }
    // Also try to extract from JSON parsed data
    if (topics.length === 0 && parsedJsonData?.keyThemes && Array.isArray(parsedJsonData.keyThemes)) {
      topics.push(...parsedJsonData.keyThemes);
    }
    // Also try to extract from raw text
    if (topics.length === 0 && rawText) {
      const themesMatch = rawText.match(KEY_THEMES_PATTERN);
      if (themesMatch) {
        const themesText = themesMatch[0];
        // First try to find bullet points
        const bulletMatches = themesText.match(BULLET_EXTRACTION_PATTERN);
        if (bulletMatches) {
          bulletMatches.forEach((match) => {
            const topicText = match.replace(BULLET_MARKER_PATTERN, "").trim();
            // Check if this topic contains multiple items separated by dashes
            if (topicText.includes("-") && topicText.split("-").length > 2) {
              const splitTopics = topicText
                .split(/\s*-\s*/)
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
              topics.push(...splitTopics);
            } else {
              topics.push(topicText);
            }
          });
        } else {
          // Try to extract from "Key Themes: topic1- topic2- topic3" format
          const themesValue = themesText.replace(/Key Themes:\s*/i, "").trim();
          if (themesValue.includes("-")) {
            const splitTopics = themesValue
              .split(/\s*-\s*/)
              .map((t) => t.trim())
              .filter((t) => t.length > 0);
            topics.push(...splitTopics);
          }
        }
      }
    }

    // Remove duplicates and clean up
    const uniqueTopics = [
      ...new Set(topics.map((t) => t.trim()).filter((t) => t.length > 0)),
    ];
    return uniqueTopics.slice(0, 8); // Limit to 8 topics
  };

  // Extract action items count
  const getActionItemsCount = () => {
    // Check if there's an action items section
    if (data?.sections) {
      for (const section of data.sections) {
        if (section.name?.toLowerCase().includes("action")) {
          const bullets =
            section.content?.filter((item) => item.type === "bullet") || [];
          return bullets.length;
        }
      }
    }
    return null;
  };

  // Extract sentiment data
  const getSentimentData = () => {
    const sentiment = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    // Check sentiment analysis results from transcription
    // AssemblyAI returns sentiment_analysis_results as array of { sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL", ... }
    if (
      analysisData?.transcription?.sentiment &&
      Array.isArray(analysisData.transcription.sentiment)
    ) {
      analysisData.transcription.sentiment.forEach((s) => {
        // Handle both object format { sentiment: "POSITIVE" } and direct string
        const sentimentType = (
          typeof s === "object" && s.sentiment ? s.sentiment : s
        ).toLowerCase();
        if (sentimentType === "positive" || sentimentType === "POSITIVE") {
          sentiment.positive++;
        } else if (
          sentimentType === "negative" ||
          sentimentType === "NEGATIVE"
        ) {
          sentiment.negative++;
        } else {
          sentiment.neutral++;
        }
      });
    }

    // If no sentiment data, return null
    if (
      sentiment.positive === 0 &&
      sentiment.neutral === 0 &&
      sentiment.negative === 0
    ) {
      return null;
    }

    return sentiment;
  };

  // Extract audio description (artist, album, type of music)
  const getAudioDescription = () => {
    // Try JSON parsed data first
    if (parsedJsonData?.description) {
      const desc = parsedJsonData.description;
      if (desc.artist || desc.album || desc.typeOfMusic || desc.genre || desc.description) {
        return {
          artist: desc.artist || "Unknown",
          album: desc.album || "N/A",
          typeOfMusic: desc.typeOfMusic || "Unknown",
          genre: desc.genre || null,
          description: desc.description || "",
        };
      }
    }

    if (data?.sections) {
      for (const section of data.sections) {
        if (section.name?.toLowerCase().includes("audio description")) {
          const artist =
            section.content?.find(
              (item) =>
                item.key?.toLowerCase().includes("artist") ||
                item.key?.toLowerCase().includes("performer")
            )?.value || "Unknown";

          const album =
            section.content?.find(
              (item) =>
                item.key?.toLowerCase().includes("album") ||
                item.key?.toLowerCase().includes("collection")
            )?.value || "N/A";

          const typeOfMusic =
            section.content?.find(
              (item) =>
                item.key?.toLowerCase().includes("type of music") ||
                item.key?.toLowerCase().includes("type of content")
            )?.value || "Unknown";

          const genre =
            section.content?.find((item) =>
              item.key?.toLowerCase().includes("genre")
            )?.value || null;

          // Get description - find text item that's specifically the Description field
          let description = "";

          // First, try to find a key-value pair with key "Description"
          const descKeyValue = section.content?.find(
            (item) =>
              item.type === "keyValue" &&
              item.key?.toLowerCase().includes("description")
          );

          if (descKeyValue && descKeyValue.value) {
            description = descKeyValue.value.trim();
          } else {
            // Fallback: find text item that's not a key-value pair
            const textItems = section.content?.filter(
              (item) =>
                item.type === "text" &&
                item.text?.trim() &&
                !item.text.includes("SECTION:") &&
                !item.text.match(METADATA_FIELD_HEADER_PATTERN)
            );

            if (textItems && textItems.length > 0) {
              description = textItems[0].text.trim();
            } else if (section.text) {
              description = section.text.trim();
            }
          }

          // Clean up description - remove SECTION: markers and stop at next section
          if (description) {
            description = description
              // Remove any prefixes like "Music", "Audio", etc.
              .replace(/^(Music|Audio|Recording|Performance)\s*/i, "")
              // Remove "Description:" prefix if present
              .replace(/^Description:\s*/i, "")
              // Remove any field names that might be concatenated
              .replace(
                /\s*(Artist|Performer|Album|Collection|Type of Music|Type of Content|Genre):\s*[^\s]+/gi,
                ""
              )
              // Stop at SECTION: marker (most important - must stop here)
              .split(/\s*SECTION:/i)[0]
              .split(/\s*SECTION\s*:/i)[0]
              // Also stop at other section markers
              .split(/\n\s*SECTION:/)[0]
              .split(
                /\s*(?=Key Statistics|Content Summary|Participants|Quality|AI Summary|Audio Description|Audio Overview)/i
              )[0]
              // Remove any remaining SECTION: markers
              .replace(/SECTION:\s*/gi, "")
              // Clean up extra spaces
              .replace(/\s+/g, " ")
              .trim();

            // Limit to first 2-3 sentences for brevity
            const sentences = description
              .split(/[.!?]+/)
              .filter((s) => s.trim());
            if (sentences.length > 3) {
              description = sentences.slice(0, 3).join(". ").trim();
              if (!description.match(SENTENCE_ENDING_PATTERN)) {
                description += ".";
              }
            } else if (description && !description.match(/[.!?]$/)) {
              // Add period at end if missing
              description += ".";
            }
          }

          return { artist, album, typeOfMusic, genre, description };
        }
      }
    }

    // Fallback: try to extract from rawText
    if (rawText) {
      // Extract artist - stop at next field or section
      const artistMatch = rawText.match(ARTIST_EXTRACTION_PATTERN);
      // Extract album - stop at next field or section
      const albumMatch = rawText.match(ALBUM_EXTRACTION_PATTERN);
      // Extract type - stop at next field or section
      const typeMatch = rawText.match(TYPE_OF_MUSIC_EXTRACTION_PATTERN);
      // Extract genre - stop at next field or section
      const genreMatch = rawText.match(GENRE_EXTRACTION_PATTERN);
      // Extract description - be very precise, stop at first SECTION or next field
      const descMatch = rawText.match(DESCRIPTION_EXTRACTION_PATTERN);
      let description = "";
      if (descMatch) {
        description = descMatch[1]
          .trim()
          // Remove any prefixes
          .replace(/^(Music|Audio|Recording|Performance)\s*/i, "")
          // Remove any field names that might be concatenated
          .replace(
            /\s*(Artist|Performer|Album|Collection|Type of Music|Type of Content|Genre):\s*[^\s]+/gi,
            ""
          )
          // Stop at SECTION: marker (most important)
          .split(/\s*SECTION:/i)[0]
          .split(/\s*SECTION\s*:/i)[0]
          .split(/\n\s*SECTION:/)[0]
          // Stop at other section markers
          .split(
            /\s*(?=Key Statistics|Content Summary|Participants|Quality|AI Summary|Audio Description|Audio Overview)/i
          )[0]
          // Remove any remaining SECTION: markers
          .replace(/SECTION:\s*/gi, "")
          // Clean up extra spaces
          .replace(/\s+/g, " ")
          .trim();

        // Limit to first 2-3 sentences for brevity
        const sentences = description.split(/[.!?]+/).filter((s) => s.trim());
        if (sentences.length > 3) {
          description = sentences.slice(0, 3).join(". ").trim();
          if (!description.match(/[.!?]$/)) {
            description += ".";
          }
        } else if (description && !description.match(/[.!?]$/)) {
          // Add period at end if missing
          description += ".";
        }
      }

      // Clean extracted values - remove any trailing field names that might have been included
      const cleanArtist = artistMatch
        ? artistMatch[1]
            .replace(/\s*Album\/Collection:.*$/i, "")
            .replace(/\s*Collection:.*$/i, "")
            .replace(/\s*Type of Music\/Content:.*$/i, "")
            .replace(/\s*Genre:.*$/i, "")
            .replace(/\s*Description:.*$/i, "")
            .trim()
        : "Unknown";

      const cleanAlbum = albumMatch
        ? albumMatch[1]
            .replace(/\s*Type of Music\/Content:.*$/i, "")
            .replace(/\s*Genre:.*$/i, "")
            .replace(/\s*Description:.*$/i, "")
            .trim()
        : "N/A";

      const cleanType = typeMatch
        ? typeMatch[1]
            .replace(/\s*Genre:.*$/i, "")
            .replace(/\s*Description:.*$/i, "")
            .trim()
        : "Unknown";

      const cleanGenre = genreMatch
        ? genreMatch[1].replace(/\s*Description:.*$/i, "").trim()
        : null;

      return {
        artist: cleanArtist,
        album: cleanAlbum,
        typeOfMusic: cleanType,
        genre: cleanGenre,
        description: description,
      };
    }

    return null;
  };

  const keyTopics = getKeyTopics();
  const actionItemsCount = getActionItemsCount();
  const sentimentData = getSentimentData();
  const bitrate = analysisData?.metadata?.bitrate;
  const channels = analysisData?.metadata?.channels;
  const sampleRate = analysisData?.metadata?.sample_rate;
  const audioDescription = getAudioDescription();

  // Get subtitle - short description for the header
  const getSubtitle = () => {
    // Create a concise subtitle from artist, type, and genre (not the full description)
    const parts = [];

    if (audioDescription?.artist && audioDescription.artist !== "Unknown") {
      parts.push(audioDescription.artist);
    }

    if (
      audioDescription?.typeOfMusic &&
      audioDescription.typeOfMusic !== "Unknown"
    ) {
      parts.push(audioDescription.typeOfMusic);
    }

    if (audioDescription?.genre) {
      parts.push(audioDescription.genre);
    }

    // If we have artist and type/genre, create a subtitle like "Mirusia Louwerse • Classical • Religious"
    if (parts.length > 0) {
      return parts.join(" • ");
    }

    // Fallback: try to get content type
    const contentType = getContentType();
    if (contentType && contentType !== "Audio Recording") {
      return contentType;
    }

    // Final fallback
    return "Audio Recording";
  };

  // Show parsing error if occurred
  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faVolumeUp} />
          </div>
          <div>
            <h2 className={styles.title}>Audio Overview</h2>
            <p className={styles.subtitle}>Audio file overview and metadata</p>
          </div>
        </div>
        <ParsingError
          message="Failed to parse overview data. The analysis may be in an unexpected format."
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
          <FontAwesomeIcon icon={faVolumeUp} />
        </div>
        <div>
          <h2 className={styles.title}>Audio Overview</h2>
          <p className={styles.subtitle}>{getSubtitle()}</p>
        </div>
      </div>

      {/* Audio Description Section */}
      {audioDescription &&
        (audioDescription.artist !== "Unknown" ||
          audioDescription.description) && (
          <div className={styles.descriptionSection}>
            {audioDescription.description && (
              <p className={styles.descriptionText}>
                {audioDescription.description}
              </p>
            )}
            <div className={styles.descriptionMeta}>
              {audioDescription.artist !== "Unknown" && (
                <div className={styles.metaTag}>
                  <strong>Artist</strong>
                  <span className={styles.metaTagValue}>
                    {audioDescription.artist}
                  </span>
                </div>
              )}
              {audioDescription.album !== "N/A" && (
                <div className={styles.metaTag}>
                  <strong>Album</strong>
                  <span className={styles.metaTagValue}>
                    {audioDescription.album}
                  </span>
                </div>
              )}
              {audioDescription.typeOfMusic !== "Unknown" && (
                <div className={styles.metaTag}>
                  <strong>Type</strong>
                  <span className={styles.metaTagValue}>
                    {audioDescription.typeOfMusic}
                  </span>
                </div>
              )}
              {audioDescription.genre && (
                <div className={styles.metaTag}>
                  <strong>Genre</strong>
                  <span className={styles.metaTagValue}>
                    {audioDescription.genre}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Card-based Overview */}
      <div className={styles.cardsGrid}>
        {/* Audio Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <FontAwesomeIcon icon={faInfoCircle} className={styles.cardIcon} />
            <h3 className={styles.cardTitle}>Audio Info</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Duration:</span>
              <span className={styles.infoValue}>
                {formatDuration(duration)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Size:</span>
              <span className={styles.infoValue}>
                {formatFileSize(fileSize)}
              </span>
            </div>
            {bitrate && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Bitrate:</span>
                <span className={styles.infoValue}>{bitrate} kbps</span>
              </div>
            )}
            {channels && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Channels:</span>
                <span className={styles.infoValue}>{channels}</span>
              </div>
            )}
            {sampleRate && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sample Rate:</span>
                <span className={styles.infoValue}>{sampleRate} Hz</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Format:</span>
              <span className={styles.infoValue}>{format}</span>
            </div>
            {language && language !== "Unknown" && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Language:</span>
                <span className={styles.infoValue}>{language}</span>
              </div>
            )}
            {wordCount > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Words:</span>
                <span className={styles.infoValue}>{wordCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Speakers Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <FontAwesomeIcon icon={faUsers} className={styles.cardIcon} />
            <h3 className={styles.cardTitle}>Speakers Detected</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.speakerCount}>
              <span className={styles.speakerNumber}>{speakers}</span>
              <span className={styles.speakerLabel}>
                {speakers === 1 ? "speaker" : "speakers"}
              </span>
            </div>
            {speakers > 0 && (
              <div className={styles.speakerInfo}>
                {speakers === 1
                  ? "Single speaker detected"
                  : "Multiple speakers detected"}
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Mix Card */}
        {sentimentData && (
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <FontAwesomeIcon icon={faSmile} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Sentiment Mix</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.sentimentChart}>
                {sentimentData.positive > 0 && (
                  <div className={styles.sentimentBar}>
                    <div
                      className={styles.sentimentBarFill}
                      style={{
                        width: `${
                          (sentimentData.positive /
                            (sentimentData.positive +
                              sentimentData.neutral +
                              sentimentData.negative)) *
                          100
                        }%`,
                        backgroundColor: "#22c55e",
                      }}
                    />
                    <span className={styles.sentimentLabel}>
                      Positive: {sentimentData.positive}
                    </span>
                  </div>
                )}
                {sentimentData.neutral > 0 && (
                  <div className={styles.sentimentBar}>
                    <div
                      className={styles.sentimentBarFill}
                      style={{
                        width: `${
                          (sentimentData.neutral /
                            (sentimentData.positive +
                              sentimentData.neutral +
                              sentimentData.negative)) *
                          100
                        }%`,
                        backgroundColor: "#6b7280",
                      }}
                    />
                    <span className={styles.sentimentLabel}>
                      Neutral: {sentimentData.neutral}
                    </span>
                  </div>
                )}
                {sentimentData.negative > 0 && (
                  <div className={styles.sentimentBar}>
                    <div
                      className={styles.sentimentBarFill}
                      style={{
                        width: `${
                          (sentimentData.negative /
                            (sentimentData.positive +
                              sentimentData.neutral +
                              sentimentData.negative)) *
                          100
                        }%`,
                        backgroundColor: "#ef4444",
                      }}
                    />
                    <span className={styles.sentimentLabel}>
                      Negative: {sentimentData.negative}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Key Topics Card */}
        {keyTopics.length > 0 && (
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <FontAwesomeIcon icon={faTags} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Key Topics</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.topicsChips}>
                {keyTopics.map((topic, idx) => (
                  <span key={idx} className={styles.topicChip}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Actions Card */}
        {actionItemsCount !== null && actionItemsCount > 0 && (
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <FontAwesomeIcon icon={faTasks} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Key Actions</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.actionCount}>
                <span className={styles.actionNumber}>{actionItemsCount}</span>
                <span className={styles.actionLabel}>
                  {actionItemsCount === 1
                    ? "action item found"
                    : "action items found"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brief Summary Section - Only show AI Summary */}
      {(() => {
        // First try to find AI Summary section
        let aiSummarySection = null;
        if (data?.sections && data.sections.length > 0) {
          aiSummarySection = data.sections.find(
            (s) =>
              s.name?.toLowerCase().includes("ai summary") ||
              (s.name?.toLowerCase().includes("summary") &&
                !s.name?.toLowerCase().includes("content"))
          );
        }

        // If found, extract text content
        if (aiSummarySection) {
          // Try to get text from content array
          const textItems = aiSummarySection.content
            ?.filter((item) => item.type === "text" && item.text?.trim())
            .map((item) => item.text.trim());

          // If no text items, try to get from section.text
          const summaryText =
            textItems && textItems.length > 0
              ? textItems.join(" ")
              : aiSummarySection.text?.trim() || "";

          if (summaryText) {
            // Clean up the text - remove "SECTION:" markers and extra whitespace
            const cleanedText = summaryText
              .replace(/SECTION:\s*/gi, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            if (cleanedText) {
              return (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Summary</h3>
                  <div className={styles.summaryText}>
                    <p>{cleanedText}</p>
                  </div>
                </div>
              );
            }
          }
        }

        // If no summary section found, try to extract from rawText
        if (rawText && !aiSummarySection) {
          const summaryMatch = rawText.match(
            createSectionPattern("AI\\s+Summary")
          );
          if (summaryMatch) {
            const summaryText = summaryMatch[1]
              .replace(/SECTION:\s*/gi, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            if (summaryText) {
              return (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Summary</h3>
                  <div className={styles.summaryText}>
                    <p>{summaryText}</p>
                  </div>
                </div>
              );
            }
          }
        }

        return null;
      })()}
    </div>
  );
};

export default AudioOverview;
