import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faVolumeUp,
  faVolumeMute,
  faVolumeDown,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioPlayer.module.css";

const AudioPlayer = ({
  file,
  audioUrl,
  fileName = "audio.mp3",
  metadata,
  showControls = true,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);

  // Create object URL from file if provided
  useEffect(() => {
    if (file instanceof File) {
      try {
        const url = URL.createObjectURL(file);
        setAudioSrc(url);
        setIsLoading(true);
        setError(null);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error("AudioPlayer: Error creating object URL", err);
        setError(`Failed to create audio URL: ${err.message}`);
        setIsLoading(false);
      }
    } else if (audioUrl) {
      setAudioSrc(audioUrl);
      setIsLoading(true);
      setError(null);
    } else {
      setError("No audio file provided");
      setIsLoading(false);
    }
  }, [file, audioUrl]);

  // Update current time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = (e) => {
      console.error("AudioPlayer: Playback error", e);
      setError("Failed to play audio file");
      setIsLoading(false);
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
  }, [audioSrc]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
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

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return faVolumeMute;
    if (volume < 0.3) return faVolumeDown;
    return faVolumeUp;
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <p>Error loading audio: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        {/* Audio Element */}
        <audio ref={audioRef} src={audioSrc} preload="metadata" />

        {/* Player Controls */}
        {showControls && (
          <div className={styles.controls}>
            {/* Play/Pause Button */}
            <button
              className={styles.playButton}
              onClick={handlePlayPause}
              disabled={isLoading || !audioSrc}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>

            {/* Progress Bar */}
            <div className={styles.progressSection}>
              <div
                className={styles.progressBar}
                onClick={handleSeek}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const audio = audioRef.current;
                    if (!audio) return;
                    const change = e.key === "ArrowLeft" ? -5 : 5;
                    audio.currentTime = Math.max(
                      0,
                      Math.min(duration, audio.currentTime + change)
                    );
                  }
                }}
              >
                <div
                  className={styles.progressFill}
                  style={{
                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                  }}
                />
                <div
                  className={styles.progressHandle}
                  style={{
                    left: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                  }}
                />
              </div>

              {/* Time Display */}
              <div className={styles.timeDisplay}>
                <span>{formatTime(currentTime)}</span>
                <span className={styles.timeSeparator}>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className={styles.volumeSection}>
              <button
                className={styles.volumeButton}
                onClick={handleMuteToggle}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <FontAwesomeIcon icon={getVolumeIcon()} />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
                aria-label="Volume"
              />
            </div>
          </div>
        )}

        {/* File Info */}
        <div className={styles.fileInfo}>
          <div className={styles.fileName}>{fileName}</div>
          {metadata && (
            <div className={styles.metadata}>
              {metadata.format && (
                <span className={styles.metaTag}>{metadata.format.toUpperCase()}</span>
              )}
              {metadata.duration && (
                <span className={styles.metaTag}>
                  {formatTime(metadata.duration)}
                </span>
              )}
              {metadata.fileSize && (
                <span className={styles.metaTag}>
                  {(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

