import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faFileAudio,
  faWaveSquare,
  faMicrophone,
  faSignal,
  faCheckCircle,
  faUser,
  faMusic,
  faCompactDisc,
  faTag,
  faMapMarkerAlt,
  faMobileAlt,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import { formatLanguage } from "../../../utils/audioParsingHelpers";
import {
  FILE_NAME_PATTERN,
  FILE_TYPE_PATTERN,
  FILE_SIZE_PATTERN,
  DURATION_PATTERN,
  UPLOADED_ON_PATTERN,
  FORMAT_PATTERN,
  SAMPLE_RATE_PATTERN,
  BITRATE_PATTERN,
  CHANNELS_PATTERN,
  ENCODING_PATTERN,
  LOUDNESS_PATTERN,
  PEAK_LEVEL_PATTERN,
  NOISE_LEVEL_PATTERN,
  DYNAMIC_RANGE_PATTERN,
  CHANNEL_BREAKDOWN_PATTERN,
  WAVEFORM_CHARACTERISTICS_PATTERN,
  ANALYSIS_CONFIDENCE_PATTERN,
  AUDIO_CLARITY_PATTERN,
  SPEECH_DETECTION_PATTERN,
  LANGUAGE_PATTERN,
  WORD_COUNT_PATTERN,
  SPEAKER_LABELS_PATTERN,
  TRANSCRIPTION_METHOD_PATTERN,
  ARTIST_PATTERN,
  ALBUM_PATTERN,
  TITLE_PATTERN,
  GENRE_PATTERN,
  RECORDING_DEVICE_PATTERN,
  GPS_LOCATION_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import styles from "./AudioMetadata.module.css";

const AudioMetadata = ({ data, rawText, analysisData, fileData }) => {
  const [parsingError, setParsingError] = useState(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const result = {
        fileInfo: {},
        technicalDetails: {},
        audioProperties: {},
        aiQuality: {},
        transcriptionMetadata: {},
        optionalMetadata: {},
      };

      const text = rawText || "";
      const metadata = analysisData?.metadata || {};

      // Parse File Information from rawText
      const fileInfoMatch = text.match(
        createSectionPattern("File\\s+Information")
      );
      if (fileInfoMatch) {
        const fileInfoText = fileInfoMatch[1];

        const allText = fileInfoText.replace(/\n/g, " ");

        const fileNameMatch = allText.match(FILE_NAME_PATTERN);
        const fileTypeMatch = allText.match(FILE_TYPE_PATTERN);
        const fileSizeMatch = allText.match(FILE_SIZE_PATTERN);
        const durationMatch = allText.match(DURATION_PATTERN);
        const uploadedMatch = allText.match(UPLOADED_ON_PATTERN);

        const actualFileSize =
          fileData?.fileSize ||
          fileData?.file?.size ||
          metadata.fileSize ||
          metadata.file_size ||
          null;
        const parsedFileSize = fileSizeMatch ? fileSizeMatch[1].trim() : null;

        result.fileInfo = {
          fileName:
            fileNameMatch && fileNameMatch[1].trim() !== "Unknown"
              ? fileNameMatch[1].trim()
              : analysisData?.filename || fileData?.fileName || "Unknown",
          fileType: fileTypeMatch
            ? fileTypeMatch[1].trim()
            : metadata.format?.toUpperCase() || "N/A",
          fileSize: actualFileSize
            ? formatFileSize(actualFileSize)
            : parsedFileSize &&
              parsedFileSize !== "0.00 MB" &&
              parsedFileSize !== "N/A"
            ? parsedFileSize
            : "N/A",
          duration: durationMatch
            ? durationMatch[1].trim()
            : formatDuration(metadata.duration),
          uploadedOn:
            uploadedMatch && uploadedMatch[1].trim() !== "N/A"
              ? uploadedMatch[1].trim()
              : analysisData?.uploadedAt
              ? new Date(analysisData.uploadedAt).toLocaleDateString()
              : "N/A",
        };
      } else {
        const actualFileSize =
          fileData?.fileSize ||
          fileData?.file?.size ||
          metadata.fileSize ||
          metadata.file_size ||
          null;

        result.fileInfo = {
          fileName: analysisData?.filename || fileData?.fileName || "Unknown",
          fileType: metadata.format?.toUpperCase() || "N/A",
          fileSize: actualFileSize ? formatFileSize(actualFileSize) : "N/A",
          duration: formatDuration(metadata.duration),
          uploadedOn: analysisData?.uploadedAt
            ? new Date(analysisData.uploadedAt).toLocaleDateString()
            : "N/A",
        };
      }

      // Parse Technical Details from rawText
      const technicalMatch = text.match(
        createSectionPattern("Technical\\s+Details")
      );
      if (technicalMatch) {
        const technicalText = technicalMatch[1];
        const allText = technicalText.replace(/\n/g, " ");

        const formatMatch = allText.match(FORMAT_PATTERN);
        const sampleRateMatch = allText.match(SAMPLE_RATE_PATTERN);
        const bitrateMatch = allText.match(BITRATE_PATTERN);
        const channelsMatch = allText.match(CHANNELS_PATTERN);
        const encodingMatch = allText.match(ENCODING_PATTERN);
        const loudnessMatch = allText.match(LOUDNESS_PATTERN);
        const peakLevelMatch = allText.match(PEAK_LEVEL_PATTERN);
        const noiseLevelMatch = allText.match(NOISE_LEVEL_PATTERN);
        const dynamicRangeMatch = allText.match(DYNAMIC_RANGE_PATTERN);

        const cleanValue = (value, label) => {
          if (!value) return null;
          let cleaned = value.trim();
          // Remove any label text that might be included
          cleaned = cleaned.replace(new RegExp(`^${label}:\\s*`, "i"), "");
          // Remove any trailing label text
          cleaned = cleaned.replace(new RegExp(`\\s*${label}:.*$`, "i"), "");
          // Remove "N/A" followed by label
          cleaned = cleaned.replace(
            /N\/A\s*[A-Z][a-z]+\s*Level:\s*N\/A/gi,
            "N/A"
          );
          return cleaned;
        };

        const parsedSampleRate = cleanValue(
          sampleRateMatch ? sampleRateMatch[1] : null,
          "Sample Rate"
        );
        const parsedBitrate = cleanValue(
          bitrateMatch ? bitrateMatch[1] : null,
          "Bitrate"
        );
        const parsedChannels = cleanValue(
          channelsMatch ? channelsMatch[1] : null,
          "Channels"
        );
        const parsedFormat = cleanValue(
          formatMatch ? formatMatch[1] : null,
          "Format"
        );
        const parsedEncoding = cleanValue(
          encodingMatch ? encodingMatch[1] : null,
          "Encoding"
        );
        const parsedLoudness = cleanValue(
          loudnessMatch ? loudnessMatch[1] : null,
          "Loudness"
        );
        const parsedPeakLevel = cleanValue(
          peakLevelMatch ? peakLevelMatch[1] : null,
          "Peak Level"
        );
        const parsedNoiseLevel = cleanValue(
          noiseLevelMatch ? noiseLevelMatch[1] : null,
          "Noise Level"
        );
        const parsedDynamicRange = cleanValue(
          dynamicRangeMatch ? dynamicRangeMatch[1] : null,
          "Dynamic Range"
        );

        result.technicalDetails = {
          format:
            parsedFormat &&
            parsedFormat !== "N/A" &&
            !parsedFormat.toLowerCase().includes("format:")
              ? parsedFormat
              : metadata.format?.toUpperCase() || "N/A",
          sampleRate:
            metadata.sampleRate || metadata.sample_rate
              ? `${metadata.sampleRate || metadata.sample_rate} Hz`
              : parsedSampleRate &&
                parsedSampleRate !== "N/A Hz" &&
                !parsedSampleRate.toLowerCase().includes("sample rate:")
              ? parsedSampleRate
              : "N/A",
          bitrate: metadata.bitrate
            ? `${metadata.bitrate} kbps`
            : parsedBitrate &&
              parsedBitrate !== "N/A kbps" &&
              parsedBitrate !== "None kbps" &&
              !parsedBitrate.toLowerCase().includes("bitrate:")
            ? parsedBitrate
            : "N/A",
          channels: metadata.channels
            ? `${metadata.channels} (${
                metadata.channels === 2
                  ? "Stereo"
                  : metadata.channels === 1
                  ? "Mono"
                  : "N/A"
              })`
            : parsedChannels &&
              parsedChannels !== "N/A" &&
              !parsedChannels.includes("None") &&
              !parsedChannels.toLowerCase().includes("channels:")
            ? parsedChannels
            : "N/A",
          encoding:
            parsedEncoding &&
            parsedEncoding !== "N/A" &&
            !parsedEncoding.toLowerCase().includes("encoding:")
              ? parsedEncoding
              : metadata.format === "mp3"
              ? "MP3"
              : metadata.format === "wav"
              ? "PCM"
              : "N/A",
          loudness:
            parsedLoudness &&
            parsedLoudness !== "N/A" &&
            !parsedLoudness.toLowerCase().includes("loudness:")
              ? parsedLoudness
              : "N/A",
          peakLevel:
            parsedPeakLevel &&
            parsedPeakLevel !== "N/A" &&
            !parsedPeakLevel.toLowerCase().includes("peak level:") &&
            !parsedPeakLevel.toLowerCase().includes("noiselevel:")
              ? parsedPeakLevel
              : "N/A",
          noiseLevel:
            parsedNoiseLevel &&
            parsedNoiseLevel !== "N/A" &&
            !parsedNoiseLevel.toLowerCase().includes("noise level:")
              ? parsedNoiseLevel
              : "N/A",
          dynamicRange:
            parsedDynamicRange &&
            parsedDynamicRange !== "N/A" &&
            !parsedDynamicRange.toLowerCase().includes("dynamic range:")
              ? parsedDynamicRange
              : "N/A",
        };
      } else {
        result.technicalDetails = {
          format: metadata.format?.toUpperCase() || "N/A",
          sampleRate:
            metadata.sampleRate || metadata.sample_rate
              ? `${metadata.sampleRate || metadata.sample_rate} Hz`
              : "N/A",
          bitrate: metadata.bitrate ? `${metadata.bitrate} kbps` : "N/A",
          channels: metadata.channels
            ? `${metadata.channels} (${
                metadata.channels === 2
                  ? "Stereo"
                  : metadata.channels === 1
                  ? "Mono"
                  : "N/A"
              })`
            : "N/A",
          encoding:
            metadata.format === "mp3"
              ? "MP3"
              : metadata.format === "wav"
              ? "PCM"
              : "N/A",
          loudness: "N/A",
          peakLevel: "N/A",
          noiseLevel: "N/A",
          dynamicRange: "N/A",
        };
      }

      // Parse Audio Properties from rawText
      const audioPropsMatch = text.match(
        createSectionPattern("Audio\\s+Properties")
      );
      if (audioPropsMatch) {
        const audioPropsText = audioPropsMatch[1];
        const channelBreakdownMatch = audioPropsText.match(
          CHANNEL_BREAKDOWN_PATTERN
        );
        const waveformMatch = audioPropsText.match(
          WAVEFORM_CHARACTERISTICS_PATTERN
        );

        result.audioProperties = {
          channelBreakdown: channelBreakdownMatch
            ? channelBreakdownMatch[1].trim()
            : "N/A",
          waveformCharacteristics: waveformMatch
            ? waveformMatch[1].trim()
            : "N/A",
        };
      } else {
        result.audioProperties = {
          channelBreakdown:
            metadata.channels === 2 ? "Stereo (Left/Right)" : "N/A",
          waveformCharacteristics: "N/A",
        };
      }

      // Parse AI Analysis Quality from rawText
      const aiQualityMatch = text.match(
        createSectionPattern("AI\\s+Analysis\\s+Quality")
      );
      if (aiQualityMatch) {
        const aiQualityText = aiQualityMatch[1];
        const allText = aiQualityText.replace(/\n/g, " ");

        const confidenceMatch = allText.match(ANALYSIS_CONFIDENCE_PATTERN);
        const clarityMatch = allText.match(AUDIO_CLARITY_PATTERN);
        const speechDetectionMatch = allText.match(SPEECH_DETECTION_PATTERN);

        const transcriptionData = analysisData?.transcription || {};
        let speechDetectionValue = "N/A";
        if (speechDetectionMatch) {
          const parsed = speechDetectionMatch[1].trim();
          // If it's a valid percentage (not "0%" or "N/A"), use it
          if (parsed !== "0%" && parsed !== "N/A" && parsed !== "N/A%") {
            speechDetectionValue = parsed;
          } else if (
            transcriptionData.text &&
            transcriptionData.wordCount > 0
          ) {
            // Calculate based on word count and duration
            const duration =
              metadata.duration || transcriptionData.duration || 0;
            if (duration > 0) {
              const wordsPerMinute =
                (transcriptionData.wordCount / duration) * 60;
              // Estimate: normal speech is 150-200 WPM, so calculate percentage
              const estimatedPercentage = Math.min(
                100,
                Math.round((wordsPerMinute / 150) * 100)
              );
              speechDetectionValue = `${estimatedPercentage}%`;
            } else {
              speechDetectionValue =
                transcriptionData.wordCount > 0 ? "High" : "N/A";
            }
          }
        } else if (transcriptionData.text && transcriptionData.wordCount > 0) {
          // Calculate if not parsed
          const duration = metadata.duration || transcriptionData.duration || 0;
          if (duration > 0) {
            const wordsPerMinute =
              (transcriptionData.wordCount / duration) * 60;
            const estimatedPercentage = Math.min(
              100,
              Math.round((wordsPerMinute / 150) * 100)
            );
            speechDetectionValue = `${estimatedPercentage}%`;
          } else {
            speechDetectionValue = "High";
          }
        }

        result.aiQuality = {
          confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : null,
          clarity: clarityMatch ? clarityMatch[1].trim() : "N/A",
          speechDetection: speechDetectionValue,
        };
      } else {
        result.aiQuality = {
          confidence: null,
          clarity: "N/A",
          speechDetection: "N/A",
        };
      }

      // Parse Transcription Metadata from rawText
      const transcriptionMatch = text.match(
        createSectionPattern("Transcription\\s+Metadata")
      );
      if (transcriptionMatch) {
        const transcriptionText = transcriptionMatch[1];
        const allText = transcriptionText.replace(/\n/g, " ");

        const languageMatch = allText.match(LANGUAGE_PATTERN);
        const wordCountMatch = allText.match(WORD_COUNT_PATTERN);
        const speakerLabelsMatch = allText.match(SPEAKER_LABELS_PATTERN);
        const methodMatch = allText.match(TRANSCRIPTION_METHOD_PATTERN);

        const parsedWordCount = wordCountMatch
          ? parseInt(wordCountMatch[1])
          : null;
        const transcriptionData = analysisData?.transcription || {};
        const rawLanguage =
          transcriptionData.language ||
          (languageMatch ? languageMatch[1].trim() : "N/A");

        result.transcriptionMetadata = {
          language: formatLanguage(rawLanguage),
          wordCount:
            transcriptionData.wordCount ||
            transcriptionData.word_count ||
            parsedWordCount ||
            0,
          speakerLabels:
            transcriptionData.speakers ||
            transcriptionData.segments?.some((s) => s.speaker)
              ? "Enabled"
              : speakerLabelsMatch
              ? speakerLabelsMatch[1].trim()
              : "Disabled",
          method: methodMatch ? methodMatch[1].trim() : "AssemblyAI",
        };
      } else {
        const transcriptionData = analysisData?.transcription || {};
        const rawLanguage = transcriptionData.language || "N/A";

        result.transcriptionMetadata = {
          language: formatLanguage(rawLanguage),
          wordCount:
            transcriptionData.wordCount || transcriptionData.word_count || 0,
          speakerLabels:
            transcriptionData.speakers ||
            transcriptionData.segments?.some((s) => s.speaker)
              ? "Enabled"
              : "Disabled",
          method: "AssemblyAI",
        };
      }

      // Parse Optional Metadata from rawText
      const optionalMatch = text.match(
        createSectionPattern("Optional\\s+Metadata")
      );
      if (optionalMatch) {
        const optionalText = optionalMatch[1];
        const allText = optionalText.replace(/\n/g, " ");

        const artistMatch = allText.match(ARTIST_PATTERN);
        const albumMatch = allText.match(ALBUM_PATTERN);
        const titleMatch = allText.match(TITLE_PATTERN);
        const genreMatch = allText.match(GENRE_PATTERN);
        const deviceMatch = allText.match(RECORDING_DEVICE_PATTERN);
        const gpsMatch = allText.match(GPS_LOCATION_PATTERN);

        result.optionalMetadata = {
          artist:
            artistMatch && artistMatch[1].trim() !== "N/A"
              ? artistMatch[1].trim()
              : null,
          album:
            albumMatch && albumMatch[1].trim() !== "N/A"
              ? albumMatch[1].trim()
              : null,
          title:
            titleMatch && titleMatch[1].trim() !== "N/A"
              ? titleMatch[1].trim()
              : null,
          genre:
            genreMatch && genreMatch[1].trim() !== "N/A"
              ? genreMatch[1].trim()
              : null,
          recordingDevice:
            deviceMatch && deviceMatch[1].trim() !== "N/A"
              ? deviceMatch[1].trim()
              : null,
          gpsLocation:
            gpsMatch && gpsMatch[1].trim() !== "N/A"
              ? gpsMatch[1].trim()
              : null,
        };
      } else {
        result.optionalMetadata = {
          artist: null,
          album: null,
          title: null,
          genre: null,
          recordingDevice: null,
          gpsLocation: null,
        };
      }

      // Validate parsed data (metadata objects are optional, so we just check structure)
      const isValid = typeof result === "object" && result !== null;

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioMetadata", "Parsing error:", error);
      setParsingError(error);
      return {
        fileInfo: {},
        technicalDetails: {},
        audioProperties: {},
        aiQuality: {},
        transcriptionMetadata: {},
        optionalMetadata: {},
      };
    }
  }, [rawText, analysisData, fileData]);

  const getConfidenceColor = (confidence) => {
    if (!confidence) return "#6b7280";
    if (confidence >= 0.8) return "#22c55e"; // Green
    if (confidence >= 0.6) return "#f59e0b"; // Orange
    return "#ef4444"; // Red
  };

  const getClarityColor = (clarity) => {
    switch (clarity?.toLowerCase()) {
      case "high":
        return "#22c55e";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const generateWaveform = (channels) => {
    // Generate a simple static waveform visualization
    const bars = 20;
    const waveform = [];
    for (let i = 0; i < bars; i++) {
      waveform.push(Math.random() * 100);
    }
    return waveform;
  };

  const waveformData = useMemo(
    () => generateWaveform(parsedData.technicalDetails.channels),
    [parsedData.technicalDetails.channels]
  );

  // Show parsing error if occurred
  if (parsingError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FontAwesomeIcon icon={faInfoCircle} />
          </div>
          <div>
            <h2 className={styles.title}>Metadata</h2>
            <p className={styles.subtitle}>Audio file information</p>
          </div>
        </div>
        <ParsingError
          message="Failed to parse metadata. Some information may be unavailable."
          showRawData={true}
          rawData={rawText}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faInfoCircle} />
        </div>
        <div>
          <h2 className={styles.title}>Metadata</h2>
          <p className={styles.subtitle}>Audio file information</p>
        </div>
      </div>

      {/* File Information Card */}
      <div className={styles.fileInfoCard}>
        <div className={styles.fileInfoHeader}>
          <FontAwesomeIcon icon={faFileAudio} className={styles.fileInfoIcon} />
          <h3 className={styles.fileInfoTitle}>Audio File Information</h3>
        </div>
        <div className={styles.fileInfoGrid}>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>File Name:</span>
            <span className={styles.fileInfoValue}>
              {parsedData.fileInfo.fileName}
            </span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>File Type:</span>
            <span className={styles.fileInfoValue}>
              {parsedData.fileInfo.fileType}
            </span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>File Size:</span>
            <span className={styles.fileInfoValue}>
              {parsedData.fileInfo.fileSize}
            </span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>Duration:</span>
            <span className={styles.fileInfoValue}>
              {parsedData.fileInfo.duration}
            </span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>Uploaded On:</span>
            <span className={styles.fileInfoValue}>
              {parsedData.fileInfo.uploadedOn}
            </span>
          </div>
        </div>
      </div>

      {/* Technical Details Grid */}
      <div className={styles.technicalSection}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon icon={faSignal} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Technical Details</h3>
        </div>
        <div className={styles.technicalGrid}>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Format:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.format}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Sample Rate:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.sampleRate}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Bitrate:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.bitrate}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Channels:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.channels}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Encoding:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.encoding}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Loudness:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.loudness}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Peak Level:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.peakLevel}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Noise Level:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.noiseLevel}
            </span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Dynamic Range:</span>
            <span className={styles.technicalValue}>
              {parsedData.technicalDetails.dynamicRange}
            </span>
          </div>
        </div>
      </div>

      {/* Audio Properties */}
      <div className={styles.audioPropertiesSection}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon icon={faWaveSquare} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Audio Properties</h3>
        </div>
        <div className={styles.audioPropertiesContent}>
          {/* Mini Waveform Preview */}
          <div className={styles.waveformSection}>
            <div className={styles.waveformLabel}>Waveform Preview</div>
            <div className={styles.waveformContainer}>
              {waveformData.map((height, index) => (
                <div
                  key={index}
                  className={styles.waveformBar}
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>

          {/* Channel Breakdown */}
          {parsedData.technicalDetails.channels?.includes("Stereo") && (
            <div className={styles.channelBreakdownSection}>
              <div className={styles.channelBreakdownLabel}>
                Channel Breakdown
              </div>
              <div className={styles.channelTrack}>
                <div className={styles.channelLabel}>Left Channel:</div>
                <div className={styles.channelBar}>
                  <div
                    className={styles.channelBarFill}
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
              <div className={styles.channelTrack}>
                <div className={styles.channelLabel}>Right Channel:</div>
                <div className={styles.channelBar}>
                  <div
                    className={styles.channelBarFill}
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Quality */}
      <div className={styles.aiQualitySection}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon
            icon={faCheckCircle}
            className={styles.sectionIcon}
          />
          <h3 className={styles.sectionTitle}>AI Analysis Quality</h3>
        </div>
        <div className={styles.aiQualityGrid}>
          {parsedData.aiQuality.confidence !== null && (
            <div className={styles.aiQualityItem}>
              <span className={styles.aiQualityLabel}>
                Analysis Confidence:
              </span>
              <div className={styles.aiQualityValue}>
                <div
                  className={styles.confidenceBadge}
                  style={{
                    backgroundColor: getConfidenceColor(
                      parsedData.aiQuality.confidence
                    ),
                  }}
                >
                  {parsedData.aiQuality.confidence.toFixed(2)}
                </div>
              </div>
            </div>
          )}
          <div className={styles.aiQualityItem}>
            <span className={styles.aiQualityLabel}>Audio Clarity:</span>
            <span
              className={styles.aiQualityValue}
              style={{ color: getClarityColor(parsedData.aiQuality.clarity) }}
            >
              {parsedData.aiQuality.clarity}
            </span>
          </div>
          <div className={styles.aiQualityItem}>
            <span className={styles.aiQualityLabel}>Speech Detection:</span>
            <span className={styles.aiQualityValue}>
              {parsedData.aiQuality.speechDetection}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Metadata */}
      {(parsedData.optionalMetadata.artist ||
        parsedData.optionalMetadata.album ||
        parsedData.optionalMetadata.title ||
        parsedData.optionalMetadata.genre ||
        parsedData.optionalMetadata.recordingDevice ||
        parsedData.optionalMetadata.gpsLocation) && (
        <div className={styles.optionalSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faTag} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Additional Metadata</h3>
          </div>
          <div className={styles.optionalGrid}>
            {parsedData.optionalMetadata.artist && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon
                  icon={faUser}
                  className={styles.optionalIcon}
                />
                <span className={styles.optionalLabel}>Artist:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.artist}
                </span>
              </div>
            )}
            {parsedData.optionalMetadata.album && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon
                  icon={faCompactDisc}
                  className={styles.optionalIcon}
                />
                <span className={styles.optionalLabel}>Album:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.album}
                </span>
              </div>
            )}
            {parsedData.optionalMetadata.title && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon
                  icon={faMusic}
                  className={styles.optionalIcon}
                />
                <span className={styles.optionalLabel}>Title:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.title}
                </span>
              </div>
            )}
            {parsedData.optionalMetadata.genre && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faTag} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Genre:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.genre}
                </span>
              </div>
            )}
            {parsedData.optionalMetadata.recordingDevice && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon
                  icon={faMobileAlt}
                  className={styles.optionalIcon}
                />
                <span className={styles.optionalLabel}>Recording Device:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.recordingDevice}
                </span>
              </div>
            )}
            {parsedData.optionalMetadata.gpsLocation && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  className={styles.optionalIcon}
                />
                <span className={styles.optionalLabel}>GPS Location:</span>
                <span className={styles.optionalValue}>
                  {parsedData.optionalMetadata.gpsLocation}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcription Metadata */}
      <div className={styles.transcriptionSection}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon icon={faMicrophone} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Transcription Metadata</h3>
        </div>
        <div className={styles.transcriptionGrid}>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Language:</span>
            <span className={styles.transcriptionValue}>
              {parsedData.transcriptionMetadata.language}
            </span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Word Count:</span>
            <span className={styles.transcriptionValue}>
              {parsedData.transcriptionMetadata.wordCount}
            </span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Speaker Labels:</span>
            <span className={styles.transcriptionValue}>
              {parsedData.transcriptionMetadata.speakerLabels}
            </span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>
              Transcription Method:
            </span>
            <span className={styles.transcriptionValue}>
              {parsedData.transcriptionMetadata.method}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMetadata;
