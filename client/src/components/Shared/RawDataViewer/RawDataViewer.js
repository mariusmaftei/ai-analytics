import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import styles from './RawDataViewer.module.css';

/**
 * RawDataViewer Component
 * Displays raw AI response data with copy functionality
 */
const RawDataViewer = ({ rawText, title = 'Raw AI Response' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!rawText) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatText = (text) => {
    // Try to format as JSON if it looks like JSON
    try {
      const json = JSON.parse(text);
      return JSON.stringify(json, null, 2);
    } catch {
      // Not JSON, return as-is
      return text;
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Hide raw data' : 'Show raw data'}
      >
        <FontAwesomeIcon icon={faCode} />
        <span>{title}</span>
        <span className={styles.chevron}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.info}>
              This is the raw response from the AI. Use this for debugging if
              parsing fails.
            </span>
            <button
              className={styles.copyButton}
              onClick={handleCopy}
              aria-label="Copy raw data"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className={styles.codeBlock}>
            <code>{formatText(rawText)}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default RawDataViewer;

