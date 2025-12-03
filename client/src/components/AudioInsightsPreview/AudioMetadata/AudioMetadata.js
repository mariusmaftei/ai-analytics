import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faFileAudio,
  faClock,
  faDatabase,
  faWaveSquare,
  faMicrophone,
  faHeadphones,
  faSignal,
  faVolumeHigh,
  faChartBar,
  faCheckCircle,
  faUser,
  faMusic,
  faCompactDisc,
  faTag,
  faMapMarkerAlt,
  faMobileAlt,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioMetadata.module.css";

const AudioMetadata = ({ data, rawText, analysisData, fileData }) => {
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

  const formatLanguage = (langCode) => {
    if (!langCode || langCode === "UNKNOWN" || langCode === "N/A") return "N/A";

    const languageMap = {
      LA: "Latin",
      EN: "English",
      EN_US: "English (US)",
      ES: "Spanish",
      FR: "French",
      DE: "German",
      IT: "Italian",
      PT: "Portuguese",
      RU: "Russian",
      ZH: "Chinese",
      JA: "Japanese",
      KO: "Korean",
      AR: "Arabic",
      HI: "Hindi",
      NL: "Dutch",
      PL: "Polish",
      TR: "Turkish",
      SV: "Swedish",
      DA: "Danish",
      NO: "Norwegian",
      FI: "Finnish",
      EL: "Greek",
      HE: "Hebrew",
      TH: "Thai",
      VI: "Vietnamese",
      CS: "Czech",
      HU: "Hungarian",
      RO: "Romanian",
      BG: "Bulgarian",
      HR: "Croatian",
      SK: "Slovak",
      SL: "Slovenian",
      ET: "Estonian",
      LV: "Latvian",
      LT: "Lithuanian",
      UK: "Ukrainian",
      SR: "Serbian",
      MK: "Macedonian",
      SQ: "Albanian",
      BS: "Bosnian",
      IS: "Icelandic",
      GA: "Irish",
      MT: "Maltese",
      CY: "Welsh",
      CA: "Catalan",
    };

    const upperCode = langCode.toUpperCase();
    if (languageMap[upperCode]) {
      return languageMap[upperCode];
    }

    const baseCode = upperCode.split("_")[0];
    if (languageMap[baseCode]) {
      return languageMap[baseCode];
    }

    return langCode;
  };

  const parsedData = useMemo(() => {
    const result = {
      fileInfo: {},
      technicalDetails: {},
      audioProperties: {},
      aiQuality: {},
      transcriptionMetadata: {},
      optionalMetadata: {},
    };

    const text = rawText || "";
    const sections = data?.sections || [];
    const metadata = analysisData?.metadata || {};

    console.log("[AudioMetadata] Raw sections:", sections);
    console.log("[AudioMetadata] Raw text length:", text.length);
    console.log("[AudioMetadata] Analysis metadata:", metadata);

    // Parse File Information from rawText
    const fileInfoMatch = text.match(
      /SECTION:\s*File\s+Information\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (fileInfoMatch) {
      const fileInfoText = fileInfoMatch[1];
      console.log("[AudioMetadata] Found File Information:", fileInfoText.substring(0, 500));

      // Split by newlines first, then parse each line
      const lines = fileInfoText.split(/\n/).filter(line => line.trim().length > 0);
      
      // Also handle concatenated entries on single line
      const allText = fileInfoText.replace(/\n/g, " ");
      
      // Use more specific regex that stops at the next label
      const fileNameMatch = allText.match(/File\s+Name:\s*((?:(?!File\s+(?:Type|Size)|Duration:|Uploaded\s+On:).)+?)(?=File\s+(?:Type|Size)|Duration:|Uploaded\s+On:|$)/i);
      const fileTypeMatch = allText.match(/File\s+Type:\s*((?:(?!File\s+(?:Name|Size)|Duration:|Uploaded\s+On:).)+?)(?=File\s+(?:Name|Size)|Duration:|Uploaded\s+On:|$)/i);
      const fileSizeMatch = allText.match(/File\s+Size:\s*((?:(?!File\s+(?:Name|Type)|Duration:|Uploaded\s+On:).)+?)(?=File\s+(?:Name|Type)|Duration:|Uploaded\s+On:|$)/i);
      const durationMatch = allText.match(/Duration:\s*((?:(?!File\s+(?:Name|Type|Size)|Uploaded\s+On:).)+?)(?=File\s+(?:Name|Type|Size)|Uploaded\s+On:|$)/i);
      const uploadedMatch = allText.match(/Uploaded\s+On:\s*((?:(?!File\s+(?:Name|Type|Size)|Duration:).)+?)(?=File\s+(?:Name|Type|Size)|Duration:|$)/i);

      // Prioritize actual file size from fileData or analysisData
      const actualFileSize = fileData?.fileSize || fileData?.file?.size || metadata.fileSize || metadata.file_size || null;
      const parsedFileSize = fileSizeMatch ? fileSizeMatch[1].trim() : null;
      
      result.fileInfo = {
        fileName: fileNameMatch && fileNameMatch[1].trim() !== "Unknown" ? fileNameMatch[1].trim() : (analysisData?.filename || fileData?.fileName || "Unknown"),
        fileType: fileTypeMatch ? fileTypeMatch[1].trim() : metadata.format?.toUpperCase() || "N/A",
        fileSize: actualFileSize ? formatFileSize(actualFileSize) : (parsedFileSize && parsedFileSize !== "0.00 MB" && parsedFileSize !== "N/A" ? parsedFileSize : "N/A"),
        duration: durationMatch ? durationMatch[1].trim() : formatDuration(metadata.duration),
        uploadedOn: uploadedMatch && uploadedMatch[1].trim() !== "N/A" ? uploadedMatch[1].trim() : (analysisData?.uploadedAt ? new Date(analysisData.uploadedAt).toLocaleDateString() : "N/A"),
      };
    } else {
      // Fallback to metadata object
      const actualFileSize = fileData?.fileSize || fileData?.file?.size || metadata.fileSize || metadata.file_size || null;
      
      result.fileInfo = {
        fileName: analysisData?.filename || fileData?.fileName || "Unknown",
        fileType: metadata.format?.toUpperCase() || "N/A",
        fileSize: actualFileSize ? formatFileSize(actualFileSize) : "N/A",
        duration: formatDuration(metadata.duration),
        uploadedOn: analysisData?.uploadedAt ? new Date(analysisData.uploadedAt).toLocaleDateString() : "N/A",
      };
    }

    // Parse Technical Details from rawText
    const technicalMatch = text.match(
      /SECTION:\s*Technical\s+Details\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (technicalMatch) {
      const technicalText = technicalMatch[1];
      console.log("[AudioMetadata] Found Technical Details:", technicalText.substring(0, 500));

      // Handle concatenated entries - use negative lookahead to stop at next label
      const allText = technicalText.replace(/\n/g, " ");
      
      const formatMatch = allText.match(/Format:\s*((?:(?!Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const sampleRateMatch = allText.match(/Sample\s+Rate:\s*((?:(?!Format|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const bitrateMatch = allText.match(/Bitrate:\s*((?:(?!Format|Sample\s+Rate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const channelsMatch = allText.match(/Channels:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Bitrate|Encoding|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const encodingMatch = allText.match(/Encoding:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Channels|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Bitrate|Channels|Loudness|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const loudnessMatch = allText.match(/Loudness:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Channels|Encoding|Peak\s+Level|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Bitrate|Channels|Encoding|Peak\s+Level|Noise\s+Level|Dynamic\s+Range|$)/i);
      const peakLevelMatch = allText.match(/Peak\s+Level:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Noise\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Noise\s+Level|Dynamic\s+Range|$)/i);
      const noiseLevelMatch = allText.match(/Noise\s+Level:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Dynamic\s+Range).)+?)(?=Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Dynamic\s+Range|$)/i);
      const dynamicRangeMatch = allText.match(/Dynamic\s+Range:\s*((?:(?!Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level).)+?)(?=Format|Sample\s+Rate|Bitrate|Channels|Encoding|Loudness|Peak\s+Level|Noise\s+Level|$)/i);

      // Helper function to clean parsed values
      const cleanValue = (value, label) => {
        if (!value) return null;
        let cleaned = value.trim();
        // Remove any label text that might be included
        cleaned = cleaned.replace(new RegExp(`^${label}:\\s*`, "i"), "");
        // Remove any trailing label text
        cleaned = cleaned.replace(new RegExp(`\\s*${label}:.*$`, "i"), "");
        // Remove "N/A" followed by label
        cleaned = cleaned.replace(/N\/A\s*[A-Z][a-z]+\s*Level:\s*N\/A/gi, "N/A");
        return cleaned;
      };

      // Prioritize actual metadata values over parsed text
      const parsedSampleRate = cleanValue(sampleRateMatch ? sampleRateMatch[1] : null, "Sample Rate");
      const parsedBitrate = cleanValue(bitrateMatch ? bitrateMatch[1] : null, "Bitrate");
      const parsedChannels = cleanValue(channelsMatch ? channelsMatch[1] : null, "Channels");
      const parsedFormat = cleanValue(formatMatch ? formatMatch[1] : null, "Format");
      const parsedEncoding = cleanValue(encodingMatch ? encodingMatch[1] : null, "Encoding");
      const parsedLoudness = cleanValue(loudnessMatch ? loudnessMatch[1] : null, "Loudness");
      const parsedPeakLevel = cleanValue(peakLevelMatch ? peakLevelMatch[1] : null, "Peak Level");
      const parsedNoiseLevel = cleanValue(noiseLevelMatch ? noiseLevelMatch[1] : null, "Noise Level");
      const parsedDynamicRange = cleanValue(dynamicRangeMatch ? dynamicRangeMatch[1] : null, "Dynamic Range");
      
      result.technicalDetails = {
        format: parsedFormat && parsedFormat !== "N/A" && !parsedFormat.toLowerCase().includes("format:") ? parsedFormat : (metadata.format?.toUpperCase() || "N/A"),
        sampleRate: (metadata.sampleRate || metadata.sample_rate) ? `${metadata.sampleRate || metadata.sample_rate} Hz` : (parsedSampleRate && parsedSampleRate !== "N/A Hz" && !parsedSampleRate.toLowerCase().includes("sample rate:") ? parsedSampleRate : "N/A"),
        bitrate: metadata.bitrate ? `${metadata.bitrate} kbps` : (parsedBitrate && parsedBitrate !== "N/A kbps" && parsedBitrate !== "None kbps" && !parsedBitrate.toLowerCase().includes("bitrate:") ? parsedBitrate : "N/A"),
        channels: metadata.channels ? `${metadata.channels} (${metadata.channels === 2 ? 'Stereo' : metadata.channels === 1 ? 'Mono' : 'N/A'})` : (parsedChannels && parsedChannels !== "N/A" && !parsedChannels.includes("None") && !parsedChannels.toLowerCase().includes("channels:") ? parsedChannels : "N/A"),
        encoding: parsedEncoding && parsedEncoding !== "N/A" && !parsedEncoding.toLowerCase().includes("encoding:") ? parsedEncoding : (metadata.format === "mp3" ? "MP3" : metadata.format === "wav" ? "PCM" : "N/A"),
        loudness: parsedLoudness && parsedLoudness !== "N/A" && !parsedLoudness.toLowerCase().includes("loudness:") ? parsedLoudness : "N/A",
        peakLevel: parsedPeakLevel && parsedPeakLevel !== "N/A" && !parsedPeakLevel.toLowerCase().includes("peak level:") && !parsedPeakLevel.toLowerCase().includes("noiselevel:") ? parsedPeakLevel : "N/A",
        noiseLevel: parsedNoiseLevel && parsedNoiseLevel !== "N/A" && !parsedNoiseLevel.toLowerCase().includes("noise level:") ? parsedNoiseLevel : "N/A",
        dynamicRange: parsedDynamicRange && parsedDynamicRange !== "N/A" && !parsedDynamicRange.toLowerCase().includes("dynamic range:") ? parsedDynamicRange : "N/A",
      };
    } else {
      // Fallback to metadata object
      result.technicalDetails = {
        format: metadata.format?.toUpperCase() || "N/A",
        sampleRate: metadata.sampleRate || metadata.sample_rate ? `${metadata.sampleRate || metadata.sample_rate} Hz` : "N/A",
        bitrate: metadata.bitrate ? `${metadata.bitrate} kbps` : "N/A",
        channels: metadata.channels ? `${metadata.channels} (${metadata.channels === 2 ? 'Stereo' : metadata.channels === 1 ? 'Mono' : 'N/A'})` : "N/A",
        encoding: metadata.format === "mp3" ? "MP3" : metadata.format === "wav" ? "PCM" : "N/A",
        loudness: "N/A",
        peakLevel: "N/A",
        noiseLevel: "N/A",
        dynamicRange: "N/A",
      };
    }

    // Parse Audio Properties from rawText
    const audioPropsMatch = text.match(
      /SECTION:\s*Audio\s+Properties\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (audioPropsMatch) {
      const audioPropsText = audioPropsMatch[1];
      console.log("[AudioMetadata] Found Audio Properties:", audioPropsText.substring(0, 300));

      const channelBreakdownMatch = audioPropsText.match(/Channel\s+Breakdown:\s*(.+)/i);
      const waveformMatch = audioPropsText.match(/Waveform\s+Characteristics:\s*(.+)/i);

      result.audioProperties = {
        channelBreakdown: channelBreakdownMatch ? channelBreakdownMatch[1].trim() : "N/A",
        waveformCharacteristics: waveformMatch ? waveformMatch[1].trim() : "N/A",
      };
    } else {
      result.audioProperties = {
        channelBreakdown: metadata.channels === 2 ? "Stereo (Left/Right)" : "N/A",
        waveformCharacteristics: "N/A",
      };
    }

    // Parse AI Analysis Quality from rawText
    const aiQualityMatch = text.match(
      /SECTION:\s*AI\s+Analysis\s+Quality\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (aiQualityMatch) {
      const aiQualityText = aiQualityMatch[1];
      console.log("[AudioMetadata] Found AI Analysis Quality:", aiQualityText.substring(0, 500));

      // Handle concatenated entries
      const allText = aiQualityText.replace(/\n/g, " ");
      
      const confidenceMatch = allText.match(/Analysis\s+Confidence:\s*([\d.]+)(?=Audio\s+Clarity|Speech\s+Detection|$)/i);
      const clarityMatch = allText.match(/Audio\s+Clarity:\s*((?:(?!Analysis\s+Confidence|Speech\s+Detection).)+?)(?=Analysis\s+Confidence|Speech\s+Detection|$)/i);
      const speechDetectionMatch = allText.match(/Speech\s+Detection:\s*((?:(?!Analysis\s+Confidence|Audio\s+Clarity).)+?)(?=Analysis\s+Confidence|Audio\s+Clarity|$)/i);

      // Calculate speech detection percentage from transcription data if available
      const transcriptionData = analysisData?.transcription || {};
      let speechDetectionValue = "N/A";
      if (speechDetectionMatch) {
        const parsed = speechDetectionMatch[1].trim();
        // If it's a valid percentage (not "0%" or "N/A"), use it
        if (parsed !== "0%" && parsed !== "N/A" && parsed !== "N/A%") {
          speechDetectionValue = parsed;
        } else if (transcriptionData.text && transcriptionData.wordCount > 0) {
          // Calculate based on word count and duration
          const duration = metadata.duration || transcriptionData.duration || 0;
          if (duration > 0) {
            const wordsPerMinute = (transcriptionData.wordCount / duration) * 60;
            // Estimate: normal speech is 150-200 WPM, so calculate percentage
            const estimatedPercentage = Math.min(100, Math.round((wordsPerMinute / 150) * 100));
            speechDetectionValue = `${estimatedPercentage}%`;
          } else {
            speechDetectionValue = transcriptionData.wordCount > 0 ? "High" : "N/A";
          }
        }
      } else if (transcriptionData.text && transcriptionData.wordCount > 0) {
        // Calculate if not parsed
        const duration = metadata.duration || transcriptionData.duration || 0;
        if (duration > 0) {
          const wordsPerMinute = (transcriptionData.wordCount / duration) * 60;
          const estimatedPercentage = Math.min(100, Math.round((wordsPerMinute / 150) * 100));
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
      /SECTION:\s*Transcription\s+Metadata\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (transcriptionMatch) {
      const transcriptionText = transcriptionMatch[1];
      console.log("[AudioMetadata] Found Transcription Metadata:", transcriptionText.substring(0, 500));

      // Handle concatenated entries
      const allText = transcriptionText.replace(/\n/g, " ");
      
      const languageMatch = allText.match(/Language:\s*((?:(?!Word\s+Count|Speaker\s+Labels|Transcription\s+Method).)+?)(?=Word\s+Count|Speaker\s+Labels|Transcription\s+Method|$)/i);
      const wordCountMatch = allText.match(/Word\s+Count:\s*(\d+)(?=Language|Speaker\s+Labels|Transcription\s+Method|$)/i);
      const speakerLabelsMatch = allText.match(/Speaker\s+Labels:\s*((?:(?!Language|Word\s+Count|Transcription\s+Method).)+?)(?=Language|Word\s+Count|Transcription\s+Method|$)/i);
      const methodMatch = allText.match(/Transcription\s+Method:\s*((?:(?!Language|Word\s+Count|Speaker\s+Labels).)+?)(?=Language|Word\s+Count|Speaker\s+Labels|$)/i);

      // Prioritize actual transcription data over parsed text
      const parsedWordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : null;
      const transcriptionData = analysisData?.transcription || {};
      const rawLanguage = transcriptionData.language || (languageMatch ? languageMatch[1].trim() : "N/A");
      
      result.transcriptionMetadata = {
        language: formatLanguage(rawLanguage),
        wordCount: transcriptionData.wordCount || transcriptionData.word_count || parsedWordCount || 0,
        speakerLabels: transcriptionData.speakers || transcriptionData.segments?.some(s => s.speaker) ? "Enabled" : (speakerLabelsMatch ? speakerLabelsMatch[1].trim() : "Disabled"),
        method: methodMatch ? methodMatch[1].trim() : "AssemblyAI",
      };
    } else {
      const transcriptionData = analysisData?.transcription || {};
      const rawLanguage = transcriptionData.language || "N/A";
      
      result.transcriptionMetadata = {
        language: formatLanguage(rawLanguage),
        wordCount: transcriptionData.wordCount || transcriptionData.word_count || 0,
        speakerLabels: transcriptionData.speakers || transcriptionData.segments?.some(s => s.speaker) ? "Enabled" : "Disabled",
        method: "AssemblyAI",
      };
    }

    // Parse Optional Metadata from rawText
    const optionalMatch = text.match(
      /SECTION:\s*Optional\s+Metadata\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (optionalMatch) {
      const optionalText = optionalMatch[1];
      console.log("[AudioMetadata] Found Optional Metadata:", optionalText.substring(0, 500));

      // Handle concatenated entries
      const allText = optionalText.replace(/\n/g, " ");
      
      const artistMatch = allText.match(/Artist:\s*((?:(?!Album|Title|Genre|Recording\s+Device|GPS\s+Location).)+?)(?=Album|Title|Genre|Recording\s+Device|GPS\s+Location|$)/i);
      const albumMatch = allText.match(/Album:\s*((?:(?!Artist|Title|Genre|Recording\s+Device|GPS\s+Location).)+?)(?=Artist|Title|Genre|Recording\s+Device|GPS\s+Location|$)/i);
      const titleMatch = allText.match(/Title:\s*((?:(?!Artist|Album|Genre|Recording\s+Device|GPS\s+Location).)+?)(?=Artist|Album|Genre|Recording\s+Device|GPS\s+Location|$)/i);
      const genreMatch = allText.match(/Genre:\s*((?:(?!Artist|Album|Title|Recording\s+Device|GPS\s+Location).)+?)(?=Artist|Album|Title|Recording\s+Device|GPS\s+Location|$)/i);
      const deviceMatch = allText.match(/Recording\s+Device:\s*((?:(?!Artist|Album|Title|Genre|GPS\s+Location).)+?)(?=Artist|Album|Title|Genre|GPS\s+Location|$)/i);
      const gpsMatch = allText.match(/GPS\s+Location:\s*((?:(?!Artist|Album|Title|Genre|Recording\s+Device).)+?)(?=Artist|Album|Title|Genre|Recording\s+Device|$)/i);

      result.optionalMetadata = {
        artist: artistMatch && artistMatch[1].trim() !== "N/A" ? artistMatch[1].trim() : null,
        album: albumMatch && albumMatch[1].trim() !== "N/A" ? albumMatch[1].trim() : null,
        title: titleMatch && titleMatch[1].trim() !== "N/A" ? titleMatch[1].trim() : null,
        genre: genreMatch && genreMatch[1].trim() !== "N/A" ? genreMatch[1].trim() : null,
        recordingDevice: deviceMatch && deviceMatch[1].trim() !== "N/A" ? deviceMatch[1].trim() : null,
        gpsLocation: gpsMatch && gpsMatch[1].trim() !== "N/A" ? gpsMatch[1].trim() : null,
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

    console.log("[AudioMetadata] Parsed data:", result);
    return result;
  }, [data, rawText, analysisData]);

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

  const waveformData = useMemo(() => generateWaveform(parsedData.technicalDetails.channels), [parsedData.technicalDetails.channels]);

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
            <span className={styles.fileInfoValue}>{parsedData.fileInfo.fileName}</span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>File Type:</span>
            <span className={styles.fileInfoValue}>{parsedData.fileInfo.fileType}</span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>File Size:</span>
            <span className={styles.fileInfoValue}>{parsedData.fileInfo.fileSize}</span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>Duration:</span>
            <span className={styles.fileInfoValue}>{parsedData.fileInfo.duration}</span>
          </div>
          <div className={styles.fileInfoItem}>
            <span className={styles.fileInfoLabel}>Uploaded On:</span>
            <span className={styles.fileInfoValue}>{parsedData.fileInfo.uploadedOn}</span>
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
            <span className={styles.technicalValue}>{parsedData.technicalDetails.format}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Sample Rate:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.sampleRate}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Bitrate:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.bitrate}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Channels:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.channels}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Encoding:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.encoding}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Loudness:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.loudness}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Peak Level:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.peakLevel}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Noise Level:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.noiseLevel}</span>
          </div>
          <div className={styles.technicalItem}>
            <span className={styles.technicalLabel}>Dynamic Range:</span>
            <span className={styles.technicalValue}>{parsedData.technicalDetails.dynamicRange}</span>
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
              <div className={styles.channelBreakdownLabel}>Channel Breakdown</div>
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
          <FontAwesomeIcon icon={faCheckCircle} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>AI Analysis Quality</h3>
        </div>
        <div className={styles.aiQualityGrid}>
          {parsedData.aiQuality.confidence !== null && (
            <div className={styles.aiQualityItem}>
              <span className={styles.aiQualityLabel}>Analysis Confidence:</span>
              <div className={styles.aiQualityValue}>
                <div
                  className={styles.confidenceBadge}
                  style={{ backgroundColor: getConfidenceColor(parsedData.aiQuality.confidence) }}
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
            <span className={styles.aiQualityValue}>{parsedData.aiQuality.speechDetection}</span>
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
                <FontAwesomeIcon icon={faUser} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Artist:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.artist}</span>
              </div>
            )}
            {parsedData.optionalMetadata.album && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faCompactDisc} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Album:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.album}</span>
              </div>
            )}
            {parsedData.optionalMetadata.title && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faMusic} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Title:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.title}</span>
              </div>
            )}
            {parsedData.optionalMetadata.genre && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faTag} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Genre:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.genre}</span>
              </div>
            )}
            {parsedData.optionalMetadata.recordingDevice && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faMobileAlt} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>Recording Device:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.recordingDevice}</span>
              </div>
            )}
            {parsedData.optionalMetadata.gpsLocation && (
              <div className={styles.optionalItem}>
                <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.optionalIcon} />
                <span className={styles.optionalLabel}>GPS Location:</span>
                <span className={styles.optionalValue}>{parsedData.optionalMetadata.gpsLocation}</span>
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
            <span className={styles.transcriptionValue}>{parsedData.transcriptionMetadata.language}</span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Word Count:</span>
            <span className={styles.transcriptionValue}>{parsedData.transcriptionMetadata.wordCount}</span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Speaker Labels:</span>
            <span className={styles.transcriptionValue}>{parsedData.transcriptionMetadata.speakerLabels}</span>
          </div>
          <div className={styles.transcriptionItem}>
            <span className={styles.transcriptionLabel}>Transcription Method:</span>
            <span className={styles.transcriptionValue}>{parsedData.transcriptionMetadata.method}</span>
          </div>
        </div>
      </div>

      {/* Fallback: Show raw sections if available */}
      {Object.keys(parsedData.fileInfo).length === 0 &&
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
                    } else {
                      return (
                        <div key={itemIndex} className={styles.text}>
                          {item.text || item.value}
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
      {Object.keys(parsedData.fileInfo).length === 0 &&
        !data?.sections &&
        rawText && <div className={styles.rawText}>{rawText}</div>}
    </div>
  );
};

export default AudioMetadata;
