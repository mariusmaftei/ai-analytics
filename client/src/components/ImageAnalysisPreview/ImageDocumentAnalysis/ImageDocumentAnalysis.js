import React from "react";
import styles from "./ImageDocumentAnalysis.module.css";

const ImageDocumentAnalysis = ({ data = {}, rawText = "" }) => {
  const sections = data?.sections || [];
  const structureSection = sections.find((section) =>
    section?.name?.toLowerCase().includes("structure") ||
    section?.name?.toLowerCase().includes("layout")
  );
  const fieldsSection = sections.find((section) =>
    section?.name?.toLowerCase().includes("field") ||
    section?.name?.toLowerCase().includes("key value")
  );
  const completenessSection = sections.find((section) =>
    section?.name?.toLowerCase().includes("completeness") ||
    section?.name?.toLowerCase().includes("quality")
  );
  const recommendationsSection = sections.find((section) =>
    section?.name?.toLowerCase().includes("recommendation") ||
    section?.name?.toLowerCase().includes("next")
  );

  const renderKeyValue = (items = []) => (
    <div className={styles.keyValueGrid}>
      {items.map((item, idx) => (
        <div className={styles.keyValueRow} key={`${item.label || idx}-${idx}`}>
          <span className={styles.keyLabel}>{item.label || item.key || "Label"}</span>
          <span className={styles.value}>{item.value || item.text || item.description}</span>
        </div>
      ))}
    </div>
  );

  const renderList = (items = []) => (
    <ul className={styles.list}>
      {items.map((item, idx) => (
        <li key={`${item.label || item.value || idx}-${idx}`}>
          <span className={styles.marker}></span>
          <div>
            {item.label && <strong>{item.label}: </strong>}
            <span>{item.value || item.text || item.description}</span>
          </div>
        </li>
      ))}
    </ul>
  );

  const hasStructured =
    structureSection || fieldsSection || completenessSection || recommendationsSection;

  if (!hasStructured && !rawText.trim()) {
    return <div className={styles.emptyState}>No document analysis available yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Document Analysis</h3>
        <p>Layout, extracted fields, and quality checks</p>
      </div>

      {structureSection && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h4>{structureSection.name}</h4>
            <span>Layout, sections, and hierarchy</span>
          </div>
          {structureSection.items?.length
            ? renderList(structureSection.items)
            : <p className={styles.sectionText}>{structureSection.text}</p>}
        </div>
      )}

      {fieldsSection && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h4>{fieldsSection.name}</h4>
            <span>Recognized fields and values</span>
          </div>
          {fieldsSection.items?.length
            ? renderKeyValue(fieldsSection.items)
            : <p className={styles.sectionText}>{fieldsSection.text}</p>}
        </div>
      )}

      {completenessSection && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h4>{completenessSection.name}</h4>
            <span>Quality and readability checks</span>
          </div>
          {completenessSection.items?.length
            ? renderList(completenessSection.items)
            : <p className={styles.sectionText}>{completenessSection.text}</p>}
        </div>
      )}

      {recommendationsSection && (
        <div className={styles.highlightCard}>
          <div className={styles.sectionHeader}>
            <h4>{recommendationsSection.name}</h4>
            <span>Next steps or cleanup suggestions</span>
          </div>
          {recommendationsSection.items?.length
            ? renderList(recommendationsSection.items)
            : <p className={styles.sectionText}>{recommendationsSection.text}</p>}
        </div>
      )}

      {!hasStructured && rawText.trim() && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h4>AI Notes</h4>
            <span>Raw response preview</span>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageDocumentAnalysis;


