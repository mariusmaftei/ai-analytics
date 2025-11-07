import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faCheckCircle,
  faFileLines,
  faChartLine,
  faDatabase,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { analyzeFile } from "../../services/dummyDataService";
import styles from "./AnalysisPage.module.css";

const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);

  const fileData = useMemo(() => location.state || {
    fileName: "sample.pdf",
    fileSize: 0,
    fileType: "application/pdf",
    uploadTime: new Date().toISOString(),
  }, [location.state]);

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAnalyzing(false);
            // Generate analysis results when complete
            const results = analyzeFile(fileData.fileName, fileData.fileType);
            setAnalysisResults(results);
            return 100;
          }
          return prev + 10;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isAnalyzing, fileData]);

  // Handle proceed to session
  const handleViewResults = () => {
    // Get or create session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
      addFileToSession(sessionId, fileData);
    }
    
    // Navigate to session page
    navigate(`/session/${sessionId}`, {
      state: fileData,
      replace: true,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* File Info Header */}
        <div className={styles.fileInfo}>
          <h1 className={styles.fileName}>{fileData.fileName}</h1>
          <p className={styles.fileDetails}>
            {(fileData.fileSize / 1024).toFixed(2)} KB • {fileData.fileType}
          </p>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing ? (
          <div className={styles.progressSection}>
            <div className={styles.progressIcon}>
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
            <h2 className={styles.progressTitle}>Analyzing your file...</h2>
            <p className={styles.progressSubtitle}>
              Extracting data, identifying patterns, and preparing insights
            </p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className={styles.progressText}>{progress}% Complete</p>
          </div>
        ) : (
          <>
            {/* Success Header */}
            <div className={styles.successHeader}>
              <div className={styles.successIcon}>
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h2 className={styles.successTitle}>Analysis Complete!</h2>
              <p className={styles.successSubtitle}>
                Here's what we found in your file
              </p>
            </div>

            {/* Analysis Results Preview */}
            {analysisResults && (
              <div className={styles.resultsContainer}>
                {/* Key Statistics */}
                <div className={styles.statsGrid}>
                  {analysisResults.fileType === "PDF" && (
                    <>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faFileLines} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.totalPages || 0}
                          </div>
                          <div className={styles.statLabel}>Total Pages</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.chapters?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Chapters Found</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faChartLine} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.wordCount?.toLocaleString() || 0}
                          </div>
                          <div className={styles.statLabel}>Total Words</div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {(analysisResults.fileType === "CSV" || analysisResults.fileType === "JSON") && (
                    <>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.data?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Total Rows</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faChartLine} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.columns?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Columns</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faFileLines} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.insights?.patterns?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Patterns Found</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Key Insights */}
                <div className={styles.insightsSection}>
                  <h3 className={styles.sectionTitle}>Key Insights</h3>
                  <div className={styles.insightsList}>
                    {analysisResults.insights?.summary && (
                      <div className={styles.insightItem}>
                        <div className={styles.insightIcon}>💡</div>
                        <div className={styles.insightText}>
                          {analysisResults.insights.summary}
                        </div>
                      </div>
                    )}
                    {analysisResults.insights?.patterns?.slice(0, 3).map((pattern, idx) => (
                      <div key={idx} className={styles.insightItem}>
                        <div className={styles.insightIcon}>📊</div>
                        <div className={styles.insightText}>{pattern}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Data */}
                {analysisResults.fileType === "PDF" && analysisResults.chapters && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Chapter Overview (Preview)</h3>
                    <div className={styles.chaptersList}>
                      {analysisResults.chapters.slice(0, 3).map((chapter, idx) => (
                        <div key={idx} className={styles.chapterPreview}>
                          <div className={styles.chapterNumber}>Chapter {chapter.number}</div>
                          <div className={styles.chapterTitle}>{chapter.title}</div>
                          <div className={styles.chapterPages}>{chapter.pages} pages</div>
                        </div>
                      ))}
                      {analysisResults.chapters.length > 3 && (
                        <div className={styles.moreItems}>
                          +{analysisResults.chapters.length - 3} more chapters
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(analysisResults.fileType === "CSV" || analysisResults.fileType === "JSON") && analysisResults.data && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Data Preview</h3>
                    <div className={styles.dataPreview}>
                      <div className={styles.columnsList}>
                        {analysisResults.columns?.slice(0, 5).map((col, idx) => (
                          <span key={idx} className={styles.columnBadge}>{col}</span>
                        ))}
                        {analysisResults.columns?.length > 5 && (
                          <span className={styles.columnBadge}>+{analysisResults.columns.length - 5} more</span>
                        )}
                      </div>
                      <div className={styles.rowsInfo}>
                        First {Math.min(10, analysisResults.data.length)} of {analysisResults.data.length} rows ready to explore
                      </div>
                    </div>
                  </div>
                )}

                {/* Call to Action */}
                <div className={styles.ctaSection}>
                  <p className={styles.ctaText}>
                    <strong>Want to dive deeper?</strong> Access the full Session Workspace to:
                  </p>
                  <ul className={styles.featuresList}>
                    <li>💬 Chat with AI about your data</li>
                    <li>📈 Generate interactive visualizations</li>
                    <li>🔍 Filter and explore all data</li>
                    <li>💾 Download processed results</li>
                  </ul>
                  <button className={styles.viewResultsButton} onClick={handleViewResults}>
                    Open Session Workspace
                    <FontAwesomeIcon icon={faArrowRight} className={styles.buttonIcon} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
