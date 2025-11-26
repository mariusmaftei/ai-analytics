import React from "react";
import styles from "./ImageSceneAnalysis.module.css";

const ImageSceneAnalysis = ({ data = {}, rawText = "" }) => {
  const sections = data?.sections || [];

  const findSection = (keywords = []) =>
    sections.find((section) =>
      keywords.some((name) =>
        section?.name?.toLowerCase().includes(name.toLowerCase())
      )
    );

  const setting = findSection(["scene", "setting", "environment"]);
  const mood = findSection(["mood", "tone", "atmosphere"]);
  const time = findSection(["time", "lighting", "weather"]);
  const activity = findSection(["activity", "events", "action"]);
  const camera = findSection(["camera", "perspective", "view"]);

  const renderSection = (section, fallbackSubtitle) => {
    if (!section) return null;
    const items = section.items || [];
    return (
      <div className={styles.sectionCard} key={section.name}>
        <div className={styles.sectionHeader}>
          <h4>{section.name}</h4>
          <span>{section.subtitle || fallbackSubtitle}</span>
        </div>
        {items.length > 0 ? (
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
        ) : (
          section.text && <p className={styles.sectionText}>{section.text}</p>
        )}
      </div>
    );
  };

  const hasStructured = setting || mood || time || activity || camera;

  if (!hasStructured && !rawText.trim()) {
    return <div className={styles.emptyState}>No scene context available yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Scene Analysis</h3>
        <p>Environment, context, and story framing</p>
      </div>

      {renderSection(setting, "Where does the scene take place?")}
      {renderSection(mood, "Atmosphere, tone, feelings")}
      {renderSection(time, "Time of day, lighting, weather")}
      {renderSection(activity, "What is happening?")}
      {renderSection(camera, "Perspective, focal length, depth")}

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

export default ImageSceneAnalysis;


