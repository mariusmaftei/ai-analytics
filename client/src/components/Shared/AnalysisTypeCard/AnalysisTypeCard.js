import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./AnalysisTypeCard.module.css";

const AnalysisTypeCard = ({
  type,
  isSelected,
  isCompleted,
  onClick,
  disabled,
  isAnalyzeAll = false,
  accentColor = "#f97316",
}) => {
  return (
    <button
      className={`${styles.card} ${isSelected ? styles.selected : ""} ${
        isCompleted ? styles.completed : ""
      } ${isAnalyzeAll ? styles.analyzeAll : ""}`}
      onClick={onClick}
      disabled={disabled}
      style={{ "--accent-color": accentColor }}
    >
      <FontAwesomeIcon
        icon={type.icon}
        className={`${styles.icon} ${isAnalyzeAll ? styles.analyzeAllIcon : ""}`}
      />
      <div className={styles.info}>
        <span className={styles.label}>{type.label}</span>
        <span className={styles.description}>{type.description}</span>
      </div>
      {isCompleted && !isAnalyzeAll && (
        <span className={styles.completedBadge}>Completed</span>
      )}
    </button>
  );
};

export default AnalysisTypeCard;

