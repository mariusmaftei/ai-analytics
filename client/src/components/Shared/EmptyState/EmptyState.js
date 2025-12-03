import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInbox, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import styles from "./EmptyState.module.css";

const EmptyState = ({ 
  icon = faInbox, 
  title = "No data available", 
  message = "There is no data to display at this time.",
  showIcon = true 
}) => {
  return (
    <div className={styles.emptyState}>
      {showIcon && (
        <FontAwesomeIcon icon={icon} className={styles.emptyIcon} />
      )}
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyMessage}>{message}</p>
    </div>
  );
};

export default EmptyState;

