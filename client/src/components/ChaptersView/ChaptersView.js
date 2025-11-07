import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faFileLines } from "@fortawesome/free-solid-svg-icons";
import styles from "./ChaptersView.module.css";

const ChaptersView = ({ chapters, highlights, keywords }) => {
  return (
    <div className={styles.container}>
      {/* Chapters Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon icon={faBook} />
          <h3>Chapters</h3>
          <span className={styles.count}>{chapters.length} chapters</span>
        </div>

        <div className={styles.chaptersList}>
          {chapters.map((chapter) => (
            <div key={chapter.id} className={styles.chapterCard}>
              <div className={styles.chapterNumber}>
                {chapter.id}
              </div>
              <div className={styles.chapterContent}>
                <h4 className={styles.chapterTitle}>{chapter.title}</h4>
                <p className={styles.chapterPages}>Pages {chapter.pages}</p>
                <p className={styles.chapterSummary}>{chapter.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <FontAwesomeIcon icon={faFileLines} />
          <h3>Key Highlights</h3>
          <span className={styles.count}>{highlights.length} highlights</span>
        </div>

        <div className={styles.highlightsList}>
          {highlights.map((highlight, index) => (
            <div key={index} className={styles.highlightCard}>
              <div className={styles.highlightPage}>
                Page {highlight.page}
              </div>
              <p className={styles.highlightText}>{highlight.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Keywords Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>🔑 Keywords</h3>
          <span className={styles.count}>{keywords.length} terms</span>
        </div>

        <div className={styles.keywordsList}>
          {keywords.map((keyword, index) => (
            <div key={index} className={styles.keywordChip}>
              {keyword}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChaptersView;

