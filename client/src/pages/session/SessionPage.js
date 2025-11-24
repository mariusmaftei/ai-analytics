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
  faBook,
  faTable,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import { chatAboutDocument } from "../../services/documentChatService";
import ChaptersView from "../../components/ChaptersView/ChaptersView";
import CSVPreview from "../../components/CSVPreview/CSVPreview";
import JSONPreview from "../../components/JSONPreview/JSONPreview";
import ImagePreview from "../../components/ImagePreview/ImagePreview";
import InsightGenerator from "../../components/InsightGenerator/InsightGenerator";
import ImageInsightGenerator from "../../components/ImageInsightGenerator/ImageInsightGenerator";
import CSVInsightGenerator from "../../components/CSVInsightGenerator/CSVInsightGenerator";
import { generatePDFReport, generateCSVExport, generateJSONExport } from "../../utils/pdfGenerator";
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

  const isImage = analysisData.fileType === "IMAGE";
  const isCSV = analysisData.fileType === "CSV";
  
  const [inputValue, setInputValue] = useState("");
  const [showChapters, setShowChapters] = useState(false);
  const [showCSVPreview, setShowCSVPreview] = useState(false);
  const [showJSONPreview, setShowJSONPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(isImage && !!analysisData.imageUrl);
  const [showInsightGenerator, setShowInsightGenerator] = useState(false);
  const [showImageInsightGenerator, setShowImageInsightGenerator] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [extractedChapters, setExtractedChapters] = useState([]);
  // Generate a concise, professional welcome message
  const getWelcomeMessage = () => {
    const fileType = analysisData.fileType || 'document';
    const fileName = fileData.fileName || 'your file';
    
    if (isImage) {
      let message = `✅ **Image Analysis Complete**\n\n`;
      message += `I've successfully analyzed your image: **${fileName}**\n\n`;
      
      const stats = [];
      if (analysisData.metadata?.width && analysisData.metadata?.height) {
        stats.push(`${analysisData.metadata.width} × ${analysisData.metadata.height} px`);
      }
      if (analysisData.metadata?.format) {
        stats.push(`${analysisData.metadata.format.toUpperCase()}`);
      }
      if (fileData.fileSize) {
        stats.push(`${(fileData.fileSize / 1024).toFixed(2)} KB`);
      }
      
      if (stats.length > 0) {
        message += `📊 **Image Info:** ${stats.join(' • ')}\n\n`;
      }
      
      message += `**What would you like to do next?**\n\n`;
      message += `🖼️ **Image Analysis** - Click the "Image Analysis" button above to get detailed visual analysis, object detection, text extraction, or scene understanding.\n\n`;
      message += `💬 **Ask Questions** - Type your question below to get specific information about the image content.\n\n`;
      message += `👁️ **View Image** - Use the "Show Image Preview" button to view the image with metadata.`;
      
      return message;
    }
    
    let message = `✅ **Document Analysis Complete**\n\n`;
    message += `I've successfully analyzed your ${fileType} file: **${fileName}**\n\n`;
    
    const stats = [];
    if (analysisData.metadata?.totalPages) {
      stats.push(`${analysisData.metadata.totalPages} page${analysisData.metadata.totalPages !== 1 ? 's' : ''}`);
    }
    if (analysisData.metadata?.wordCount) {
      stats.push(`${analysisData.metadata.wordCount.toLocaleString()} words`);
    }
    if (analysisData.data && analysisData.fileType === 'CSV') {
      stats.push(`${analysisData.data.length} row${analysisData.data.length !== 1 ? 's' : ''}`);
    }
    
    if (stats.length > 0) {
      message += `📊 **Quick Stats:** ${stats.join(' • ')}\n\n`;
    }
    
    message += `**What would you like to do next?**\n\n`;
    message += `💡 **Generate Insights** - Click the "Generate Insights" button above to get AI-powered analysis, patterns, and key findings.\n\n`;
    message += `💬 **Ask Questions** - Type your question below to get specific information about the document content.\n\n`;
    message += `📋 **Explore Data** - Use the preview buttons above to view tables, JSON data, or document structure.`;
    
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

  // Transform CSV data to table format for CSVPreview component
  const csvPreviewTables = useMemo(() => {
    if (analysisData.fileType === "PDF" && analysisData.tables && analysisData.tables.length > 0) {
      return analysisData.tables;
    }
    
    if (analysisData.fileType === "CSV" && analysisData.data && analysisData.data.length > 0) {
      const columns = analysisData.columns || Object.keys(analysisData.data[0] || {});
      const tableData = [
        columns,
        ...analysisData.data.map(row => columns.map(col => row[col] || ''))
      ];
      
      return [{
        data: tableData,
        rows: analysisData.data.length,
        columns: columns.length,
        page: 'N/A'
      }];
    }
    
    return null;
  }, [analysisData]);

  // Prepare JSON preview data - show actual data for CSV, metadata for others
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
      chapters: extractedChapters || [],
      text: analysisData.text ? analysisData.text.substring(0, 1000) + '...' : '',
    };
  }, [analysisData, fileData, extractedChapters]);

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
      // Use REAL AI chat with document context (RAG if available)
      await chatAboutDocument(
        currentInput,
        analysisData.text || '',
        {
          filename: fileData.fileName,
          totalPages: analysisData.metadata?.totalPages,
          wordCount: analysisData.metadata?.wordCount,
          title: analysisData.metadata?.title,
          author: analysisData.metadata?.author,
          document_id: analysisData.documentId || analysisData.dbId, // Use RAG document ID if available
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
          user_name: null,
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

  // Parse AI response to extract structured chapter data
  const parseChaptersFromText = (text) => {
    const chapters = [];
    
    // First, try to extract all chapters using regex patterns on the full text
    // This is more reliable than line-by-line parsing
    
    // Pattern 1: SUBCHAPTER F—BIOLOGICS (with em dash, en dash, or hyphen)
    const subchapterRegex = /(SUBCHAPTER|Subchapter|SubChapter)\s*([A-Z])\s*[—–-]\s*([^\n]+)/gi;
    let match;
    while ((match = subchapterRegex.exec(text)) !== null) {
      chapters.push({
        number: `Subchapter ${match[2]}`,
        title: match[3].trim().replace(/\*\*/g, '').replace(/\*/g, ''),
        pages: 'N/A',
        summary: '',
      });
    }
    
    // Pattern 2: Part 606 or PART 660
    const partRegex = /(PART|Part)\s*(\d+[A-Z]?)\s*[—–-]?\s*([^\n]+)/gi;
    while ((match = partRegex.exec(text)) !== null) {
      // Check if this part is already added as a subchapter
      const existing = chapters.find(ch => ch.number === `Part ${match[2]}`);
      if (!existing) {
        chapters.push({
          number: `Part ${match[2]}`,
          title: match[3].trim().replace(/\*\*/g, '').replace(/\*/g, ''),
          pages: 'N/A',
          summary: '',
        });
      }
    }
    
    // Pattern 3: § 600.20 or 600.20 (sections)
    const sectionRegex = /§?\s*(\d+\.\d+)\s*[—–-]?\s*([^\n]+)/g;
    while ((match = sectionRegex.exec(text)) !== null) {
      chapters.push({
        number: match[1],
        title: match[2].trim().replace(/\*\*/g, '').replace(/\*/g, ''),
        pages: 'N/A',
        summary: '',
      });
    }
    
    // Pattern 4: **606** or **Part 660** (bold numbers)
    const boldRegex = /\*\*(\d+[A-Z]?|Part\s+\d+)\*\*\s*([^\n]+)/gi;
    while ((match = boldRegex.exec(text)) !== null) {
      const num = match[1].includes('Part') ? match[1] : `Part ${match[1]}`;
      const existing = chapters.find(ch => ch.number === num || ch.number === match[1]);
      if (!existing) {
        chapters.push({
          number: match[1].includes('Part') ? match[1] : match[1],
          title: match[2].trim().replace(/\*\*/g, '').replace(/\*/g, ''),
          pages: 'N/A',
          summary: '',
        });
      }
    }
    
    // Pattern 5: Numbered lists like "1. Title" or "**1.** Title"
    const numberedRegex = /(?:^|\n)\s*\*?\*?(\d+[A-Z]?)\*?\*?[\.\)]\s*\*?\*?([^\n]+?)(?:\n|$)/g;
    while ((match = numberedRegex.exec(text)) !== null) {
      // Only add if it looks like a chapter (has meaningful content)
      const title = match[2].trim().replace(/\*\*/g, '').replace(/\*/g, '');
      if (title.length > 5 && !title.match(/^(and|or|the|a|an)\s/i)) {
        const existing = chapters.find(ch => ch.number === match[1] && ch.title === title);
        if (!existing) {
          chapters.push({
            number: match[1],
            title: title,
            pages: 'N/A',
            summary: '',
          });
        }
      }
    }
    
    // Now try to add summaries by looking at text after each chapter
    if (chapters.length > 0) {
      const lines = text.split('\n');
      chapters.forEach((chapter, idx) => {
        // Find the chapter in the text
        const chapterPattern = chapter.number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const chapterIndex = text.search(new RegExp(chapterPattern, 'i'));
        
        if (chapterIndex !== -1) {
          // Get text after this chapter (up to next chapter or 200 chars)
          const afterChapter = text.substring(chapterIndex + chapter.number.length);
          const nextChapterIndex = chapters.slice(idx + 1).reduce((min, nextCh) => {
            const nextPattern = nextCh.number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const nextIdx = afterChapter.search(new RegExp(nextPattern, 'i'));
            return nextIdx !== -1 && (min === -1 || nextIdx < min) ? nextIdx : min;
          }, -1);
          
          const summaryText = afterChapter.substring(0, nextChapterIndex !== -1 ? nextChapterIndex : 300)
            .split('\n')
            .slice(0, 3)
            .join(' ')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();
          
          if (summaryText && summaryText.length > 20) {
            chapter.summary = summaryText.substring(0, 200);
            if (summaryText.length > 200) {
              chapter.summary += '...';
            }
          }
        }
      });
    }
    
    // Remove duplicates based on number
    const uniqueChapters = [];
    const seen = new Set();
    chapters.forEach(ch => {
      const key = ch.number.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueChapters.push(ch);
      }
    });
    
    return uniqueChapters;
  };

  const handleShowChapters = async () => {
    const newShowChapters = !showChapters;
    setShowChapters(newShowChapters);
    
    if (newShowChapters && extractedChapters.length === 0) {
      // Show loading message
      const loadingMessage = {
        type: "ai",
        text: "📚 Extracting chapters from the document...",
        timestamp: new Date(),
        isStreaming: false,
        isChapterExtraction: true,
      };
      setMessages((prev) => [...prev, loadingMessage]);
      
      let fullResponse = "";
      
      try {
        // Use AI to extract chapters from the document
        const chapterPrompt = `Extract ALL chapters, subchapters, parts, and major sections from this document.

For EACH chapter/section found, format it EXACTLY like this:
SUBCHAPTER [LETTER]—[TITLE]
or
Part [NUMBER]—[TITLE]
or
§ [NUMBER]—[TITLE]

Then provide a brief description (1-2 sentences) about what that section covers.

List EVERY chapter, subchapter, part, and major section you find. Be thorough and complete.

Document: ${fileData.fileName}
Total Pages: ${analysisData.metadata?.totalPages || 'Unknown'}

Now extract and list all chapters and sections:`;

        await chatAboutDocument(
          chapterPrompt,
          analysisData.text || '',
          {
            filename: fileData.fileName,
            totalPages: analysisData.metadata?.totalPages,
            wordCount: analysisData.metadata?.wordCount,
          },
          (chunk) => {
            fullResponse += chunk;
            // Update the last message with streaming chunks
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.type === "ai" && lastMessage.isChapterExtraction) {
                lastMessage.text = `📚 **Chapters Found in ${fileData.fileName}:**\n\n${fullResponse}`;
              }
              return newMessages;
            });
          },
          {
            user_name: null,
            temperature: 0.3,
            max_tokens: 2048,
            is_greeting: false,
          }
        );
        
        // Parse chapters from the response
        const parsedChapters = parseChaptersFromText(fullResponse);
        
        console.log('Parsed chapters:', parsedChapters);
        console.log('Full response:', fullResponse);
        
        if (parsedChapters.length > 0) {
          setExtractedChapters(parsedChapters);
          
          // Update the message to show chapter count
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === "ai" && lastMessage.isChapterExtraction) {
              lastMessage.text = `📚 Found ${parsedChapters.length} chapters in ${fileData.fileName}`;
              lastMessage.isStreaming = false;
            }
            return newMessages;
          });
        } else {
          // If main parsing found nothing, try even more aggressive fallback extraction
          console.log('Main parsing found no chapters, trying fallback extraction...');
          const fallbackChapters = parseChaptersFromText(fullResponse);
          
          if (fallbackChapters.length > 0) {
            setExtractedChapters(fallbackChapters);
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.type === "ai" && lastMessage.isChapterExtraction) {
                lastMessage.text = `📚 Found ${fallbackChapters.length} chapters in ${fileData.fileName}`;
                lastMessage.isStreaming = false;
              }
              return newMessages;
            });
          } else {
            // Last resort: try to find any pattern that looks like a chapter
            const allPatterns = [
              ...fullResponse.matchAll(/(SUBCHAPTER|Subchapter)\s*([A-Z])\s*[—–-]\s*([^\n]+)/gi),
              ...fullResponse.matchAll(/(PART|Part)\s*(\d+[A-Z]?)\s*[—–-]?\s*([^\n]+)/gi),
              ...fullResponse.matchAll(/§?\s*(\d+\.\d+)\s*[—–-]?\s*([^\n]+)/g),
              ...fullResponse.matchAll(/\*\*(\d+[A-Z]?)\*\*\s*([^\n]+)/gi),
            ];
            
            const lastResortChapters = [];
            allPatterns.forEach(match => {
              if (match[2] || match[3]) {
                const num = match[2] || match[1];
                const title = (match[3] || match[2] || '').trim().replace(/\*\*/g, '').replace(/\*/g, '');
                if (title && title.length > 3) {
                  lastResortChapters.push({
                    number: num.toString(),
                    title: title,
                    pages: 'N/A',
                    summary: '',
                  });
                }
              }
            });
            
            if (lastResortChapters.length > 0) {
              // Remove duplicates
              const unique = Array.from(new Map(lastResortChapters.map(ch => [ch.number, ch])).values());
              setExtractedChapters(unique);
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === "ai" && lastMessage.isChapterExtraction) {
                  lastMessage.text = `📚 Found ${unique.length} chapters in ${fileData.fileName}`;
                  lastMessage.isStreaming = false;
                }
                return newMessages;
              });
            } else {
              // Mark streaming as complete if no chapters found at all
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === "ai") {
                  lastMessage.text = `📚 No structured chapters found. The document may not have clear chapter divisions. Full response: ${fullResponse.substring(0, 500)}...`;
                  lastMessage.isStreaming = false;
                }
                return newMessages;
              });
            }
          }
        }
      } catch (error) {
        console.error('Chapter extraction error:', error);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.type === "ai") {
            lastMessage.text = "⚠️ Unable to extract chapters at this time. Please try asking about specific sections in the document.";
            lastMessage.isStreaming = false;
          }
          return newMessages;
        });
      }
    }
  };

  const handleDownload = (format) => {
    try {
      const formatInfo = {
        pdf: "📄 PDF Data - Document data with tables, metadata, and insights",
        csv: "📊 CSV File - Raw data in spreadsheet format",
        json: "💾 JSON File - Structured data export",
      };

      const fileName = fileData.fileName.replace(/\.[^/.]+$/, "");

      if (format === "pdf") {
        generatePDFReport(fileData, analysisData, messages, extractedChapters);
      } else if (format === "csv") {
        generateCSVExport(fileData, analysisData, messages, extractedChapters);
      } else if (format === "json") {
        generateJSONExport(fileData, analysisData, messages, extractedChapters);
      }

      const downloadMessage = {
        type: "ai",
        text: `✅ Download started!\n\n${
          formatInfo[format]
        }\n\nFile: ${fileName}.${format}\n\nThe file should download automatically.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, downloadMessage]);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Download error:', error);
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
                : fileData.fileType.includes("image") || analysisData.fileType === "IMAGE"
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

      {/* Action Buttons - Contextual based on file type */}
      <div className={styles.actionBar}>
        {/* Image Analysis - For images only */}
        {isImage && (
          <button
            className={`${styles.actionButton} ${
              showImageInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowImageInsightGenerator(!showImageInsightGenerator);
              if (!showImageInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById('image-insight-generator-section');
                  if (insightSection) {
                    insightSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faImage} />
            <span>{showImageInsightGenerator ? "Hide" : "Image"} Analysis</span>
          </button>
        )}

        {/* Insight Generator - For PDF, JSON files only (CSV has its own generator) */}
        {!isImage && !isCSV && (
          <button
            className={`${styles.actionButton} ${
              showInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowInsightGenerator(!showInsightGenerator);
              if (!showInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById('insight-generator-section');
                  if (insightSection) {
                    insightSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>{showInsightGenerator ? "Hide" : "Generate"} Insights</span>
          </button>
        )}

        {/* CSV Insight Generator - For CSV files only */}
        {isCSV && (
          <button
            className={`${styles.actionButton} ${
              showInsightGenerator ? styles.active : ""
            }`}
            onClick={() => {
              setShowInsightGenerator(!showInsightGenerator);
              if (!showInsightGenerator) {
                setTimeout(() => {
                  const insightSection = document.getElementById('csv-insight-generator-section');
                  if (insightSection) {
                    insightSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }
            }}
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span>{showInsightGenerator ? "Hide" : "Generate"} Insights</span>
          </button>
        )}

        {/* Show Chapters for PDF documents - SECOND */}
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

        {/* Image Preview for Image files */}
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

        {/* CSV Preview for PDFs with tables and CSV files - Hidden for images */}
        {!isImage && ((analysisData.fileType === "PDF" && analysisData.hasTables && analysisData.tables && analysisData.tables.length > 0) ||
          (analysisData.fileType === "CSV" && analysisData.data && analysisData.data.length > 0)) && (
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

        {/* JSON Preview - Hidden for images */}
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

        {/* Download - Hidden for images */}
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
              </div>
            )}
          </div>
        )}
      </div>


      {/* Chapters View - Show when chapters are extracted and button is active */}
      {showChapters && extractedChapters.length > 0 && (
        <div className={styles.chaptersSection}>
          <ChaptersView 
            chapters={extractedChapters} 
            highlights={[]} 
            keywords={[]} 
          />
        </div>
      )}

      {/* CSV Preview - Show when tables are available (PDF) or data is available (CSV) and button is active */}
      {showCSVPreview && csvPreviewTables && (
        <div className={styles.csvPreviewSection}>
          <CSVPreview tables={csvPreviewTables} />
        </div>
      )}

      {/* Image Preview - Show when button is active */}
      {showImagePreview && analysisData.imageUrl && (
        <div className={styles.imagePreviewSection}>
          <ImagePreview
            imageUrl={analysisData.imageUrl}
            metadata={analysisData.metadata}
            alt={fileData.fileName}
          />
        </div>
      )}

      {/* JSON Preview - Show when button is active */}
      {showJSONPreview && (
        <div className={styles.jsonPreviewSection}>
          <JSONPreview 
            data={jsonPreviewData}
          />
        </div>
      )}

      {/* Image Insight Generator Section - Show for images */}
      {showImageInsightGenerator && isImage && (
        <div id="image-insight-generator-section" className={styles.insightGeneratorSection}>
          <ImageInsightGenerator 
            fileData={fileData}
            analysisData={analysisData}
            imageFile={fileData.file || session?.files?.find(f => f.fileName === fileData.fileName)?.file}
          />
        </div>
      )}

      {/* CSV Insight Generator Section - Show for CSV files */}
      {showInsightGenerator && isCSV && (
        <div id="csv-insight-generator-section" className={styles.insightGeneratorSection}>
          <CSVInsightGenerator 
            fileData={fileData}
            analysisData={analysisData}
          />
        </div>
      )}

      {/* Insight Generator Section - Show for PDF, JSON files */}
      {showInsightGenerator && !isImage && !isCSV && (
        <div id="insight-generator-section" className={styles.insightGeneratorSection}>
          <InsightGenerator 
            fileData={fileData}
            analysisData={analysisData}
            tables={analysisData.tables || []}
          />
        </div>
      )}

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
                  {message.text.split("\n").map((line, i) => {
                    // Parse markdown-style bold (**text**)
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <React.Fragment key={i}>
                        {parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                        {i < message.text.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    );
                  })}
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
