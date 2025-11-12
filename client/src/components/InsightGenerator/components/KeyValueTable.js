import React from "react";
import styles from "../InsightGenerator.module.css";

const KeyValueTable = ({ keyValuePairs }) => {
  const filteredPairs = keyValuePairs.filter(
    (p) =>
      !p.key.startsWith("numbered_section_") &&
      p.key !== "bullet_point" &&
      p.key !== "checkmark_item"
  );

  if (filteredPairs.length === 0) {
    return null;
  }

  const hasDescriptions = filteredPairs.some(
    (p) =>
      p.description &&
      p.description !== "bullet" &&
      p.description !== "numbered_section" &&
      !p.description.match(/^[✅❌⚙️]$/)
  );

  return (
    <div className={styles.keyValueTable}>
      <div className={styles.tableHeader}>
        <div className={styles.tableHeaderCell}>Key</div>
        <div className={styles.tableHeaderCell}>Value</div>
        {hasDescriptions && (
          <div className={styles.tableHeaderCell}>Description</div>
        )}
      </div>
      {filteredPairs.map((pair, pairIndex) => (
        <div key={pairIndex} className={styles.tableRow}>
          <div className={styles.tableCellKey}>
            <span className={styles.keyLabel}>
              {String(pair.key)
                .replace(/^[-•*]\s*/, "")
                .replace(/^\*\*|\*\*$/g, "")
                .replace(/^["']|["']$/g, "")
                .trim()}
            </span>
          </div>
          <div className={styles.tableCellValue}>
            {Array.isArray(pair.value) ? (
              <ul className={styles.valueList}>
                {pair.value.map((item, itemIndex) => {
                  const cleanItem = String(item)
                    .replace(/^[-•*]\s*/, "")
                    .replace(/^\*\*|\*\*$/g, "")
                    .replace(/^["']|["']$/g, "")
                    .trim();
                  return <li key={itemIndex}>{cleanItem}</li>;
                })}
              </ul>
            ) : (
              <span className={styles.valueText}>
                {String(pair.value)
                  .replace(/^[-•*]\s*/, "")
                  .replace(/^\*\*|\*\*$/g, "")
                  .replace(/^["']|["']$/g, "")
                  .trim()}
              </span>
            )}
          </div>
          {pair.description &&
            pair.description !== "bullet" &&
            pair.description !== "numbered_section" &&
            !pair.description.match(/^[✅❌⚙️]$/) && (
              <div className={styles.tableCellDescription}>
                <span className={styles.descriptionText}>
                  {String(pair.description)
                    .replace(/^[-•*]\s*/, "")
                    .replace(/^\*\*|\*\*$/g, "")
                    .replace(/^["']|["']$/g, "")
                    .trim()}
                </span>
              </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default KeyValueTable;

