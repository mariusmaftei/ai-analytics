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
  faImage,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { analyzePDFFile } from "../../services/pdfAnalysisService";
import { analyzeJSONFile } from "../../services/jsonAnalysisService";
import { analyzeCSVFile } from "../../services/csvAnalysisService";
import { analyzeImageFile } from "../../services/imageAnalysisService";
import ImagePreview from "../../components/Layout/ImagePreview/ImagePreview";
import styles from "./AnalysisPage.module.css";

// Helper function to parse and structure insights text
const parseInsightsText = (text) => {
  if (!text) return [];
  
  let cleanedText = text;
  cleanedText = cleanedText.replace(/```json[\s\S]*?```/g, '');
  cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '');
  
  const sections = [];
  const lines = cleanedText.split('\n').filter(line => line.trim());
  
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for numbered sections like "1. **Title**: content"
    const numberedMatch = line.match(/^(\d+)\.\s*\*\*(.*?)\*\*:\s*(.*)$/);
    if (numberedMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentContent.join(' ').trim()
        });
      }
      // Start new section
      currentSection = {
        number: numberedMatch[1],
        title: numberedMatch[2].trim(),
        content: numberedMatch[3].trim()
      };
      currentContent = numberedMatch[3].trim() ? [numberedMatch[3].trim()] : [];
      continue;
    }
    
    // Check for bold titles without numbers like "**Title**: content"
    const boldMatch = line.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
    if (boldMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentContent.join(' ').trim()
        });
      }
      // Start new section
      currentSection = {
        title: boldMatch[1].trim(),
        content: boldMatch[2].trim()
      };
      currentContent = boldMatch[2].trim() ? [boldMatch[2].trim()] : [];
      continue;
    }
    
    // If we have a current section, add line to content
    if (currentSection) {
      // Check if this line starts a new section (next line starts with number or bold)
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const isNextSection = /^(\d+)\.\s*\*\*/.test(nextLine) || /^\*\*/.test(nextLine);
      
      if (!isNextSection) {
        // Clean up markdown bold markers and add to content
        const cleanedLine = line.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        if (cleanedLine) {
          currentContent.push(cleanedLine);
        }
      } else {
        // Next line is a new section, save current and reset
        sections.push({
          ...currentSection,
          content: currentContent.join(' ').trim()
        });
        currentSection = null;
        currentContent = [];
      }
    } else {
      // No section yet, treat as standalone content
      const cleanedLine = line.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      if (cleanedLine) {
        sections.push({
          title: null,
          content: cleanedLine
        });
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    sections.push({
      ...currentSection,
      content: currentContent.join(' ').trim() || currentSection.content
    });
  }
  
  return sections;
};

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
          
          // Extract error message and type - handle multiple error formats
          let errorMessage = '';
          let isLimitError = false;
          
          console.log('Error object:', error);
          console.log('Error response:', error.response);
          
          // Try multiple ways to extract error message
          if (error.response?.data) {
            // Axios error with response.data
            if (typeof error.response.data === 'object') {
              errorMessage = error.response.data.message || error.response.data.error || '';
              isLimitError = error.response.data.error_type === 'limit_exceeded' || 
                           error.response.data.status === 'error' && 
                           /exceeds|limit|maximum|beta|pages|size|words/i.test(errorMessage);
            } else if (typeof error.response.data === 'string') {
              errorMessage = error.response.data;
            }
          }
          
          // Fallback to error.message
          if (!errorMessage && error.message) {
            errorMessage = error.message;
          }
          
          // Check if it's a timeout error
          const isTimeoutError = errorMessage.includes('timeout') || 
                                errorMessage.includes('timed out') ||
                                error.code === 'ECONNABORTED';
          
          // Check if message indicates a limit error (if not already detected)
          if (!isLimitError && errorMessage && !isTimeoutError) {
            isLimitError = /exceeds|limit|maximum|beta|pages|size|words|30 pages|10MB|50,000 words/i.test(errorMessage);
          }
          
          // Handle timeout errors specifically
          if (isTimeoutError) {
            if (fileType === 'PDF') {
              errorMessage = 'Processing this PDF is taking too long. The file may be too large or complex. Please try a smaller document (under 50,000 words and 10MB) or split it into multiple files.';
              isLimitError = true;
            } else {
              errorMessage = 'Processing is taking too long. Please try a smaller file.';
            }
          } else if (!errorMessage || errorMessage === 'document closed' || errorMessage.includes('document closed')) {
            // Generic error - check if it might be a limit issue
            if (fileType === 'PDF') {
              errorMessage = 'This PDF file could not be processed. It may exceed the beta testing limits (50,000 words or 10MB). Please try a smaller document.';
              isLimitError = true;
            } else {
              errorMessage = `Failed to analyze ${fileType}. Please try again.`;
            }
          }
          
          // Enhance limit error messages to be more explicit
          if (isLimitError) {
            // Prioritize word count over page count
            const wordMatch = errorMessage.match(/([\d,]+)\s*words?/i);
            const sizeMatch = errorMessage.match(/(\d+\.?\d*)\s*MB/i);
            const pageMatch = errorMessage.match(/(\d+)\s*pages?/i);
            
            if (wordMatch) {
              const wordCount = parseInt(wordMatch[1].replace(/,/g, ''));
              if (wordCount > 50000) {
                const pagesInfo = pageMatch ? ` (after ${pageMatch[1]} pages)` : '';
                errorMessage = `This PDF contains ${wordMatch[1]} words${pagesInfo}, which exceeds the beta limit of 50,000 words. Please use a smaller document or split it into multiple files.`;
              }
            } else if (sizeMatch && parseFloat(sizeMatch[1]) > 10) {
              errorMessage = `File size (${sizeMatch[1]}MB) exceeds the beta limit of 10MB. Please use a smaller file.`;
            } else if (pageMatch && parseInt(pageMatch[1]) > 30) {
              // Page count is now just informational, not a hard limit
              errorMessage = `This PDF contains ${pageMatch[1]} pages. While page count is not a hard limit, please ensure the document contains less than 50,000 words and is under 10MB.`;
            } else if (!errorMessage.includes('exceeds') && !errorMessage.includes('limit')) {
              errorMessage = `This file exceeds the beta testing limits. Maximum allowed: 50,000 words or 10MB file size. Please use a smaller document.`;
            }
          }
          
          setAnalysisResults({
            fileType: fileType,
            error: true,
            isLimitError: isLimitError,
            message: errorMessage,
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

            {/* Error Display */}
            {analysisResults?.error && (
              <div className={`${styles.errorContainer} ${analysisResults.isLimitError ? styles.limitErrorContainer : ''}`}>
                <div className={styles.errorIcon}>
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <h2 className={styles.errorTitle}>
                  {analysisResults.isLimitError ? 'File Limit Exceeded' : 'Analysis Failed'}
                </h2>
                <div className={styles.errorMessage}>
                  {analysisResults.message || 'An error occurred while analyzing your file. Please try again.'}
                </div>
                {analysisResults.isLimitError && (
                  <div className={styles.limitInfo}>
                    <p><strong>Beta Testing Limits:</strong></p>
                    <ul>
                      <li>Maximum <strong>50,000 words</strong> per PDF</li>
                      <li>Maximum <strong>10MB</strong> file size</li>
                    </ul>
                    <p className={styles.limitSuggestion}>
                      Word count is the primary limit. PDFs with many pages but few words are acceptable. Please split your document into smaller files or use a document with less text content.
                    </p>
                  </div>
                )}
                <button 
                  className={styles.retryButton} 
                  onClick={() => navigate('/')}
                >
                  Go Back
                </button>
              </div>
            )}

            {/* Analysis Results Preview */}
            {analysisResults && !analysisResults.error && (
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
                        <FontAwesomeIcon icon={faChartLine} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.wordCount?.toLocaleString() || 
                             (analysisResults.text ? analysisResults.text.split(/\s+/).length.toLocaleString() : 0)}
                          </div>
                          <div className={styles.statLabel}>Total Words</div>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FontAwesomeIcon icon={faDatabase} className={styles.statIcon} />
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {analysisResults.metadata?.sectionCount || 0}
                          </div>
                          <div className={styles.statLabel}>Sections Found</div>
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
                    {analysisResults.insights?.summary && (() => {
                      const parsedSections = parseInsightsText(analysisResults.insights.summary);
                      
                      // If we have structured sections, render them
                      if (parsedSections.length > 0) {
                        return parsedSections.map((section, idx) => (
                          <div key={idx} className={styles.insightItem}>
                            <div className={styles.insightContent}>
                              {section.title && (
                                <div className={styles.insightTitle}>
                                  {section.number && <span className={styles.insightNumber}>{section.number}.</span>}
                                  <strong>{section.title}</strong>
                                </div>
                              )}
                              {section.content && (
                                <div className={styles.insightDescription}>
                                  {section.content}
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                      }
                      
                      // Fallback: render as simple text if parsing didn't work
                      // Parse markdown bold and split by lines
                      let fallbackText = analysisResults.insights.summary;
                      fallbackText = fallbackText.replace(/```json[\s\S]*?```/g, '');
                      fallbackText = fallbackText.replace(/```[\s\S]*?```/g, '');
                      const lines = fallbackText.split('\n').filter(l => l.trim());
                      return lines.map((line, lineIdx) => {
                        // Parse bold text
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={lineIdx} className={styles.insightItem}>
                            <div className={styles.insightContent}>
                              <div className={styles.insightDescription}>
                                {parts.map((part, partIdx) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                                  }
                                  return <span key={partIdx}>{part}</span>;
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {analysisResults.insights?.patterns?.slice(0, 3).map((pattern, idx) => (
                      <div key={idx} className={styles.insightItem}>
                        <div className={styles.insightContent}>
                          <div className={styles.insightDescription}>{pattern}</div>
                        </div>
                      </div>
                    ))}
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
                      showControls={false}
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
