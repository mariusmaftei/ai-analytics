import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faDownload,
  faFilePdf,
  faFileCsv,
  faFileCode,
  faImage,
  faArrowLeft,
  faTable,
  faLightbulb,
  faMicrophone,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { chatAboutDocument } from "../../services/documentChatService";
import StreamingText from "../../components/Shared/StreamingText/StreamingText";
import CSVPreview from "../../components/Layout/CSVPreview/CSVPreview";
import JSONPreview from "../../components/Layout/JSONPreview/JSONPreview";
import ImagePreview from "../../components/Layout/ImagePreview/ImagePreview";
import PDFPreview from "../../components/Layout/PDFPreview/PDFPreview";
import AudioPlayer from "../../components/Layout/AudioPlayer/AudioPlayer";
import InsightGenerator from "../../components/InsightGenerator/InsightGenerator";
import ImageInsightGenerator from "../../components/ImageInsightGenerator/ImageInsightGenerator";
import CSVInsightGenerator from "../../components/CSVInsightGenerator/CSVInsightGenerator";
import PDFInsightGenerator from "../../components/PDFInsightGenerator/PDFInsightGenerator";
import AudioInsightGenerator from "../../components/AudioInsightGenerator/AudioInsightGenerator";
import {
  generatePDFReport,
  generateCSVExport,
  generateJSONExport,
  generateAudioTranscriptionTXT,
  generateAudioTranscriptionPDF,
  generateAudioReportPDF,
  generateAudioJSONExport,
} from "../../utils/pdfGenerator";
import styles from "./SessionPage.module.css";

const SessionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getCurrentSession } = useSession();

  const session = getCurrentSession();

  const locationState = location.state || {};
  const fileData = useMemo(() => 
    locationState.fileData ||
    session?.files[0] || {
      fileName: "sample-data.pdf",
      fileSize: 245000,
      fileType: "application/pdf",
    }, [locationState.fileData, session?.files]);

  const analysisData = useMemo(() => 
    locationState.analysisResults || {
      fileType: "PDF",
      metadata: { totalPages: 0, wordCount: 0 },
      text: "",
      insights: { summary: "No analysis available", patterns: [] },
    }, [locationState.analysisResults]);

  const isImage = analysisData.fileType === "IMAGE";
  const isCSV = analysisData.fileType === "CSV";
  const isPDF = analysisData.fileType === "PDF";
  const isAudio = analysisData.fileType === "AUDIO";

  const [inputValue, setInputValue] = useState("");
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [showJSONPreview, setShowJSONPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const [showInsightGenerator, setShowInsightGenerator] = useState(false);
  const [showImageInsightGenerator, setShowImageInsightGenerator] =
    useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const getWelcomeMessage = () => {
    const fileType = analysisData.fileType || "document";
    const fileName = fileData.fileName || "your file";

    if (isImage) {
      let message = `**Image Analysis Complete**\n\n`;
      message += `I've successfully analyzed your image: **${fileName}**\n\n`;

      const stats = [];
      if (analysisData.metadata?.width && analysisData.metadata?.height) {
        stats.push(
          `${analysisData.metadata.width} × ${analysisData.metadata.height} px`
        );
      }
      if (analysisData.metadata?.format) {
        stats.push(`${analysisData.metadata.format.toUpperCase()}`);
      }
      if (fileData.fileSize) {
        stats.push(`${(fileData.fileSize / 1024).toFixed(2)} KB`);
      }

      if (stats.length > 0) {
        message += `**Image Info:** ${stats.join(" • ")}\n\n`;
      }

      message += `**What would you like to do next?**\n\n`;
      message += `**Image Analysis** - Click the "Image Analysis" button above to get detailed visual analysis, object detection, text extraction, or scene understanding.\n\n`;
      message += `**Ask Questions** - Type your question below to get specific information about the image content.\n\n`;
      message += `**View Image** - Use the "Show Image Preview" button to view the image with metadata.`;

      return message;
    }

    let message = `Hello! Welcome to your document analysis session.\n\n`;
    message += `I've successfully analyzed your ${fileType} file: [[${fileName}]]. `;
    
    const stats = [];
    if (analysisData.metadata?.totalPages) {
      stats.push(
        `${analysisData.metadata.totalPages} page${
          analysisData.metadata.totalPages !== 1 ? "s" : ""
        }`
      );
    }
    if (analysisData.metadata?.wordCount) {
      stats.push(`${analysisData.metadata.wordCount.toLocaleString()} words`);
    }
    if (analysisData.data && analysisData.fileType === "CSV") {
      stats.push(
        `${analysisData.data.length} row${
          analysisData.data.length !== 1 ? "s" : ""
        }`
      );
    }

    if (stats.length > 0) {
      message += `The document contains ${stats.join(" • ")}. `;
    }

    message += `You can now explore the analysis results, ask questions about the content, or generate detailed insights.\n\n`;
    message += `**What would you like to do next?**\n\n`;
    message += `**Generate Insights** - Click the [[Generate Insights]] button above to get AI-powered analysis, patterns, and key findings.\n\n`;
    message += `**Ask Questions** - Type your question below to get specific information about the document content.\n\n`;
    message += `**Explore Data** - Use the preview buttons above to view tables, JSON data, or document structure.`;

    return message;
  };

  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: getWelcomeMessage(),
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const streamingBufferRef = useRef("");

  const csvPreviewTables = useMemo(() => {
    if (
      analysisData.fileType === "PDF" &&
      analysisData.tables &&
      analysisData.tables.length > 0
    ) {
      return analysisData.tables;
    }

    if (
      analysisData.fileType === "CSV" &&
      analysisData.data &&
      analysisData.data.length > 0
    ) {
      const columns =
        analysisData.columns || Object.keys(analysisData.data[0] || {});
      const tableData = [
        columns,
        ...analysisData.data.map((row) => columns.map((col) => row[col] || "")),
      ];

      return [
        {
          data: tableData,
          rows: analysisData.data.length,
          columns: columns.length,
          page: "N/A",
        },
      ];
    }

    return null;
  }, [analysisData]);

  const jsonPreviewData = useMemo(() => {
    if (analysisData.fileType === "CSV" && analysisData.data) {
      return analysisData.data;
    }

    return {
      fileInfo: {
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
      },
      metadata: analysisData.metadata || {},
      insights: analysisData.insights || {},
      tables: analysisData.tables || [],
      text: analysisData.text
        ? analysisData.text.substring(0, 1000) + "..."
        : "",
    };
  }, [analysisData, fileData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target)
      ) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDownloadMenu]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputValue;

    setInputValue("");

    setIsTyping(true);

    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        text: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    streamingBufferRef.current = "";

    try {
      await chatAboutDocument(
        currentInput,
        analysisData.text || "",
        {
          filename: fileData.fileName,
          totalPages: analysisData.metadata?.totalPages,
          wordCount: analysisData.metadata?.wordCount,
          title: analysisData.metadata?.title,
          author: analysisData.metadata?.author,
          document_id: analysisData.documentId || analysisData.dbId,
        },
        (chunk) => {
          setIsTyping(false);
          streamingBufferRef.current += chunk;
        },
        {
          user_name: null,
          temperature: 0.7,
          max_tokens: 2048,
        }
      );

      const finalText = streamingBufferRef.current;

      setIsTyping(false);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.text = finalText;
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

      streamingBufferRef.current = "";
    } catch (error) {
      streamingBufferRef.current = "";

      setIsTyping(false);

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.text =
            "⚠️ I'm having trouble connecting to the AI service. Please make sure the backend is running and try again.";
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });
    }
  };

  const handleDownload = (format) => {
    try {
      const fileName = fileData.fileName.replace(/\.[^/.]+$/, "");
      let formatInfo = {};

      if (isAudio) {
        // Audio-specific download options
        formatInfo = {
          transcription_txt: "📝 Transcription - Plain text transcript",
          transcription_pdf: "📄 Transcription PDF - Formatted transcript with timestamps",
          report_pdf: "📋 Analysis Report - Complete analysis summary",
          json: "💾 Analysis Data - Structured JSON export",
        };

        if (format === "transcription_txt") {
          generateAudioTranscriptionTXT(fileData, analysisData);
        } else if (format === "transcription_pdf") {
          generateAudioTranscriptionPDF(fileData, analysisData);
        } else if (format === "report_pdf") {
          generateAudioReportPDF(fileData, analysisData, messages);
        } else if (format === "json") {
          generateAudioJSONExport(fileData, analysisData, messages);
        }
      } else {
        // PDF/CSV/JSON downloads for other file types
        formatInfo = {
          pdf: "📄 PDF Data - Document data with tables, metadata, and insights",
          csv: "📊 CSV File - Raw data in spreadsheet format",
          json: "💾 JSON File - Structured data export",
        };

        if (format === "pdf") {
          generatePDFReport(fileData, analysisData, messages);
        } else if (format === "csv") {
          generateCSVExport(fileData, analysisData, messages);
        } else if (format === "json") {
          generateJSONExport(fileData, analysisData, messages);
        }
      }

      const downloadMessage = {
        type: "ai",
        text: `✅ Download started!\n\n${formatInfo[format]}\n\nFile: ${fileName}_${format}.${format.includes('pdf') ? 'pdf' : format.includes('json') ? 'json' : 'txt'}\n\nThe file should download automatically.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, downloadMessage]);
      setShowDownloadMenu(false);
    } catch (error) {
      const errorMessage = {
        type: "ai",
        text: `⚠️ Error generating ${format.toUpperCase()} file. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setShowDownloadMenu(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sessionHeader}>
        <button className={styles.backButton} onClick={() => navigate("/home")}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Home</span>
        </button>
        <div className={styles.fileInfo}>
          <FontAwesomeIcon
            icon={
              fileData.fileType.includes("pdf")
                ? faFilePdf
                : fileData.fileType.includes("csv")
                ? faFileCsv
                : fileData.fileType.includes("image") ||
                  analysisData.fileType === "IMAGE"
                ? faImage
                : faFileCode
            }
            className={styles.fileIcon}
          />
          <div className={styles.fileDetails}>
            <h2>{fileData.fileName}</h2>
            <p>{(fileData.fileSize / 1024).toFixed(2)} KB</p>
          </div>
        </div>
      </div>

      <div className={styles.actionBar}>
        {isImage && (
          <button
            className={`${styles.actionButton} ${
              showImageInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowImageInsightGenerator(!showImageInsightGenerator);
              if (!showImageInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById(
                    "image-insight-generator-section"
                  );
                  if (insightSection) {
                    insightSection.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faImage} />
            <span>{showImageInsightGenerator ? "Hide" : "Image"} Analysis</span>
          </button>
        )}

        {isPDF && (
          <button
            className={`${styles.actionButton} ${
              showInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowInsightGenerator(!showInsightGenerator);
              if (!showInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById(
                    "pdf-insight-generator-section"
                  );
                  if (insightSection) {
                    insightSection.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>{showInsightGenerator ? "Hide" : "Generate"} Insights</span>
          </button>
        )}

        {!isImage && !isCSV && !isPDF && (
          <button
            className={`${styles.actionButton} ${
              showInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowInsightGenerator(!showInsightGenerator);
              if (!showInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById(
                    "insight-generator-section"
                  );
                  if (insightSection) {
                    insightSection.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>{showInsightGenerator ? "Hide" : "Generate"} Insights</span>
          </button>
        )}

        {isCSV && (
          <button
            className={`${styles.actionButton} ${
              showInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowInsightGenerator(!showInsightGenerator);
              if (!showInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById(
                    "csv-insight-generator-section"
                  );
                  if (insightSection) {
                    insightSection.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>{showInsightGenerator ? "Hide" : "Generate"} Insights</span>
          </button>
        )}

        {analysisData.fileType === "IMAGE" && analysisData.imageUrl && (
          <button
            className={`${styles.actionButton} ${
              showImagePreview ? styles.active : ""
            }`}
            onClick={() => setShowImagePreview(!showImagePreview)}
          >
            <FontAwesomeIcon icon={faImage} />
            <span>{showImagePreview ? "Hide" : "Show"} Image Preview</span>
          </button>
        )}

        {analysisData.fileType === "PDF" && (
          <button
            className={`${styles.actionButton} ${
              showPDFPreview ? styles.active : ""
            }`}
            onClick={() => setShowPDFPreview(!showPDFPreview)}
          >
            <FontAwesomeIcon icon={faFilePdf} />
            <span>{showPDFPreview ? "Hide" : "Show"} PDF Preview</span>
          </button>
        )}

        {analysisData.fileType === "AUDIO" && (
          <button
            className={`${styles.actionButton} ${
              showAudioPreview ? styles.active : ""
            }`}
            onClick={() => setShowAudioPreview(!showAudioPreview)}
          >
            <FontAwesomeIcon icon={faMicrophone} />
            <span>{showAudioPreview ? "Hide" : "Show"} Audio Player</span>
          </button>
        )}

        {!isImage &&
          ((analysisData.fileType === "PDF" &&
            analysisData.hasTables &&
            analysisData.tables &&
            analysisData.tables.length > 0) ||
            (analysisData.fileType === "CSV" &&
              analysisData.data &&
              analysisData.data.length > 0)) && (
            <button
              className={`${styles.actionButton} ${
                showCSVPreview ? styles.active : ""
              }`}
              onClick={() => setShowCSVPreview(!showCSVPreview)}
            >
              <FontAwesomeIcon icon={faTable} />
              <span>{showCSVPreview ? "Hide" : "Show"} CSV Preview</span>
            </button>
          )}

        {!isImage && (
          <button
            className={`${styles.actionButton} ${
              showJSONPreview ? styles.active : ""
            }`}
            onClick={() => setShowJSONPreview(!showJSONPreview)}
          >
            <FontAwesomeIcon icon={faFileCode} />
            <span>{showJSONPreview ? "Hide" : "Show"} JSON Preview</span>
          </button>
        )}

        {!isImage && (
          <div className={styles.downloadContainer} ref={downloadMenuRef}>
            <button
              className={styles.actionButton}
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download</span>
            </button>

            {showDownloadMenu && (
              <div className={styles.downloadMenu}>
                {isAudio ? (
                  <>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("transcription_txt")}
                    >
                      <FontAwesomeIcon icon={faFileCode} />
                      <span>Transcription (TXT)</span>
                    </button>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("transcription_pdf")}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                      <span>Transcription (PDF)</span>
                    </button>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("report_pdf")}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                      <span>Analysis Report (PDF)</span>
                    </button>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("json")}
                    >
                      <FontAwesomeIcon icon={faFileCode} />
                      <span>Analysis Data (JSON)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("pdf")}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                      <span>PDF Data</span>
                    </button>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("csv")}
                    >
                      <FontAwesomeIcon icon={faFileCsv} />
                      <span>CSV Data</span>
                    </button>
                    <button
                      className={styles.downloadOption}
                      onClick={() => handleDownload("json")}
                    >
                      <FontAwesomeIcon icon={faFileCode} />
                      <span>JSON Data</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showCSVPreview && csvPreviewTables && (
        <div className={styles.csvPreviewSection}>
          <CSVPreview tables={csvPreviewTables} />
        </div>
      )}

      {showImagePreview && analysisData.imageUrl && (
        <div className={styles.imagePreviewSection}>
          <ImagePreview
            imageUrl={analysisData.imageUrl}
            metadata={analysisData.metadata}
            alt={fileData.fileName}
          />
        </div>
      )}

      {showPDFPreview && isPDF && (
        <div className={styles.pdfPreviewSection}>
          <PDFPreview
            file={
              fileData.file ||
              session?.files?.find((f) => f.fileName === fileData.fileName)
                ?.file ||
              locationState.file
            }
            totalPages={analysisData.metadata?.totalPages}
            fileName={fileData.fileName}
          />
        </div>
      )}

      {showAudioPreview && isAudio && (
        <div className={styles.audioPreviewSection}>
          <AudioPlayer
            file={
              fileData.file ||
              session?.files?.find((f) => f.fileName === fileData.fileName)
                ?.file ||
              locationState.file
            }
            audioUrl={analysisData.audioUrl}
            fileName={fileData.fileName}
            metadata={analysisData.metadata}
          />
        </div>
      )}

      {showJSONPreview && (
        <div className={styles.jsonPreviewSection}>
          <JSONPreview data={jsonPreviewData} />
        </div>
      )}

      {showImageInsightGenerator && isImage && (
        <div
          id="image-insight-generator-section"
          className={styles.insightGeneratorSection}
        >
          <ImageInsightGenerator
            fileData={fileData}
            analysisData={analysisData}
            imageFile={
              fileData.file ||
              session?.files?.find((f) => f.fileName === fileData.fileName)
                ?.file
            }
          />
        </div>
      )}

      {showInsightGenerator && isCSV && (
        <div
          id="csv-insight-generator-section"
          className={styles.insightGeneratorSection}
        >
          <CSVInsightGenerator
            fileData={fileData}
            analysisData={analysisData}
          />
        </div>
      )}

      {showInsightGenerator && isPDF && (
        <div
          id="pdf-insight-generator-section"
          className={styles.insightGeneratorSection}
        >
          <PDFInsightGenerator
            fileData={fileData}
            analysisData={analysisData}
          />
        </div>
      )}

      {showInsightGenerator && isAudio && (
        <div
          id="audio-insight-generator-section"
          className={styles.insightGeneratorSection}
        >
          <AudioInsightGenerator
            fileData={fileData}
            analysisData={analysisData}
          />
        </div>
      )}

      {showInsightGenerator && !isImage && !isCSV && !isPDF && !isAudio && (
        <div
          id="insight-generator-section"
          className={styles.insightGeneratorSection}
        >
          <InsightGenerator
            fileData={fileData}
            analysisData={analysisData}
            tables={analysisData.tables || []}
          />
        </div>
      )}

      <div className={styles.chatMessagesArea}>
        <div className={styles.messagesWrapper}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.message} ${
                message.type === "user" ? styles.userMessage : styles.aiMessage
              }`}
            >
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <strong>
                    {message.type === "user" ? "You" : "AI Assistant"}
                  </strong>
                </div>
                <div className={styles.messageText}>
                  {message.isStreaming ? (
                    <StreamingText
                      text={message.text}
                      isStreaming={message.isStreaming}
                      speed={30}
                      showCursor={true}
                    />
                  ) : (
                    message.text.split("\n").map((line, i) => {
                      // Split by both **bold** and [[green key]] patterns
                      const parts = line.split(/(\*\*.*?\*\*|\[\[.*?\]\])/g);
                      return (
                        <React.Fragment key={i}>
                          {parts.map((part, j) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith("[[") && part.endsWith("]]")) {
                              return (
                                <span key={j} className={styles.greenKey}>
                                  {part.slice(2, -2)}
                                </span>
                              );
                            }
                            return <span key={j}>{part}</span>;
                          })}
                          {i < message.text.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <strong>AI Assistant</strong>
                </div>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={styles.bottomInputArea}>
        <div className={styles.bottomInputContainer}>
          <div className={styles.bottomSearchBox}>
            <input
              type="text"
              className={styles.bottomInput}
              placeholder="Ask me about the data..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              className={styles.bottomSendButton}
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPage;
