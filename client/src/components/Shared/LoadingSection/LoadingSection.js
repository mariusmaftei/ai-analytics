import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import ProgressBar from "../ProgressBar/ProgressBar";
import styles from "./LoadingSection.module.css";

const LoadingSection = ({
  isLoading,
  error,
  onRetry,
  progress,
  loadingMessage,
  accentColor = "#f97316",
  fileType,
}) => {
  if (error) {
    return (
      <div className={styles.errorSection} style={{ "--accent-color": accentColor }}>
        <p>{error}</p>
        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={styles.loadingSection}
      style={{ "--accent-color": accentColor }}
    >
      <FontAwesomeIcon icon={faSpinner} className={styles.spinner} spin />
      {progress && progress.total > 0 ? (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          currentType={progress.currentType}
          color={progress.color || accentColor}
          fileType={fileType}
        />
      ) : (
        loadingMessage && <p>{loadingMessage}</p>
      )}
    </div>
  );
};

export default LoadingSection;

