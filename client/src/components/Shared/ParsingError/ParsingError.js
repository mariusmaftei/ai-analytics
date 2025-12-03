import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faCode } from "@fortawesome/free-solid-svg-icons";
import styles from "./ParsingError.module.css";

const ParsingError = ({ 
  message = "Failed to parse analysis data",
  showRawData = false,
  rawData = null,
  onShowRawData = null
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className={styles.parsingError}>
      <div className={styles.errorContent}>
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className={styles.errorIcon}
        />
        <h3 className={styles.errorTitle}>Parsing Error</h3>
        <p className={styles.errorMessage}>{message}</p>
        
        {showRawData && rawData && (
          <div className={styles.rawDataSection}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={styles.toggleButton}
              type="button"
            >
              <FontAwesomeIcon icon={faCode} />
              {showDetails ? "Hide" : "Show"} Raw Data
            </button>
            
            {showDetails && (
              <pre className={styles.rawData}>
                {typeof rawData === "string" 
                  ? rawData.substring(0, 2000) 
                  : JSON.stringify(rawData, null, 2).substring(0, 2000)}
                {((typeof rawData === "string" && rawData.length > 2000) ||
                  (typeof rawData === "object" && JSON.stringify(rawData).length > 2000)) && (
                  <span className={styles.truncated}>... (truncated)</span>
                )}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParsingError;

