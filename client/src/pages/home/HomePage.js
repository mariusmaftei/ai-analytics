import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faFileCsv,
  faImage,
  faMagnifyingGlass,
  faBolt,
  faLock,
  faCheckCircle,
  faChartLine,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { generateAIResponseStream } from "../../services/aiService";
import Modal from "../../components/Shared/Modal/Modal";
import StreamingText from "../../components/Shared/StreamingText/StreamingText";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const mainTextareaRef = useRef(null);
  const bottomTextareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();

  const streamingBufferRef = useRef("");

  // Scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatStarted, isTyping]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Auto-resize textarea up to 6 lines, then show scrollbar
    const textarea = e.target;
    textarea.style.height = "auto";
    const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight);
    const currentHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${currentHeight}px`;

    // Check if input has reached 6+ lines (when scrollHeight >= maxHeight)
    const hasReachedMaxLines = textarea.scrollHeight >= maxHeight;
    setIsInputExpanded(hasReachedMaxLines);
  };

  // Validate file type
  const validateFileType = (file, expectedType) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf(".") + 1);

    const validExtensions = {
      pdf: ["pdf"],
      csv: ["csv"],
      image: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"],
    };

    const validMimeTypes = {
      pdf: ["application/pdf"],
      csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
      image: [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/bmp",
        "image/webp",
        "image/tiff",
      ],
    };

    const extensions = validExtensions[expectedType] || [];
    const mimeTypes = validMimeTypes[expectedType] || [];

    // Check extension
    const hasValidExtension = extensions.includes(fileExtension);

    // Check MIME type (if available)
    const hasValidMimeType =
      file.type &&
      mimeTypes.some((mime) =>
        file.type.toLowerCase().includes(mime.toLowerCase())
      );

    // For CSV, also check if it's a text file with .csv extension
    const isCSVTextFile =
      expectedType === "csv" &&
      (file.type === "text/plain" || !file.type) &&
      fileExtension === "csv";

    return hasValidExtension || hasValidMimeType || isCSVTextFile;
  };

  const handleFileSelect = (e, expectedType) => {
    const file = e.target.files[0];
    if (file) {
      if (validateFileType(file, expectedType)) {
        handleFileUpload(file);
      } else {
        const typeNames = {
          pdf: "PDF",
          csv: "CSV",
          image: "Image",
        };
        setErrorMessage(
          `Please upload a ${typeNames[expectedType]} file. You selected "${file.name}" which is not a valid ${typeNames[expectedType]} file.`
        );
        setShowErrorModal(true);
        // Reset the input
        e.target.value = "";
      }
    }
  };

  const handleFileUpload = (file) => {
    // Validate file size (10MB limit for beta)
    const MAX_FILE_SIZE_MB = 10;
    const fileSizeMB = file.size / (1024 * 1024);
    
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setErrorMessage(
        `File size (${fileSizeMB.toFixed(1)}MB) exceeds the beta limit of ${MAX_FILE_SIZE_MB}MB. Please use a smaller file.`
      );
      setShowErrorModal(true);
      return;
    }

    // Create new session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
    }

    // Prepare file data with the actual File object
    const fileData = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "Unknown",
      uploadTime: new Date().toISOString(),
      file: file, // Pass the actual File object for backend upload
    };

    // Add file to session
    addFileToSession(sessionId, fileData);

    // Navigate to analysis page first (user sees results, then proceeds to session)
    navigate("/analysis", {
      state: fileData,
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Try to detect file type from extension
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf(".") + 1);

      let expectedType = null;
      if (
        ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"].includes(
          fileExtension
        )
      )
        expectedType = "image";
      else if (fileExtension === "pdf") expectedType = "pdf";
      else if (fileExtension === "csv") expectedType = "csv";

      if (expectedType && validateFileType(file, expectedType)) {
        handleFileUpload(file);
      } else {
        setErrorMessage(
          `Please upload an Image, PDF, or CSV file. You dropped "${file.name}" which is not a supported file type.`
        );
        setShowErrorModal(true);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Start chat mode
    if (!chatStarted) {
      setChatStarted(true);
    }

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
    setIsInputExpanded(false);

    // Reset textarea height
    if (mainTextareaRef.current) {
      mainTextareaRef.current.style.height = "auto";
    }
    if (bottomTextareaRef.current) {
      bottomTextareaRef.current.style.height = "auto";
    }

    // Show typing indicator
    setIsTyping(true);

    try {
      // Short delay to show typing indicator
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Hide typing indicator
      setIsTyping(false);

      // Add empty AI message that we'll fill with streaming text
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      // Initialize streaming buffer
      streamingBufferRef.current = "";

      // Send only the user message to backend
      // Backend will build the full prompt with system context
      const response = await generateAIResponseStream(
        currentInput,
        (chunk) => {
          // Accumulate chunks in buffer
          streamingBufferRef.current += chunk;
          
          // Update message text in real-time for streaming effect
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === "ai" && lastMessage.isStreaming) {
              lastMessage.text = streamingBufferRef.current;
            }
            return newMessages;
          });
        },
        {
          temperature: 0.7,
          max_tokens: 2048,
          user_name: null,
          is_greeting: isFirstMessage,
        }
      );

      // After first message, set to false
      if (isFirstMessage) {
        setIsFirstMessage(false);
      }

      // Check if we got a valid response
      if (!response || response.trim() === "") {
        throw new Error("Empty response from AI");
      }

      // Final update - ensure all text is displayed and mark streaming as complete
      const finalText = streamingBufferRef.current || response;

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.text = finalText;
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

      // Clear buffer
      streamingBufferRef.current = "";
    } catch (error) {
      console.error("AI Error:", error);

      // Clear buffer
      streamingBufferRef.current = "";

      // Hide typing indicator
      setIsTyping(false);

      // Remove the empty AI message that was added
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        // If the last message is an empty AI message, remove it
        if (
          lastMessage &&
          lastMessage.type === "ai" &&
          lastMessage.text === ""
        ) {
          return newMessages.slice(0, -1);
        }
        return newMessages;
      });

      // Add a proper error message
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "⚠️ AI Chat Service Unavailable\n\nI'm unable to connect to the AI service right now. This could mean:\n\n• The backend server isn't running\n• There's a network connection issue\n• The AI service is temporarily down\n\nPlease check that the backend server is running and try again.\n\nNeed help? Make sure you've run:\n```\ncd app\npython main.py\n```",
          timestamp: new Date(),
          isStreaming: false,
          isError: true,
        },
      ]);
    }
  };

  return (
    <div
      className={`${styles.container} ${chatStarted ? styles.chatMode : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Chat Mode Layout */}
      {chatStarted ? (
        <>
          {/* Messages Area */}
          <div className={styles.chatMessagesArea}>
            <div className={styles.messagesWrapper}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${
                    message.type === "user"
                      ? styles.userMessage
                      : styles.aiMessage
                  }`}
                >
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <strong>
                        {message.type === "user" ? "You" : "AI Assistant"}
                      </strong>
                    </div>
                    <div
                      className={`${styles.messageText} ${
                        message.isError ? styles.errorMessage : ""
                      }`}
                    >
                      <StreamingText
                        key={`${index}-${message.timestamp?.getTime() || index}`}
                        text={message.text}
                        isStreaming={message.isStreaming}
                        speed={30}
                        showCursor={message.isStreaming}
                      />
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
              {/* File Upload Icons */}
              <div className={styles.bottomUploadOptions}>
                <input
                  ref={imageInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e, "image")}
                  className={styles.fileInput}
                  accept="image/*"
                />
                <input
                  ref={pdfInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e, "pdf")}
                  className={styles.fileInput}
                  accept=".pdf,application/pdf"
                />
                <input
                  ref={csvInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e, "csv")}
                  className={styles.fileInput}
                  accept=".csv,text/csv,application/vnd.ms-excel"
                />
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => imageInputRef.current?.click()}
                  title="Upload Image - Visual analysis"
                >
                  <FontAwesomeIcon icon={faImage} />
                </button>
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => pdfInputRef.current?.click()}
                  title="Upload PDF - Document analysis"
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                </button>
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => csvInputRef.current?.click()}
                  title="Upload CSV - Spreadsheet data"
                >
                  <FontAwesomeIcon icon={faFileCsv} />
                </button>
              </div>

              {/* Input Box */}
              <div className={styles.bottomSearchBox}>
                <textarea
                  ref={bottomTextareaRef}
                  className={`${styles.bottomInput} ${
                    isInputExpanded ? styles.expanded : ""
                  }`}
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  rows={1}
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
        </>
      ) : (
        /* Initial Centered Layout */
        <div className={styles.content}>
          {/* Hero Section */}
          <div className={styles.hero}>
            <h1 className={styles.title}>AI Analysis Assistant</h1>
            <p className={styles.subtitle}>
              Ask me anything or upload a file to analyze
            </p>
          </div>

          {/* Main Input Area */}
          <div className={styles.inputSection}>
            <div className={styles.searchBox}>
              <textarea
                ref={mainTextareaRef}
                className={`${styles.mainInput} ${
                  isInputExpanded ? styles.expanded : ""
                }`}
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                rows={1}
              />
              <button
                className={styles.searchButton}
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            {/* File Upload Icons - Positioned below input */}
            <div className={styles.uploadOptionsInline}>
              <input
                ref={imageInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e, "image")}
                className={styles.fileInput}
                accept="image/*"
              />
              <input
                ref={pdfInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e, "pdf")}
                className={styles.fileInput}
                accept=".pdf,application/pdf"
              />
              <input
                ref={csvInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e, "csv")}
                className={styles.fileInput}
                accept=".csv,text/csv,application/vnd.ms-excel"
              />
              <button
                className={styles.uploadIconInline}
                onClick={() => imageInputRef.current?.click()}
                title="Upload Image - Visual analysis (PNG, JPG, GIF, etc.)"
              >
                <FontAwesomeIcon icon={faImage} />
              </button>
              <button
                className={styles.uploadIconInline}
                onClick={() => pdfInputRef.current?.click()}
                title="Upload PDF - Document analysis"
              >
                <FontAwesomeIcon icon={faFilePdf} />
              </button>
              <button
                className={styles.uploadIconInline}
                onClick={() => csvInputRef.current?.click()}
                title="Upload CSV - Spreadsheet data"
              >
                <FontAwesomeIcon icon={faFileCsv} />
              </button>
            </div>
          </div>

          {/* Features Overview */}
          <div className={styles.featuresSection}>
            <div className={styles.featuresList}>
              <div className={styles.feature}>
                <FontAwesomeIcon icon={faBolt} className={styles.featureIcon} />
                <span>Fast Analysis</span>
              </div>
              <div className={styles.feature}>
                <FontAwesomeIcon icon={faLock} className={styles.featureIcon} />
                <span>Secure Processing</span>
              </div>
              <div className={styles.feature}>
                <FontAwesomeIcon
                  icon={faChartLine}
                  className={styles.featureIcon}
                />
                <span>Detailed Insights</span>
              </div>
              <div className={styles.feature}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className={styles.featureIcon}
                />
                <span>Accurate Results</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Invalid File Type"
        message={errorMessage}
        type="warning"
        icon={faExclamationTriangle}
        confirmText="OK"
        cancelText={null}
      />
    </div>
  );
};

export default HomePage;
