import React from "react";
import styles from "../InsightGenerator.module.css";

const CategorySummary = ({ summary, isAISummary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div
      className={isAISummary ? styles.aiSummaryQuote : styles.categorySummary}
    >
      {isAISummary ? (
        <blockquote className={styles.quotedSummary}>
          "{summary
            .replace(/^["']|["']$/g, "")
            .replace(/^[-•*]\s*/gm, "")
            .replace(/\*\*/g, "")
            .trim()}"
        </blockquote>
      ) : (
        summary
          .replace(/^[-•*]\s*/gm, "")
          .replace(/\*\*/g, "")
          .split(/[.!?]\s+/)
          .filter((s) => s.trim().length > 0)
          .map((sentence, idx, arr) => {
            const cleanSentence = sentence
              .trim()
              .replace(/^[-•*]\s*/, "")
              .replace(/\*\*/g, "");
            return (
              <div key={idx} className={styles.summaryBullet}>
                <span className={styles.bulletPoint}>•</span>
                <span>
                  {cleanSentence}
                  {idx < arr.length - 1 ? "." : ""}
                </span>
              </div>
            );
          })
      )}
    </div>
  );
};

export default CategorySummary;

