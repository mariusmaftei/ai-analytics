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
  faFile,
  faClock,
  faHeading,
  faUser,
  faLightbulb,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { analyzePDFFile } from "../../services/pdfAnalysisService";
import { analyzeJSONFile } from "../../services/jsonAnalysisService";
import { analyzeCSVFile } from "../../services/csvAnalysisService";
import { analyzeImageFile } from "../../services/imageAnalysisService";
import ImagePreview from "../../components/ImagePreview/ImagePreview";
import styles from "./AnalysisPage.module.css";

const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showLongAnalysisMessage, setShowLongAnalysisMessage] = useState(false);

  const fileData = useMemo(() => location.state || {
    fileName: "sample.pdf",
    fileSize: 0,
    fileType: "application/pdf",
    uploadTime: new Date().toISOString(),
    file: null, // The actual File object
  }, [location.state]);

  // Real PDF analysis with progress simulation
  useEffect(() => {
    if (isAnalyzing && fileData.file) {
      let progressInterval;
      let longAnalysisTimeout;
      let analysisComplete = false;

      // Start the actual analysis based on file type
      const performAnalysis = async () => {
        try {
          let results;
          
          // Check file type and call appropriate analysis function
          const fileName = fileData.fileName.toLowerCase();
          const fileType = fileData.fileType.toLowerCase();
          
          if (fileType.includes('image') || /\.(png|jpg|jpeg|gif|bmp|webp|tiff|tif)$/i.test(fileName)) {
            // Analyze Image file
            results = await analyzeImageFile(fileData.file, {
              analysisType: 'general',
              saveToDb: false,
            });
            // Create object URL for image preview
            if (fileData.file) {
              results.imageUrl = URL.createObjectURL(fileData.file);
            }
          } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
            // Analyze JSON file
            results = await analyzeJSONFile(fileData.file);
          } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
            // Analyze CSV file
            results = await analyzeCSVFile(fileData.file);
          } else {
            // Analyze PDF file (default)
            results = await analyzePDFFile(fileData.file, {
              includeAI: true,
              analysisType: 'summary',
              saveToDb: false,
            });
          }
          
          analysisComplete = true;
          setAnalysisResults(results);
          setProgress(100);
          setIsAnalyzing(false);
          
        } catch (error) {
          console.error('Analysis failed:', error);
          analysisComplete = true;
          setProgress(100);
          setIsAnalyzing(false);
          
          // Show error state
          const fileName = fileData.fileName.toLowerCase();
          const fileTypeStr = fileData.fileType.toLowerCase();
          let fileType = 'PDF';
          if (fileTypeStr.includes('image') || /\.(png|jpg|jpeg|gif|bmp|webp|tiff|tif)$/i.test(fileName)) {
            fileType = 'Image';
          } else if (fileTypeStr === 'application/json' || fileName.endsWith('.json')) {
            fileType = 'JSON';
          } else if (fileTypeStr === 'text/csv' || fileName.endsWith('.csv')) {
            fileType = 'CSV';
          }
          
          setAnalysisResults({
            fileType: fileType,
            error: true,
            message: error.message || `Failed to analyze ${fileType}. Please try again.`,
          });
        } finally {
          // Clear timeout if analysis completes before 12 seconds
          if (longAnalysisTimeout) {
            clearTimeout(longAnalysisTimeout);
          }
          setShowLongAnalysisMessage(false);
        }
      };

      // Show message after 12 seconds if analysis is still running
      longAnalysisTimeout = setTimeout(() => {
        if (!analysisComplete) {
          setShowLongAnalysisMessage(true);
        }
      }, 12000); // 12 seconds (middle of 10-15 range)

      // Simulate progress while waiting for backend
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (analysisComplete || prev >= 90) {
            clearInterval(progressInterval);
            return analysisComplete ? 100 : 90;
          }
          return prev + 10;
        });
      }, 400);

      // Start the actual analysis
      performAnalysis();

      return () => {
        if (progressInterval) clearInterval(progressInterval);
        if (longAnalysisTimeout) clearTimeout(longAnalysisTimeout);
      };
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
    
    // Navigate to session page with BOTH fileData AND analysisResults
    navigate(`/session/${sessionId}`, {
      state: {
        fileData: fileData,
        analysisResults: analysisResults, // Pass the real analysis data!
      },
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
            {showLongAnalysisMessage && (
              <div className={styles.longAnalysisMessage}>
                <FontAwesomeIcon icon={faClock} className={styles.messageIcon} />
                <p>
                  <strong>Large document detected.</strong> This file is taking longer to process. 
                  Please wait while we analyze all the content...
                </p>
              </div>
            )}
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
                  
                  {analysisResults.fileType === "IMAGE" && (
                    <>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faImage} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.width || 0} × {analysisResults.metadata?.height || 0}
                          </div>
                          <div className={styles.statLabel}>Dimensions (px)</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faFile} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.format || 'Unknown'}
                          </div>
                          <div className={styles.statLabel}>Format</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.file_size 
                              ? `${(analysisResults.metadata.file_size / 1024).toFixed(1)} KB`
                              : 'N/A'}
                          </div>
                          <div className={styles.statLabel}>File Size</div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {analysisResults.fileType === "JSON" && (
                    <>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.totalRecords?.toLocaleString() || analysisResults.data?.length || 0}
                          </div>
                          <div className={styles.statLabel}>
                            {analysisResults.metadata?.structureType === 'array' ? 'Records' : 'Object'}
                          </div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faChartLine} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.totalKeys || analysisResults.columns?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Fields/Keys</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faFileLines} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.nestingLevel || 0}
                          </div>
                          <div className={styles.statLabel}>Nesting Levels</div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {analysisResults.fileType === "CSV" && (
                    <>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.totalRows?.toLocaleString() || analysisResults.data?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Total Rows</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faChartLine} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.totalColumns || analysisResults.columns?.length || 0}
                          </div>
                          <div className={styles.statLabel}>Columns</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faFileLines} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.hasHeaders ? 'Yes' : 'No'}
                          </div>
                          <div className={styles.statLabel}>Has Headers</div>
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
                        <div className={styles.insightIcon}>
                          <FontAwesomeIcon icon={faLightbulb} />
                        </div>
                        <div className={styles.insightText}>
                          {analysisResults.insights.summary}
                        </div>
                      </div>
                    )}
                    {analysisResults.insights?.patterns?.slice(0, 3).map((pattern, idx) => {
                      // Determine icon based on pattern content
                      let icon = faChartLine; // Default icon
                      
                      if (pattern.toLowerCase().includes('page')) {
                        icon = faFile;
                      } else if (pattern.toLowerCase().includes('reading time') || pattern.toLowerCase().includes('minute')) {
                        icon = faClock;
                      } else if (pattern.toLowerCase().includes('title')) {
                        icon = faHeading;
                      } else if (pattern.toLowerCase().includes('author')) {
                        icon = faUser;
                      }
                      
                      return (
                        <div key={idx} className={styles.insightItem}>
                          <div className={styles.insightIcon}>
                            <FontAwesomeIcon icon={icon} />
                          </div>
                          <div className={styles.insightText}>{pattern}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Image Preview */}
                {analysisResults.fileType === "IMAGE" && analysisResults.imageUrl && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Image Preview</h3>
                    <ImagePreview
                      imageUrl={analysisResults.imageUrl}
                      metadata={analysisResults.metadata}
                      alt={fileData.fileName}
                    />
                  </div>
                )}

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

                {analysisResults.fileType === "JSON" && analysisResults.data && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Data Structure Preview</h3>
                    <div className={styles.dataPreview}>
                      <div className={styles.columnsList}>
                        {analysisResults.columns?.slice(0, 8).map((col, idx) => (
                          <span key={idx} className={styles.columnBadge}>{col}</span>
                        ))}
                        {analysisResults.columns?.length > 8 && (
                          <span className={styles.columnBadge}>+{analysisResults.columns.length - 8} more fields</span>
                        )}
                      </div>
                      <div className={styles.rowsInfo}>
                        {analysisResults.metadata?.structureType === 'array' 
                          ? `${analysisResults.data.length} of ${analysisResults.metadata?.totalRecords?.toLocaleString() || analysisResults.data.length} records previewed`
                          : 'Single object structure with nested data'}
                        {analysisResults.metadata?.nestingLevel > 1 && ` • ${analysisResults.metadata.nestingLevel} levels of nesting`}
                      </div>
                    </div>
                  </div>
                )}
                
                {analysisResults.fileType === "CSV" && analysisResults.data && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.sectionTitle}>Data Preview</h3>
                    <div className={styles.dataPreview}>
                      <div className={styles.columnsList}>
                        {analysisResults.columns?.slice(0, 8).map((col, idx) => (
                          <span key={idx} className={styles.columnBadge}>
                            {col || `Column ${idx + 1}`}
                          </span>
                        ))}
                        {analysisResults.columns?.length > 8 && (
                          <span className={styles.columnBadge}>+{analysisResults.columns.length - 8} more columns</span>
                        )}
                      </div>
                      <div className={styles.rowsInfo}>
                        {analysisResults.data.length} of {analysisResults.metadata?.totalRows?.toLocaleString() || analysisResults.data.length} rows previewed
                        {analysisResults.metadata?.hasHeaders && ' • Headers detected'}
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
