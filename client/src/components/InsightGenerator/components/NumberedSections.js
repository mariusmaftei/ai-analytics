import React from "react";
import styles from "../InsightGenerator.module.css";

const NumberedSections = ({ keyValuePairs }) => {
  let currentNumberedSection = null;
  const sections = [];

  keyValuePairs.forEach((pair) => {
    if (pair.key.startsWith("numbered_section_")) {
      if (currentNumberedSection) {
        sections.push(currentNumberedSection);
      }
      currentNumberedSection = {
        title: pair.value,
        bullets: [],
      };
    } else if (pair.key === "bullet_point" && currentNumberedSection) {
      currentNumberedSection.bullets.push(pair.value);
    } else if (pair.key === "bullet_point") {
      if (!currentNumberedSection) {
        currentNumberedSection = { title: "", bullets: [] };
      }
      currentNumberedSection.bullets.push(pair.value);
    }
  });

  if (currentNumberedSection) {
    sections.push(currentNumberedSection);
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={styles.numberedSectionsContainer}>
      {sections.map((section, secIdx) => (
        <div key={secIdx} className={styles.numberedSection}>
          {section.title && (
            <h5 className={styles.numberedSectionTitle}>
              {secIdx + 1}. {section.title}
            </h5>
          )}
          {section.bullets.length > 0 && (
            <ul className={styles.numberedSectionBullets}>
              {section.bullets.map((bullet, bulletIdx) => (
                <li key={bulletIdx}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default NumberedSections;

