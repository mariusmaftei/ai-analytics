import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faFileCsv,
  faFileCode,
  faMagnifyingGlass,
  faBolt,
  faLock,
  faBullseye,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { generateAIResponseStream } from "../../services/aiService";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true); // Track if this is the first message
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();

  // Scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatStarted, isTyping]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file) => {
    // Create new session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
    }

    // Prepare file data
    const fileData = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "Unknown",
      uploadTime: new Date().toISOString(),
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
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
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

      // Send only the user message to backend
      // Backend will build the full prompt with system context
      const response = await generateAIResponseStream(
        currentInput, // Just send the user's message
        (chunk) => {
          // Update the last message with the new chunk
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
          temperature: 0.7,
          max_tokens: 2048,
          user_name: "Marius", // Send user context to backend
          is_greeting: isFirstMessage, // Tell backend if this is the first message
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

      // Mark streaming as complete
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === "ai") {
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });
    } catch (error) {
      console.error("AI Error:", error);

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
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  accept=".pdf,.csv,.json"
                />
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload PDF"
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                </button>
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload CSV"
                >
                  <FontAwesomeIcon icon={faFileCsv} />
                </button>
                <button
                  className={styles.bottomUploadIcon}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload JSON"
                >
                  <FontAwesomeIcon icon={faFileCode} />
                </button>
              </div>

              {/* Input Box */}
              <div className={styles.bottomSearchBox}>
                <input
                  type="text"
                  className={styles.bottomInput}
                  placeholder="Ask me anything..."
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
              <input
                type="text"
                className={styles.mainInput}
                placeholder="Ask me anything... (e.g., What can you do?)"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              <button
                className={styles.searchButton}
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            {/* File Upload Icons */}
            <div className={styles.uploadOptions}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className={styles.fileInput}
                accept=".pdf,.csv,.json"
              />
              <button
                className={styles.uploadIcon}
                onClick={() => fileInputRef.current?.click()}
                title="Upload PDF"
              >
                <FontAwesomeIcon icon={faFilePdf} className={styles.iconSvg} />
                <span className={styles.iconLabel}>PDF</span>
              </button>
              <button
                className={styles.uploadIcon}
                onClick={() => fileInputRef.current?.click()}
                title="Upload CSV"
              >
                <FontAwesomeIcon icon={faFileCsv} className={styles.iconSvg} />
                <span className={styles.iconLabel}>CSV</span>
              </button>
              <button
                className={styles.uploadIcon}
                onClick={() => fileInputRef.current?.click()}
                title="Upload JSON"
              >
                <FontAwesomeIcon icon={faFileCode} className={styles.iconSvg} />
                <span className={styles.iconLabel}>JSON</span>
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
                  icon={faMagnifyingGlass}
                  className={styles.featureIcon}
                />
                <span>Detailed Insights</span>
              </div>
              <div className={styles.feature}>
                <FontAwesomeIcon
                  icon={faBullseye}
                  className={styles.featureIcon}
                />
                <span>Accurate Results</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
