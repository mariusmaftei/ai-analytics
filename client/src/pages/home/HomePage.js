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
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { currentSessionId, createNewSession, addFileToSession } = useSession();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatStarted]);

  // Get AI response based on user question
  const getAIResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    // What can you do / capabilities
    if (
      lowerMessage.includes("what can you do") ||
      lowerMessage.includes("capabilities") ||
      lowerMessage.includes("what do you do") ||
      lowerMessage.includes("help")
    ) {
      return "I can help you analyze various types of files! Here's what I can do:\n\n• 📄 PDF Analysis - Extract and analyze text, tables, and data from PDF documents\n• 📊 CSV Data Analysis - Analyze spreadsheets, visualize data, and find insights\n• 💾 JSON Processing - Parse and analyze JSON data structures\n\nSimply upload your file above, and I'll provide detailed analysis and insights!";
    }

    // What formats
    if (
      lowerMessage.includes("format") ||
      lowerMessage.includes("file type") ||
      lowerMessage.includes("what files") ||
      lowerMessage.includes("support")
    ) {
      return "I currently support three file formats:\n\n✅ PDF (.pdf) - For document analysis\n✅ CSV (.csv) - For data analysis and visualization\n✅ JSON (.json) - For structured data processing\n\nJust drag and drop your file or click the upload buttons above to get started!";
    }

    // How to use
    if (
      lowerMessage.includes("how") ||
      lowerMessage.includes("use") ||
      lowerMessage.includes("start") ||
      lowerMessage.includes("get started")
    ) {
      return "Getting started is easy! Here's how:\n\n1. Upload a file by clicking one of the upload buttons (PDF, CSV, or JSON) above\n2. Or drag and drop your file anywhere on the page\n3. I'll automatically create a session and start analyzing your file\n4. You'll see detailed results including summaries, key findings, and insights\n5. All your sessions are saved in the sidebar on the left\n\nTry uploading a file now to see it in action!";
    }

    // PDF specific
    if (lowerMessage.includes("pdf")) {
      return "PDF Analysis features:\n\n• Extract all text content from your PDFs\n• Identify and extract tables and structured data\n• Summarize lengthy documents\n• Find key information and insights\n• Support for multi-page documents\n\nUpload your PDF file to start analyzing!";
    }

    // CSV specific
    if (lowerMessage.includes("csv") || lowerMessage.includes("data")) {
      return "CSV Data Analysis features:\n\n• Statistical analysis of your data\n• Data visualization and charts\n• Identify trends and patterns\n• Find correlations in your datasets\n• Summary statistics (mean, median, etc.)\n\nUpload your CSV file to explore your data!";
    }

    // JSON specific
    if (lowerMessage.includes("json")) {
      return "JSON Processing features:\n\n• Parse and validate JSON structure\n• Extract nested data\n• Analyze data patterns\n• Format and beautify JSON\n• Identify schema and data types\n\nUpload your JSON file to start processing!";
    }

    // Is it secure / privacy
    if (
      lowerMessage.includes("secure") ||
      lowerMessage.includes("safe") ||
      lowerMessage.includes("privacy") ||
      lowerMessage.includes("security")
    ) {
      return "Your data security and privacy are my top priorities!\n\n🔒 Secure Processing - All files are processed securely\n🚫 No Storage - Your files are not permanently stored\n🔐 Private Sessions - Your analysis sessions are private\n✨ Fast Analysis - Quick processing with high accuracy\n\nYou can use my services with confidence!";
    }

    // Examples
    if (lowerMessage.includes("example")) {
      return "Here are some examples of what you can analyze:\n\n📄 PDF Examples:\n• Research papers and articles\n• Business reports and contracts\n• Invoices and receipts\n\n📊 CSV Examples:\n• Sales data and financial records\n• Customer data and analytics\n• Survey results and statistics\n\n💾 JSON Examples:\n• API responses and data exports\n• Configuration files\n• Database dumps\n\nUpload any of these to see the analysis in action!";
    }

    // Greeting
    if (
      lowerMessage.includes("hello") ||
      lowerMessage.includes("hi") ||
      lowerMessage.includes("hey")
    ) {
      return "Hello! 👋 I'm here to help you analyze your files. You can ask me about my capabilities, supported formats, or how to use the platform. What would you like to know?";
    }

    // Thanks
    if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
      return "You're welcome! 😊 If you have any other questions or are ready to analyze a file, just let me know. Happy to help!";
    }

    // Default response
    return "That's a great question! I'm here to help you analyze PDF, CSV, and JSON files. You can ask me:\n\n• What can you do?\n• What formats do you support?\n• How do I use this?\n• Is it secure?\n\nOr simply upload a file above to start analyzing right away!";
  };

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

    // Navigate to analysis page with file data
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

  const handleSendMessage = () => {
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

    // Get AI response
    const aiResponse = {
      type: "ai",
      text: getAIResponse(inputValue),
      timestamp: new Date(),
    };

    // Clear input
    setInputValue("");

    // Add AI response after a short delay
    setTimeout(() => {
      setMessages((prev) => [...prev, aiResponse]);
    }, 500);
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
                    <div className={styles.messageText}>
                      {message.text.split("\n").map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < message.text.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
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
