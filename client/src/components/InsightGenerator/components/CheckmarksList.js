import React from "react";
import styles from "../InsightGenerator.module.css";

const CheckmarksList = ({ keyValuePairs }) => {
  const checkmarkItems = keyValuePairs.filter(
    (p) => p.key === "checkmark_item"
  );

  if (checkmarkItems.length === 0) {
    return null;
  }

  return (
    <div className={styles.checkmarksContainer}>
      {checkmarkItems.map((pair, idx) => (
        <div key={idx} className={styles.checkmarkItem}>
          <span className={styles.checkmarkIcon}>{pair.description}</span>
          <span className={styles.checkmarkText}>{pair.value}</span>
        </div>
      ))}
    </div>
  );
};

export default CheckmarksList;

