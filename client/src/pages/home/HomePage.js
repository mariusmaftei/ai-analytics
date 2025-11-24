import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faFileCsv,
  faFileCode,
  faImage,
  faMagnifyingGlass,
  faBolt,
  faLock,
  faCheckCircle,
  faPaperclip,
  faChartLine,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { generateAIResponseStream } from "../../services/aiService";
import Modal from "../../components/UI/Modal/Modal";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expectedFileType, setExpectedFileType] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const pdfInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const mainTextareaRef = useRef(null);
  const bottomTextareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();

  // Smooth streaming refs
  const streamingBufferRef = useRef("");
  const displayedTextRef = useRef("");
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isStreamingActiveRef = useRef(false);

  // Smooth streaming update function - reveals text character by character
  const updateStreamingMessage = useCallback(() => {
    if (!isStreamingActiveRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const targetBuffer = streamingBufferRef.current;
    const currentDisplayed = displayedTextRef.current;

    // Update every 50ms for natural typing speed (~20-25 chars per second)
    if (timeSinceLastUpdate >= 50) {
      const remaining = targetBuffer.length - currentDisplayed.length;

      if (remaining > 0) {
        // Calculate base characters to reveal
        const baseChars = Math.max(1, Math.floor(timeSinceLastUpdate / 40));

        // Try to reveal up to the end of the next word for smoother appearance
        let charsToReveal = Math.min(baseChars, remaining);
        const nextCharIndex = currentDisplayed.length + charsToReveal;

        // If we're in the middle of a word and there's more text, try to complete the word
        if (nextCharIndex < targetBuffer.length) {
          const nextChar = targetBuffer[nextCharIndex];
          const isWordChar = /[a-zA-Z0-9]/.test(nextChar);
          const currentChar = targetBuffer[nextCharIndex - 1];
          const isCurrentWordChar = /[a-zA-Z0-9]/.test(currentChar);

          // If we're in a word, try to complete it (up to reasonable limit)
          if (isCurrentWordChar && isWordChar && charsToReveal < 15) {
            const nextSpace = targetBuffer.indexOf(" ", nextCharIndex);
            const nextNewline = targetBuffer.indexOf("\n", nextCharIndex);
            const nextBreak =
              nextSpace === -1
                ? nextNewline
                : nextNewline === -1
                ? nextSpace
                : Math.min(nextSpace, nextNewline);

            if (nextBreak !== -1 && nextBreak - currentDisplayed.length <= 20) {
              charsToReveal = nextBreak - currentDisplayed.length + 1;
            }
          }
        }

        charsToReveal = Math.min(charsToReveal, remaining);
        displayedTextRef.current = targetBuffer.substring(
          0,
          currentDisplayed.length + charsToReveal
        );

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (
            lastMessage &&
            lastMessage.type === "ai" &&
            lastMessage.isStreaming
          ) {
            lastMessage.text = displayedTextRef.current;
          }
          return newMessages;
        });

        lastUpdateTimeRef.current = now;
      }
    }

    // Continue updating if there's more to reveal or more chunks coming
    if (isStreamingActiveRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateStreamingMessage);
    }
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
      json: ["json"],
      image: ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"],
    };

    const validMimeTypes = {
      pdf: ["application/pdf"],
      csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
      json: ["application/json", "text/json"],
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
          json: "JSON",
          image: "Image",
        };
        setExpectedFileType(typeNames[expectedType]);
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
      if (fileExtension === "pdf") expectedType = "pdf";
      else if (fileExtension === "csv") expectedType = "csv";
      else if (fileExtension === "json") expectedType = "json";
      else if (
        ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"].includes(
          fileExtension
        )
      )
        expectedType = "image";

      if (expectedType && validateFileType(file, expectedType)) {
        handleFileUpload(file);
      } else {
        setExpectedFileType("PDF, CSV, JSON, or Image");
        setErrorMessage(
          `Please upload a PDF, CSV, JSON, or Image file. You dropped "${file.name}" which is not a supported file type.`
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

      // Initialize streaming buffers and state
      streamingBufferRef.current = "";
      displayedTextRef.current = "";
      lastUpdateTimeRef.current = Date.now();
      isStreamingActiveRef.current = true;

      // Start the smooth streaming animation loop
      animationFrameRef.current = requestAnimationFrame(updateStreamingMessage);

      // Send only the user message to backend
      // Backend will build the full prompt with system context
      const response = await generateAIResponseStream(
        currentInput,
        (chunk) => {
          // Accumulate chunks in buffer without triggering re-render
          streamingBufferRef.current += chunk;
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

      // Stop streaming animation
      isStreamingActiveRef.current = false;

      // Wait a bit for any remaining characters to be revealed smoothly
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Final update - ensure all text is displayed and mark streaming as complete
      const finalText = streamingBufferRef.current || response;
      displayedTextRef.current = finalText;

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.text = finalText;
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

      // Clear buffers
      streamingBufferRef.current = "";
      displayedTextRef.current = "";
    } catch (error) {
      console.error("AI Error:", error);

      // Stop streaming animation
      isStreamingActiveRef.current = false;

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Clear buffers
      streamingBufferRef.current = "";
      displayedTextRef.current = "";

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
              {/* File Upload Icons */}
              <div className={styles.bottomUploadOptions}>
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
                <input
                  ref={jsonInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e, "json")}
                  className={styles.fileInput}
                  accept=".json,application/json"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e, "image")}
                  className={styles.fileInput}
                  accept="image/*"
                />
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
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => jsonInputRef.current?.click()}
                  title="Upload JSON - Structured data"
                >
                  <FontAwesomeIcon icon={faFileCode} />
                </button>
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => imageInputRef.current?.click()}
                  title="Upload Image - Visual analysis"
                >
                  <FontAwesomeIcon icon={faImage} />
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
              <input
                ref={jsonInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e, "json")}
                className={styles.fileInput}
                accept=".json,application/json"
              />
              <input
                ref={imageInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e, "image")}
                className={styles.fileInput}
                accept="image/*"
              />
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
              <button
                className={styles.uploadIconInline}
                onClick={() => jsonInputRef.current?.click()}
                title="Upload JSON - Structured data"
              >
                <FontAwesomeIcon icon={faFileCode} />
              </button>
              <button
                className={styles.uploadIconInline}
                onClick={() => imageInputRef.current?.click()}
                title="Upload Image - Visual analysis (PNG, JPG, GIF, etc.)"
              >
                <FontAwesomeIcon icon={faImage} />
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
