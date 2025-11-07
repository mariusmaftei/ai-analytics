import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faImage,
  faChartBar,
  faFileAlt,
  faMagnifyingGlass,
  faBolt,
  faLock,
  faBullseye,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const capabilities = [
    {
      icon: faFilePdf,
      title: "PDF Analysis",
      description: "Extract and analyze PDF documents",
    },
    {
      icon: faImage,
      title: "Image Recognition",
      description: "Detect objects and text in images",
    },
    {
      icon: faChartBar,
      title: "Data Analytics",
      description: "Analyze spreadsheets and data",
    },
    {
      icon: faFileAlt,
      title: "Text Processing",
      description: "Sentiment analysis and summarization",
    },
  ];

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file) => {
    // Navigate to analysis page with file data
    navigate("/analysis", {
      state: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "Unknown",
        uploadTime: new Date().toISOString(),
      },
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
    if (e.key === "Enter") {
      e.preventDefault();
      // Show capabilities response
      setShowSuggestions(true);
    }
  };

  return (
    <div
      className={styles.container}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
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
              placeholder="What would you like me to analyze?"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyPress={handleKeyPress}
            />
            <button className={styles.searchButton}>
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
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
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
              title="Upload Image"
            >
              <FontAwesomeIcon icon={faImage} className={styles.iconSvg} />
              <span className={styles.iconLabel}>Image</span>
            </button>
            <button
              className={styles.uploadIcon}
              onClick={() => fileInputRef.current?.click()}
              title="Upload Spreadsheet"
            >
              <FontAwesomeIcon icon={faChartBar} className={styles.iconSvg} />
              <span className={styles.iconLabel}>Data</span>
            </button>
            <button
              className={styles.uploadIcon}
              onClick={() => fileInputRef.current?.click()}
              title="Upload Document"
            >
              <FontAwesomeIcon icon={faFileAlt} className={styles.iconSvg} />
              <span className={styles.iconLabel}>Document</span>
            </button>
          </div>
        </div>

        {/* Suggestions/Capabilities */}
        {showSuggestions && (
          <div className={styles.suggestionsBox}>
            <h3 className={styles.suggestionsTitle}>I can help you with:</h3>
            <div className={styles.capabilitiesGrid}>
              {capabilities.map((capability, index) => (
                <div key={index} className={styles.capabilityCard}>
                  <div className={styles.capabilityIcon}>
                    <FontAwesomeIcon icon={capability.icon} />
                  </div>
                  <div className={styles.capabilityInfo}>
                    <h4 className={styles.capabilityTitle}>
                      {capability.title}
                    </h4>
                    <p className={styles.capabilityDescription}>
                      {capability.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.uploadPrompt}>
              <p>
                <FontAwesomeIcon icon={faPaperclip} /> Upload a file above to
                get started with AI-powered analysis
              </p>
            </div>
          </div>
        )}

        {/* Features Overview */}
        {!showSuggestions && (
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
                  icon={faChartBar}
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
        )}
      </div>
    </div>
  );
};

export default HomePage;
