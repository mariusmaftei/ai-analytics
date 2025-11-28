import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCode, faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import styles from "./JSONPreview.module.css";

const JSONPreview = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const formatJSON = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return String(obj);
    }
  };

  const handleCopy = async () => {
    try {
      const jsonString = formatJSON(data);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faFileCode} className={styles.emptyIcon} />
          <p>No data available to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FontAwesomeIcon icon={faFileCode} />
          <h3>JSON Preview</h3>
        </div>
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          title="Copy JSON to clipboard"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <div className={styles.jsonContent}>
        <pre className={styles.jsonCode}>
          <code>{formatJSON(data)}</code>
        </pre>
      </div>
    </div>
  );
};

export default JSONPreview;

