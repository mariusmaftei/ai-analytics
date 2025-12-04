import jsPDF from "jspdf";

export const generatePDFReport = (
  fileData,
  analysisData,
  messages = []
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addNewPageIfNeeded = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addText = (text, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      addNewPageIfNeeded(fontSize + 5);
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5 + 2;
    });
  };

  const addSectionHeader = (title) => {
    addNewPageIfNeeded(25);
    yPosition += 10;
    addText(title, 16, true, [0, 51, 102]);
    yPosition += 5;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  };

  doc.setTextColor(0, 0, 0);

  addSectionHeader("PDF Data Export");

  addText(`File: ${fileData.fileName}`, 12, true);
  addText(`Size: ${(fileData.fileSize / 1024).toFixed(2)} KB`, 10);
  addText(`Type: ${fileData.fileType}`, 10);
  yPosition += 5;

  if (analysisData.metadata) {
    addSectionHeader("Document Metadata");
    if (analysisData.metadata.totalPages) {
      addText(`Total Pages: ${analysisData.metadata.totalPages}`, 11);
    }
    if (analysisData.metadata.wordCount) {
      addText(
        `Word Count: ${analysisData.metadata.wordCount.toLocaleString()}`,
        11
      );
    }
    if (analysisData.metadata.title) {
      addText(`Title: ${analysisData.metadata.title}`, 11);
    }
    if (analysisData.metadata.author) {
      addText(`Author: ${analysisData.metadata.author}`, 11);
    }
  }

  if (analysisData.insights && analysisData.insights.summary) {
    addSectionHeader("Summary & Insights");
    addText(analysisData.insights.summary, 11);

    if (
      analysisData.insights.patterns &&
      analysisData.insights.patterns.length > 0
    ) {
      yPosition += 5;
      addText("Key Patterns:", 11, true);
      analysisData.insights.patterns.forEach((pattern, index) => {
        addText(`${index + 1}. ${pattern}`, 10);
      });
    }
  }

  // Add tables section if available
  if (analysisData.tables && analysisData.tables.length > 0) {
    addSectionHeader("Extracted Tables");
    analysisData.tables.forEach((table, tableIndex) => {
      addNewPageIfNeeded(30);
      addText(
        `Table ${tableIndex + 1} (Page ${table.page || "N/A"})`,
        11,
        true
      );

      if (table.data && table.data.length > 0) {
        // Add table headers
        if (table.data[0]) {
          const headers = table.data[0].join(" | ");
          addText(headers, 9, true, [0, 51, 102]);
          yPosition += 3;
        }

        // Add table rows (limit to first 20 rows for PDF)
        const rowsToShow = table.data.slice(1, 21);
        rowsToShow.forEach((row) => {
          const rowText = row.map((cell) => String(cell || "")).join(" | ");
          addText(rowText, 8);
        });

        if (table.data.length > 21) {
          addText(
            `... (${table.data.length - 21} more rows)`,
            8,
            false,
            [128, 128, 128]
          );
        }
      }
      yPosition += 5;
    });
  }

  if (analysisData.text && analysisData.text.length > 0) {
    addSectionHeader("Extracted Text (Preview)");
    const previewText = analysisData.text.substring(0, 2000);
    addText(previewText, 9);
    if (analysisData.text.length > 2000) {
      addText(
        `\n... (${(
          analysisData.text.length - 2000
        ).toLocaleString()} more characters)`,
        9,
        false,
        [128, 128, 128]
      );
    }
  }

  addNewPageIfNeeded(20);
  yPosition = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, yPosition);
  doc.text("AI Analytics Platform", pageWidth - margin - 50, yPosition, {
    align: "right",
  });

  const fileName = fileData.fileName.replace(/\.[^/.]+$/, "") + "_data.pdf";
  doc.save(fileName);
};

