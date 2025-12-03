import React, { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTextWidth,
  faClock,
  faPlay,
  faPause,
  faBackward,
  faForward,
  faVolumeUp,
  faVolumeMute,
} from "@fortawesome/free-solid-svg-icons";
import { errorLog } from "../../../utils/debugLogger";
import styles from "./AudioTranscription.module.css";

const AudioTranscription = ({ data, rawText, analysisData, fileData }) => {
  const audioRef = useRef(null);
  const segmentsContainerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [highlightedKeyword, setHighlightedKeyword] = useState(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const waveformCanvasRef = useRef(null);

  const segments = useMemo(
    () => analysisData?.transcription?.segments || [],
    [analysisData?.transcription?.segments]
  );
  const fullText =
    analysisData?.transcription?.text || analysisData?.text || "";
  const audioFile = fileData?.file;
  const audioUrl = analysisData?.audioUrl;

  // Extract keywords from Keywords section if available
  const keywords = useMemo(() => {
    if (!data?.sections) return [];
    const keywordSections = data.sections.filter(
      (s) =>
        s.name?.toLowerCase().includes("keyword") ||
        s.name?.toLowerCase().includes("term")
    );
    const extractedKeywords = [];
    keywordSections.forEach((section) => {
      section.content?.forEach((item) => {
        if (item.type === "bullet" && item.text) {
          extractedKeywords.push(item.text.toLowerCase());
        } else if (item.type === "keyValue" && item.value) {
          const values = item.value
            .split(/[,\-•]/)
            .map((v) => v.trim().toLowerCase())
            .filter((v) => v.length > 2);
          extractedKeywords.push(...values);
        }
      });
    });
    return [...new Set(extractedKeywords)];
  }, [data]);

  // Create audio source URL
  useEffect(() => {
    if (audioFile instanceof File) {
      const url = URL.createObjectURL(audioFile);
      if (audioRef.current) {
        audioRef.current.src = url;
      }
      return () => URL.revokeObjectURL(url);
    } else if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }
    }
  }, [audioFile, audioUrl]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegmentIndex(-1);
    };
    const handleError = (e) => {
      errorLog("AudioTranscription", "Audio playback error:", e);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Sync playback rate and volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [playbackRate, volume, isMuted]);

  // Find active segment based on current time
  useEffect(() => {
    if (!isPlaying || segments.length === 0) return;

    const currentIndex = segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );

    if (currentIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(currentIndex);
      // Autoscroll to active segment
      if (currentIndex >= 0 && segmentsContainerRef.current) {
        const segmentElement =
          segmentsContainerRef.current.children[currentIndex];
        if (segmentElement) {
          segmentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [currentTime, isPlaying, segments, activeSegmentIndex]);

  // Generate simple waveform data (mock for now - can be enhanced with Web Audio API)
  useEffect(() => {
    if (duration > 0 && waveformCanvasRef.current) {
      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Generate mock waveform bars
      const barCount = 200;
      const barWidth = width / barCount;
      ctx.fillStyle = "#9333ea";
      ctx.strokeStyle = "#9333ea";

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * height * 0.6 + height * 0.2;
        const x = i * barWidth;
        ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);
      }

      // Draw progress indicator
      if (duration > 0) {
        const progress = (currentTime / duration) * width;
        ctx.fillStyle = "#a855f7";
        ctx.fillRect(0, 0, progress, height);
      }
    }
  }, [duration, currentTime]);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  };

  const handleSkip = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 5);
  };

  const handleSeek = (targetTime) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedChange = (e) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  // Highlight keywords in text
  const highlightKeywords = (text) => {
    if (!highlightedKeyword || keywords.length === 0) return text;

    const regex = new RegExp(`\\b(${highlightedKeyword})\\b`, "gi");
    return text.replace(regex, (match) => {
      return `<mark class="${styles.keywordHighlight}">${match}</mark>`;
    });
  };

  const handleKeywordClick = (keyword) => {
    setHighlightedKeyword(keyword);
    // Find first occurrence of keyword in segments
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].text.toLowerCase().includes(keyword.toLowerCase())) {
        handleSeek(segments[i].start);
        break;
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faTextWidth} />
        </div>
        <div>
          <h2 className={styles.title}>Transcription</h2>
          <p className={styles.subtitle}>
            Full text transcript with timestamps and playback controls
          </p>
        </div>
      </div>

      {/* Audio Player Controls */}
      {(audioFile || audioUrl) && (
        <div className={styles.playerSection}>
          <audio ref={audioRef} preload="metadata" />

          {/* Waveform Preview */}
          <div className={styles.waveformContainer}>
            <canvas
              ref={waveformCanvasRef}
              className={styles.waveform}
              width={800}
              height={80}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleSeek(percentage * duration);
              }}
            />
          </div>

          {/* Playback Controls */}
          <div className={styles.controls}>
            <button
              className={styles.controlButton}
              onClick={handleReplay}
              title="Replay 5 seconds"
            >
              <FontAwesomeIcon icon={faBackward} />
              <span>5s</span>
            </button>

            <button
              className={`${styles.controlButton} ${styles.playButton}`}
              onClick={handlePlayPause}
              disabled={!audioFile && !audioUrl}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>

            <button
              className={styles.controlButton}
              onClick={handleSkip}
              title="Skip 5 seconds"
            >
              <FontAwesomeIcon icon={faForward} />
              <span>5s</span>
            </button>

            <div className={styles.speedControl}>
              <label htmlFor="speed-select">Speed:</label>
              <select
                id="speed-select"
                value={playbackRate}
                onChange={handleSpeedChange}
                className={styles.speedSelect}
              >
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div className={styles.volumeControl}>
              <button
                className={styles.volumeButton}
                onClick={handleMuteToggle}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
              />
            </div>

            <div className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      )}

      {/* Keywords Quick Access */}
      {keywords.length > 0 && (
        <div className={styles.keywordsSection}>
          <h3 className={styles.keywordsTitle}>Keywords (Click to jump)</h3>
          <div className={styles.keywordsList}>
            {keywords.slice(0, 20).map((keyword, idx) => (
              <button
                key={idx}
                className={`${styles.keywordChip} ${
                  highlightedKeyword === keyword ? styles.keywordChipActive : ""
                }`}
                onClick={() => handleKeywordClick(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transcription Segments */}
      {segments.length > 0 ? (
        <div className={styles.segments} ref={segmentsContainerRef}>
          {segments.map((segment, index) => {
            const isActive = isPlaying && activeSegmentIndex === index;
            const isInRange =
              currentTime >= segment.start && currentTime < segment.end;

            return (
              <div
                key={index}
                className={`${styles.segment} ${
                  isActive || isInRange ? styles.segmentActive : ""
                }`}
              >
                <button
                  className={styles.timestamp}
                  onClick={() => handleSeek(segment.start)}
                  title="Click to jump to this time"
                >
                  <FontAwesomeIcon icon={faClock} />
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                  {segment.speaker && (
                    <span className={styles.speaker}> • {segment.speaker}</span>
                  )}
                </button>
                <div
                  className={styles.text}
                  dangerouslySetInnerHTML={{
                    __html: highlightKeywords(segment.text),
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.fullText}>
          <div
            dangerouslySetInnerHTML={{
              __html: highlightKeywords(
                fullText || rawText || "No transcription available"
              ),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AudioTranscription;
