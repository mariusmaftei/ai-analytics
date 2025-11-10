import jsPDF from "jspdf";

export const generatePDFReport = (
  fileData,
  analysisData,
  messages = [],
  chapters = []
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

  if (chapters && chapters.length > 0) {
    addSectionHeader("Document Chapters");
    chapters.forEach((chapter, index) => {
      addNewPageIfNeeded(30);
      addText(`${chapter.number}: ${chapter.title}`, 11, true);
      if (chapter.summary) {
        addText(chapter.summary, 10);
      }
      if (chapter.pages && chapter.pages !== "N/A") {
        addText(`Pages: ${chapter.pages}`, 9);
      }
      yPosition += 3;
    });
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
  messages = [],
  chapters = []
) => {
  let csvContent = "";

  // If tables exist, export them as the primary CSV data
  if (analysisData.tables && analysisData.tables.length > 0) {
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
    // If no tables, export metadata and other structured data
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

    if (chapters && chapters.length > 0) {
      csvContent += "\nChapters\n";
      csvContent += "Chapter Number,Chapter Title,Pages,Summary\n";
      chapters.forEach((chapter) => {
        csvContent += `"${String(chapter.number || "").replace(
          /"/g,
          '""'
        )}","${String(chapter.title || "").replace(/"/g, '""')}","${
          chapter.pages || "N/A"
        }","${String(chapter.summary || "").replace(/"/g, '""')}"\n`;
      });
    }
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    fileData.fileName.replace(/\.[^/.]+$/, "") + "_data.csv"
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateJSONExport = (
  fileData,
  analysisData,
  messages = [],
  chapters = []
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
    chapters: chapters || [],
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
    fileData.fileName.replace(/\.[^/.]+$/, "") + "_data.json"
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
