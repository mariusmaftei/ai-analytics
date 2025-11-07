import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSpinner,
  faCheckCircle,
  faChartBar,
  faFileLines,
  faMagnifyingGlass,
  faTriangleExclamation,
  faDownload,
  faShare,
  faFileArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AnalysisPage.module.css";

const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);

  const fileData = location.state || {
    fileName: "sample.pdf",
    fileSize: 0,
    fileType: "application/pdf",
    uploadTime: new Date().toISOString(),
  };

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAnalyzing(false);
            return 100;
          }
          return prev + 10;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  // Mock analysis data
  const analysisResults = {
    summary: {
      title: "Analysis Complete",
      status: "Success",
      confidence: 95,
      processingTime: "2.3s",
    },
    keyFindings: [
      {
        icon: faChartBar,
        title: "Document Structure",
        value: "Well-formatted with clear sections",
        confidence: 98,
      },
      {
        icon: faFileLines,
        title: "Content Quality",
        value: "High readability score",
        confidence: 92,
      },
      {
        icon: faMagnifyingGlass,
        title: "Data Extraction",
        value: "Successfully extracted text and metadata",
        confidence: 95,
      },
      {
        icon: faTriangleExclamation,
        title: "Issues Found",
        value: "No critical issues detected",
        confidence: 100,
      },
    ],
    statistics: [
      { label: "Total Pages", value: "12" },
      { label: "Word Count", value: "3,245" },
      { label: "Images", value: "8" },
      { label: "Tables", value: "3" },
    ],
    sentiment: {
      positive: 65,
      neutral: 25,
      negative: 10,
    },
    categories: [
      { name: "Technical", percentage: 45 },
      { name: "Business", percentage: 30 },
      { name: "General", percentage: 25 },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate("/")}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <div className={styles.fileInfo}>
            <h1 className={styles.fileName}>{fileData.fileName}</h1>
            <p className={styles.fileDetails}>
              {(fileData.fileSize / 1024).toFixed(2)} KB • {fileData.fileType}
            </p>
          </div>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className={styles.progressSection}>
            <div className={styles.progressIcon}>
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
            <h2 className={styles.progressTitle}>Analyzing your file...</h2>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className={styles.progressText}>{progress}% Complete</p>
          </div>
        )}

        {/* Analysis Results */}
        {!isAnalyzing && (
          <div className={styles.results}>
            {/* Summary Section */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.statusIcon}>
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div>
                  <h2 className={styles.summaryTitle}>
                    {analysisResults.summary.title}
                  </h2>
                  <p className={styles.summaryStatus}>
                    Status: {analysisResults.summary.status} •{" "}
                    {analysisResults.summary.confidence}% Confidence
                  </p>
                </div>
              </div>
              <div className={styles.summaryStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Processing Time</span>
                  <span className={styles.statValue}>
                    {analysisResults.summary.processingTime}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Timestamp</span>
                  <span className={styles.statValue}>
                    {new Date(fileData.uploadTime).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Key Findings</h3>
              <div className={styles.findingsGrid}>
                {analysisResults.keyFindings.map((finding, index) => (
                  <div key={index} className={styles.findingCard}>
                    <div className={styles.findingIcon}>
                      <FontAwesomeIcon icon={finding.icon} />
                    </div>
                    <div className={styles.findingContent}>
                      <h4 className={styles.findingTitle}>{finding.title}</h4>
                      <p className={styles.findingValue}>{finding.value}</p>
                      <div className={styles.confidenceBar}>
                        <div
                          className={styles.confidenceFill}
                          style={{ width: `${finding.confidence}%` }}
                        ></div>
                      </div>
                      <p className={styles.confidenceText}>
                        {finding.confidence}% confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Document Statistics</h3>
              <div className={styles.statsGrid}>
                {analysisResults.statistics.map((stat, index) => (
                  <div key={index} className={styles.statCard}>
                    <span className={styles.statCardLabel}>{stat.label}</span>
                    <span className={styles.statCardValue}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment Analysis Chart */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Sentiment Analysis</h3>
              <div className={styles.chartCard}>
                <div className={styles.sentimentChart}>
                  <div
                    className={styles.sentimentBar}
                    style={{
                      width: `${analysisResults.sentiment.positive}%`,
                      background: "var(--success-color)",
                    }}
                  >
                    <span className={styles.sentimentLabel}>
                      Positive {analysisResults.sentiment.positive}%
                    </span>
                  </div>
                  <div
                    className={styles.sentimentBar}
                    style={{
                      width: `${analysisResults.sentiment.neutral}%`,
                      background: "var(--text-secondary)",
                    }}
                  >
                    <span className={styles.sentimentLabel}>
                      Neutral {analysisResults.sentiment.neutral}%
                    </span>
                  </div>
                  <div
                    className={styles.sentimentBar}
                    style={{
                      width: `${analysisResults.sentiment.negative}%`,
                      background: "var(--error-color)",
                    }}
                  >
                    <span className={styles.sentimentLabel}>
                      Negative {analysisResults.sentiment.negative}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Distribution */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Content Categories</h3>
              <div className={styles.chartCard}>
                {analysisResults.categories.map((category, index) => (
                  <div key={index} className={styles.categoryRow}>
                    <span className={styles.categoryName}>{category.name}</span>
                    <div className={styles.categoryBar}>
                      <div
                        className={styles.categoryFill}
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <span className={styles.categoryPercent}>
                      {category.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button className={styles.actionButton} onClick={() => navigate("/")}>
                <FontAwesomeIcon icon={faFileArrowUp} /> Analyze Another File
              </button>
              <button className={styles.actionButtonSecondary}>
                <FontAwesomeIcon icon={faDownload} /> Download Report
              </button>
              <button className={styles.actionButtonSecondary}>
                <FontAwesomeIcon icon={faShare} /> Share Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;

