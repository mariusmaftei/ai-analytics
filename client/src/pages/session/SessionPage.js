import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faDownload,
  faFilePdf,
  faFileCsv,
  faFileCode,
  faArrowLeft,
  faBook,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { chatAboutDocument } from "../../services/documentChatService";
import styles from "./SessionPage.module.css";

const SessionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSessionId, getCurrentSession } = useSession();

  const session = getCurrentSession();
  
  // Get fileData and analysisResults from location state (passed from AnalysisPage)
  const locationState = location.state || {};
  const fileData = locationState.fileData || session?.files[0] || {
    fileName: "sample-data.pdf",
    fileSize: 245000,
    fileType: "application/pdf",
  };
  
  // Use REAL analysis data passed from AnalysisPage
  const analysisData = locationState.analysisResults || {
    fileType: 'PDF',
    metadata: { totalPages: 0, wordCount: 0 },
    text: '',
    insights: { summary: 'No analysis available', patterns: [] },
  };

  const [inputValue, setInputValue] = useState("");
  const [showChapters, setShowChapters] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "ai",
      text: `I've analyzed your ${analysisData.fileType || 'PDF'} file. Here's what I found:\n\n${
        analysisData.insights?.summary || 'Analysis complete'
      }\n\n${
        analysisData.metadata?.totalPages
          ? `📄 This document has ${analysisData.metadata.totalPages} pages with approximately ${analysisData.metadata.wordCount?.toLocaleString()} words.`
          : ''
      }\n\nYou can ask me questions about the content, request specific information, or explore the data using the buttons above!`,
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef(null);
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

    // Show typing indicator briefly
    setIsTyping(true);

    // Add empty AI message for streaming
    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        text: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      // Use REAL AI chat with document context
      await chatAboutDocument(
        currentInput,
        analysisData.text || '',
        {
          filename: fileData.fileName,
          totalPages: analysisData.metadata?.totalPages,
          wordCount: analysisData.metadata?.wordCount,
          title: analysisData.metadata?.title,
          author: analysisData.metadata?.author,
        },
        (chunk) => {
          // Hide typing indicator on first chunk
          setIsTyping(false);
          
          // Update the streaming message with new chunk
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === "ai") {
              lastMessage.text += chunk;
            }
            return newMessages;
          });
        },
        {
          user_name: 'Marius',
          temperature: 0.7,
          max_tokens: 2048,
        }
      );

      // Mark streaming as complete
      setIsTyping(false);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      // Show error message
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.text = "⚠️ I'm having trouble connecting to the AI service. Please make sure the backend is running and try again.";
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });
    }
  };

  const handleShowChapters = () => {
    setShowChapters(!showChapters);
    if (!showChapters) {
      const chaptersMessage = {
        type: "ai",
        text: `📚 Chapter extraction is coming soon! This will break down your document into sections.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, chaptersMessage]);
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
        {/* Show Chapters for PDF documents */}
        {analysisData.fileType === "PDF" && (
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
