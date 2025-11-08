import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faChartLine,
  faFilter,
  faDownload,
  faFilePdf,
  faFileCsv,
  faFileCode,
  faArrowLeft,
  faChartBar,
  faTable,
  faBolt,
  faBook,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import {
  analyzeFile,
  getAIResponse as getSmartAIResponse,
} from "../../services/dummyDataService";
import DataPreview from "../../components/DataPreview/DataPreview";
import ChaptersView from "../../components/ChaptersView/ChaptersView";
import ChartDisplay from "../../components/ChartDisplay/ChartDisplay";
import styles from "./SessionPage.module.css";

const SessionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSessionId, getCurrentSession } = useSession();

  const session = getCurrentSession();
  const fileData = location.state ||
    session?.files[0] || {
      fileName: "sample-data.csv",
      fileSize: 245000,
      fileType: "text/csv",
    };

  // Analyze file and get dummy data
  const analysisData = analyzeFile(fileData.fileName, fileData.fileType);

  const [inputValue, setInputValue] = useState("");
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: `I've analyzed your ${analysisData.fileType.toUpperCase()} file. Here's what I found:\n\n${
        analysisData.summary
      }\n\n${
        analysisData.hasChapters
          ? `📚 This document has ${analysisData.chapters.length} chapters across ${analysisData.pageCount} pages.`
          : analysisData.fileType === "csv"
          ? `📊 Found ${analysisData.rowCount.toLocaleString()} rows and ${
              analysisData.columnCount
            } columns.`
          : `💾 Found ${analysisData.objectCount} objects with nested data.`
      }\n\nYou can ask me questions, ${
        analysisData.hasNumericData ? "generate visualizations, " : ""
      }or explore the data using the buttons above!`,
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const downloadMenuRef = useRef(null);

  // Scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Close download menu when clicking outside
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

  // Use smart AI responses from dummy data service
  const getAIResponse = (userMessage) => {
    return getSmartAIResponse(userMessage, analysisData);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Store the input value before clearing
    const currentInput = inputValue;

    // Clear input
    setInputValue("");

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI "thinking" time (1-2 seconds)
    const thinkingTime = 1200 + Math.random() * 800; // Random delay between 1.2-2s

    setTimeout(() => {
      // Hide typing indicator
      setIsTyping(false);

      // Get full AI response text
      const fullResponse = getAIResponse(currentInput);

      // Add empty AI message that we'll fill with streaming text
      const aiMessageIndex = messages.length + 1; // +1 for user message already added
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      // Stream the response character by character
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex < fullResponse.length) {
          const chunkSize = Math.floor(Math.random() * 3) + 1; // 1-3 characters at a time
          const chunk = fullResponse.slice(
            currentIndex,
            currentIndex + chunkSize
          );
          currentIndex += chunkSize;

          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === "ai") {
              lastMessage.text = fullResponse.slice(0, currentIndex);
            }
            return newMessages;
          });
        } else {
          // Finished streaming
          clearInterval(streamInterval);
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === "ai") {
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
        }
      }, 15); // 15ms between chunks (2x faster)
    }, thinkingTime);
  };

  const handleGenerateGraphic = () => {
    setShowCharts(!showCharts);
    if (!showCharts) {
      const graphicMessage = {
        type: "ai",
        text: `📊 Generated ${
          analysisData.fileType === "csv" ? "3" : "2"
        } interactive visualizations based on your data. Scroll down to view the charts!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, graphicMessage]);
    }
  };

  const handleShowChapters = () => {
    setShowChapters(!showChapters);
    if (!showChapters) {
      const chaptersMessage = {
        type: "ai",
        text: `📚 Displaying ${analysisData.chapters.length} chapters with summaries, key highlights, and extracted keywords. Scroll down to explore!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, chaptersMessage]);
    }
  };

  const handleViewTable = () => {
    setShowDataPreview(!showDataPreview);
    if (!showDataPreview) {
      const tableMessage = {
        type: "ai",
        text: `📋 Showing ${
          analysisData.fileType === "csv" ? "table preview" : "JSON objects"
        } with ${
          analysisData.fileType === "csv"
            ? analysisData.previewData.length + " sample rows"
            : analysisData.previewData.length + " records"
        }. Scroll down to view the data!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, tableMessage]);
    }
  };

  const handleDownload = (format) => {
    const formatInfo = {
      pdf: "📄 PDF Report - Full analysis with visualizations and insights",
      csv: "📊 CSV File - Raw data in spreadsheet format",
      json: "💾 JSON File - Structured data export",
    };

    const downloadMessage = {
      type: "ai",
      text: `✅ Download started!\n\n${
        formatInfo[format]
      }\n\nFile: ${fileData.fileName.replace(
        /\.[^/.]+$/,
        ""
      )}.${format}\n\n💡 In production, your ${format.toUpperCase()} file would download automatically.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, downloadMessage]);
    setShowDownloadMenu(false);
  };

  const handleQuickAction = (action) => {
    const actions = {
      summary: "Give me a summary of the document",
      revenue: "Show me revenue analysis",
      trends: "What are the key trends?",
      customers: "Tell me about customer data",
    };

    setInputValue(actions[action]);
    // Auto-send after a brief delay
    setTimeout(() => {
      const event = { key: "Enter" };
      setInputValue(actions[action]);
      setTimeout(() => handleSendMessage(), 100);
    }, 100);
  };

  return (
    <div className={styles.container}>
      {/* Header with File Info */}
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

      {/* Action Buttons - Contextual based on file type */}
      <div className={styles.actionBar}>
        {/* Show Generate Graphic only if numeric data exists */}
        {analysisData.hasNumericData && (
          <button
            className={`${styles.actionButton} ${
              showCharts ? styles.active : ""
            }`}
            onClick={handleGenerateGraphic}
          >
            <FontAwesomeIcon icon={faChartLine} />
            <span>{showCharts ? "Hide" : "Generate"} Graphic</span>
          </button>
        )}

        {/* Show Chapters only for PDFs with chapters */}
        {analysisData.hasChapters && (
          <button
            className={`${styles.actionButton} ${
              showChapters ? styles.active : ""
            }`}
            onClick={handleShowChapters}
          >
            <FontAwesomeIcon icon={faBook} />
            <span>{showChapters ? "Hide" : "Show"} Chapters</span>
          </button>
        )}

        {/* Show View Table only for CSV/JSON */}
        {(analysisData.fileType === "csv" ||
          analysisData.fileType === "json") && (
          <button
            className={`${styles.actionButton} ${
              showDataPreview ? styles.active : ""
            }`}
            onClick={handleViewTable}
          >
            <FontAwesomeIcon icon={faTable} />
            <span>{showDataPreview ? "Hide" : "View"} Table</span>
          </button>
        )}

        {/* Download always available */}
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
              <button
                className={styles.downloadOption}
                onClick={() => handleDownload("pdf")}
              >
                <FontAwesomeIcon icon={faFilePdf} />
                <span>PDF Report</span>
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
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          className={styles.quickActionChip}
          onClick={() => handleQuickAction("summary")}
        >
          <FontAwesomeIcon icon={faBolt} />
          Summary
        </button>
        <button
          className={styles.quickActionChip}
          onClick={() => handleQuickAction("revenue")}
        >
          <FontAwesomeIcon icon={faChartBar} />
          Revenue
        </button>
        <button
          className={styles.quickActionChip}
          onClick={() => handleQuickAction("trends")}
        >
          <FontAwesomeIcon icon={faChartLine} />
          Trends
        </button>
        <button
          className={styles.quickActionChip}
          onClick={() => handleQuickAction("customers")}
        >
          <FontAwesomeIcon icon={faTable} />
          Customers
        </button>
      </div>

      {/* Messages Area */}
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
                  {message.text.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < message.text.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  ))}
                  {message.isStreaming && (
                    <span className={styles.streamingCursor}>▊</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
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

          {/* Display Components - Shown when user clicks buttons */}
          {showChapters && analysisData.hasChapters && (
            <ChaptersView
              chapters={analysisData.chapters}
              highlights={analysisData.highlights}
              keywords={analysisData.keywords}
            />
          )}

          {showDataPreview &&
            (analysisData.fileType === "csv" ||
              analysisData.fileType === "json") && (
              <DataPreview analysisData={analysisData} />
            )}

          {showCharts && analysisData.hasNumericData && (
            <ChartDisplay analysisData={analysisData} />
          )}
        </div>
      </div>

      {/* Fixed Bottom Input Area */}
      <div className={styles.bottomInputArea}>
        <div className={styles.bottomInputContainer}>
          {/* Input Box */}
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