export const generateCSVExport = (
  fileData,
  analysisData,
  messages = []
) => {
  let csvContent = "";

  // For CSV files, export the actual CSV data (rows and columns)
  if (analysisData.fileType === "CSV" && analysisData.data && analysisData.data.length > 0) {
    const columns = analysisData.columns || Object.keys(analysisData.data[0] || {});
    
    // Write header row
    const headerRow = columns
      .map((col) => {
        const cellValue = String(col || "").replace(/"/g, '""');
        return `"${cellValue}"`;
      })
      .join(",");
    csvContent += headerRow + "\n";
    
    // Write data rows
    analysisData.data.forEach((row) => {
      const csvRow = columns
        .map((col) => {
          const cellValue = String(row[col] || "").replace(/"/g, '""');
          return `"${cellValue}"`;
        })
        .join(",");
      csvContent += csvRow + "\n";
    });
  }
  // If tables exist (for PDFs), export them as the primary CSV data
  else if (analysisData.tables && analysisData.tables.length > 0) {
    analysisData.tables.forEach((table, tableIndex) => {
      if (tableIndex > 0) {
        csvContent += "\n\n";
      }

      // Add table header
      csvContent += `Table ${tableIndex + 1} (Page ${table.page || "N/A"})\n`;

      // Export table data
      if (table.data && table.data.length > 0) {
        table.data.forEach((row) => {
          const csvRow = row
            .map((cell) => {
              const cellValue = String(cell || "").replace(/"/g, '""');
              return `"${cellValue}"`;
            })
            .join(",");
          csvContent += csvRow + "\n";
        });
      }
    });
  } else {
    // If no tables and not CSV, export metadata and other structured data
    csvContent += "Document Information\n";
    csvContent += `File Name,${fileData.fileName}\n`;
    csvContent += `File Size,${(fileData.fileSize / 1024).toFixed(2)} KB\n`;
    csvContent += `File Type,${fileData.fileType}\n`;

    if (analysisData.metadata) {
      csvContent += "\nMetadata\n";
      if (analysisData.metadata.totalPages) {
        csvContent += `Total Pages,${analysisData.metadata.totalPages}\n`;
      }
      if (analysisData.metadata.wordCount) {
        csvContent += `Word Count,${analysisData.metadata.wordCount}\n`;
      }
      if (analysisData.metadata.title) {
        csvContent += `Title,"${String(analysisData.metadata.title).replace(
          /"/g,
          '""'
        )}"\n`;
      }
      if (analysisData.metadata.author) {
        csvContent += `Author,"${String(analysisData.metadata.author).replace(
          /"/g,
          '""'
        )}"\n`;
      }
    }
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  
  // For CSV files, use the original filename; for others, append "_data"
  const downloadFileName = analysisData.fileType === "CSV" 
    ? fileData.fileName 
    : fileData.fileName.replace(/\.[^/.]+$/, "") + "_data.csv";
  
  link.setAttribute("download", downloadFileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateJSONExport = (
  fileData,
  analysisData,
  messages = []
) => {
  const exportData = {
    fileInfo: {
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
    },
    metadata: analysisData.metadata || {},
    insights: analysisData.insights || {},
    tables: analysisData.tables || [],
    exportedAt: new Date().toISOString(),
  };

  // For CSV files, include the actual data
  if (analysisData.fileType === "CSV" && analysisData.data && analysisData.data.length > 0) {
    exportData.columns = analysisData.columns || Object.keys(analysisData.data[0] || {});
    exportData.data = analysisData.data;
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    fileData.fileName.replace(/\.[^/.]+$/, "") + "_data.json"
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================================
// AUDIO-SPECIFIC EXPORT FUNCTIONS
// ============================================================================

/**
 * Format timestamp from seconds to MM:SS
 */
const formatTimestamp = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Format duration from seconds to MM:SS
 */
const formatDuration = (seconds) => {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Generate plain text transcription export for audio files
 */
export const generateAudioTranscriptionTXT = (fileData, analysisData) => {
  const transcription = analysisData.transcription?.text || analysisData.text || "";
  const segments = analysisData.transcription?.segments || [];
  
  let content = `Audio Transcription\n`;
  content += `===================\n\n`;
  content += `File: ${fileData.fileName}\n`;
  content += `Duration: ${analysisData.metadata?.duration ? formatDuration(analysisData.metadata.duration) : 'N/A'}\n`;
  content += `Language: ${analysisData.transcription?.language || 'Unknown'}\n`;
  content += `Word Count: ${analysisData.transcription?.word_count || transcription.split(/\s+/).length}\n\n`;
  content += `--- Full Transcript ---\n\n`;
  content += `${transcription}\n\n`;
  
  // Add timestamped segments if available
  if (segments.length > 0) {
    content += `--- Timestamped Segments ---\n\n`;
    segments.forEach((segment, index) => {
      const startTime = formatTimestamp(segment.start || segment.start_time || 0);
      const endTime = formatTimestamp(segment.end || segment.end_time || 0);
      const text = segment.text || segment.transcript || '';
      content += `[${startTime} - ${endTime}] ${text}\n`;
    });
  }
  
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileData.fileName.replace(/\.[^/.]+$/, "") + "_transcription.txt");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate PDF transcription export for audio files
 */
export const generateAudioTranscriptionPDF = (fileData, analysisData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addNewPageIfNeeded = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addText = (text, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      addNewPageIfNeeded(fontSize + 5);
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5 + 2;
    });
  };

  const addSectionHeader = (title) => {
    addNewPageIfNeeded(25);
    yPosition += 10;
    addText(title, 16, true, [0, 51, 102]);
    yPosition += 5;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  };

  // Header
  addSectionHeader("Audio Transcription");
  addText(`File: ${fileData.fileName}`, 12, true);
  addText(`Duration: ${analysisData.metadata?.duration ? formatDuration(analysisData.metadata.duration) : 'N/A'}`, 10);
  addText(`Language: ${analysisData.transcription?.language || 'Unknown'}`, 10);
  addText(`Word Count: ${analysisData.transcription?.word_count || (analysisData.transcription?.text || analysisData.text || '').split(/\s+/).length}`, 10);
  yPosition += 10;

  // Full Transcript
  const transcription = analysisData.transcription?.text || analysisData.text || "";
  if (transcription) {
    addSectionHeader("Full Transcript");
    addText(transcription, 11);
    yPosition += 5;
  }

  // Timestamped Segments
  const segments = analysisData.transcription?.segments || [];
  if (segments.length > 0) {
    addSectionHeader("Timestamped Segments");
    segments.forEach((segment, index) => {
      const startTime = formatTimestamp(segment.start || segment.start_time || 0);
      const endTime = formatTimestamp(segment.end || segment.end_time || 0);
      const text = segment.text || segment.transcript || '';
      
      addText(`[${startTime} - ${endTime}]`, 10, true, [102, 102, 102]);
      addText(text, 10);
      yPosition += 3;
    });
  }

  // Save PDF
  const fileName = fileData.fileName.replace(/\.[^/.]+$/, "") + "_transcription.pdf";
  doc.save(fileName);
};

/**
 * Generate comprehensive audio analysis report PDF
 */
export const generateAudioReportPDF = (fileData, analysisData, messages = []) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addNewPageIfNeeded = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addText = (text, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      addNewPageIfNeeded(fontSize + 5);
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5 + 2;
    });
  };

  const addSectionHeader = (title) => {
    addNewPageIfNeeded(25);
    yPosition += 10;
    addText(title, 16, true, [0, 51, 102]);
    yPosition += 5;
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  };

  // Title
  addSectionHeader("Audio Analysis Report");
  addText(`File: ${fileData.fileName}`, 12, true);
  addText(`Generated: ${new Date().toLocaleString()}`, 10);
  yPosition += 10;

  // Metadata
  if (analysisData.metadata) {
    addSectionHeader("File Information");
    if (analysisData.metadata.duration) {
      addText(`Duration: ${formatDuration(analysisData.metadata.duration)}`, 11);
    }
    if (analysisData.metadata.format) {
      addText(`Format: ${analysisData.metadata.format.toUpperCase()}`, 11);
    }
    if (analysisData.metadata.file_size) {
      addText(`File Size: ${(analysisData.metadata.file_size / (1024 * 1024)).toFixed(2)} MB`, 11);
    }
    if (analysisData.metadata.sample_rate) {
      addText(`Sample Rate: ${analysisData.metadata.sample_rate} Hz`, 11);
    }
    if (analysisData.metadata.channels) {
      addText(`Channels: ${analysisData.metadata.channels} (${analysisData.metadata.channels === 2 ? 'Stereo' : 'Mono'})`, 11);
    }
    yPosition += 5;
  }

  // Transcription Summary
  const transcription = analysisData.transcription?.text || analysisData.text || "";
  if (transcription) {
    addSectionHeader("Transcription Summary");
    addText(`Language: ${analysisData.transcription?.language || 'Unknown'}`, 11);
    addText(`Word Count: ${analysisData.transcription?.word_count || transcription.split(/\s+/).length}`, 11);
    if (analysisData.transcription?.segments) {
      addText(`Segments: ${analysisData.transcription.segments.length}`, 11);
    }
    yPosition += 5;
    
    // First 500 words of transcript
    const words = transcription.split(/\s+/);
    const preview = words.slice(0, 500).join(' ');
    addText("Transcript Preview:", 11, true);
    addText(preview + (words.length > 500 ? '...' : ''), 10);
  }

  // Insights Summary
  if (analysisData.insights && analysisData.insights.summary) {
    addSectionHeader("Analysis Summary");
    addText(analysisData.insights.summary, 11);
  }

  // Save PDF
  const fileName = fileData.fileName.replace(/\.[^/.]+$/, "") + "_analysis_report.pdf";
  doc.save(fileName);
};

/**
 * Generate JSON export for audio analysis data
 */
export const generateAudioJSONExport = (fileData, analysisData, messages = []) => {
  const exportData = {
    fileInfo: {
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
    },
    metadata: analysisData.metadata || {},
    transcription: {
      text: analysisData.transcription?.text || analysisData.text || "",
      language: analysisData.transcription?.language || "unknown",
      word_count: analysisData.transcription?.word_count || 0,
      segments: analysisData.transcription?.segments || [],
    },
    insights: analysisData.insights || {},
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    fileData.fileName.replace(/\.[^/.]+$/, "") + "_analysis_data.json"
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};