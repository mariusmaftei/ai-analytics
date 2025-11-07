import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTable } from "@fortawesome/free-solid-svg-icons";
import styles from "./DataPreview.module.css";

const DataPreview = ({ analysisData }) => {
  if (analysisData.fileType === 'csv') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <FontAwesomeIcon icon={faTable} />
          <h3>Data Preview</h3>
          <span className={styles.rowCount}>
            {analysisData.rowCount.toLocaleString()} rows total
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {analysisData.columns.map((col, index) => (
                  <th key={index}>
                    {col.name}
                    <span className={styles.colType}>{col.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysisData.previewData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          Showing {analysisData.previewData.length} of {analysisData.rowCount.toLocaleString()} rows
        </div>
      </div>
    );
  }

  if (analysisData.fileType === 'json') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <FontAwesomeIcon icon={faTable} />
          <h3>JSON Data Preview</h3>
          <span className={styles.rowCount}>
            {analysisData.objectCount} objects
          </span>
        </div>

        <div className={styles.jsonWrapper}>
          {analysisData.previewData.map((item, index) => (
            <div key={index} className={styles.jsonCard}>
              <div className={styles.jsonHeader}>Object {index + 1}</div>
              <pre className={styles.jsonContent}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          Showing {analysisData.previewData.length} of {analysisData.objectCount} objects
        </div>
      </div>
    );
  }

  return null;
};

export default DataPreview;

