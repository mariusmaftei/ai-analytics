import React, { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSitemap,
  faFileAlt,
  faList,
  faHeading,
  faFont,
  faParagraph,
  faTable,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import styles from "./PDFStructureAnalysis.module.css";

const PDFStructureAnalysis = ({ data, rawText, analysisData }) => {
  const [expandedKeys, setExpandedKeys] = useState([]);

  // Debug: Log rawText in development
  React.useEffect(() => {
    if (rawText && process.env.NODE_ENV === "development") {
      console.log(
        "[PDFStructureAnalysis] Raw text received:",
        rawText.substring(0, 500)
      );
      console.log(
        "[PDFStructureAnalysis] Full raw text length:",
        rawText.length
      );
    }
  }, [rawText]);

  const extractStructuralMap = () => {
    if (!rawText) {
      console.log("[PDFStructureAnalysis] No rawText provided");
      return null;
    }

    const patterns = [
      /SECTION\s*A[:\s]+STRUCTURAL[_\s]*MAP\s*([\s\S]*?)(?=\n\s*SECTION\s*[BC]:|$)/i,
      /SECTION\s*A[:\s]+STRUCTURAL_MAP\s*([\s\S]*?)(?=\n\s*SECTION\s*[BC]:|$)/i,
      /SECTIONA[:\s]+STRUCTURAL[_\s]*MAP\s*([\s\S]*?)(?=\n\s*SECTION[BC]:|$)/i,
      /Section\s+A[:\s]+Structural[_\s]*Map\s*([\s\S]*?)(?=\n\s*Section\s+[BC]:|$)/i,
      /SECTION\s*A[:\s]*STRUCTURAL\s*([\s\S]*?)(?=\n\s*SECTION\s*[BC]:|$)/i,
      // Handle case where content starts immediately after section header (no newline)
      /SECTIONA[:\s]+STRUCTURAL[_\s]*MAP([\s\S]*?)(?=\n\s*SECTION[BC]:|$)/i,
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        let result = match[1].trim();

        // Stop at SECTION B or SECTION C if they appear in the result
        const stopPattern = /(SECTION\s*[BC]:|Section\s*[BC]:)/i;
        const stopMatch = result.match(stopPattern);
        if (stopMatch) {
          result = result.substring(0, stopMatch.index).trim();
        }

        console.log(
          "[PDFStructureAnalysis] Extracted structural map:",
          result.substring(0, 200)
        );
        console.log("[PDFStructureAnalysis] Extracted length:", result.length);
        return result;
      }
    }

    console.log("[PDFStructureAnalysis] No structural map found in rawText");
    return null;
  };

  const extractPageLayouts = () => {
    if (!rawText) return [];

    const patterns = [
      /SECTION\s*B[:\s]+PAGE[_\s]*LAYOUT[_\s]*DETECTION\s*([\s\S]*?)(?=\n\s*SECTION\s*[AC]:|SECTION\s*C[:\s]+FORMATTING|$)/i,
      /SECTION\s*B[:\s]+PAGE[_\s]*LAYOUT\s*([\s\S]*?)(?=\n\s*SECTION\s*[AC]:|SECTION\s*C[:\s]+FORMATTING|$)/i,
      /SECTIONB[:\s]+PAGE[_\s]*LAYOUT[_\s]*DETECTION\s*([\s\S]*?)(?=\n\s*SECTION[AC]:|SECTIONC[:\s]+FORMATTING|$)/i,
      /Section\s+B[:\s]+Page[_\s]*Layout\s*([\s\S]*?)(?=\n\s*Section\s+[AC]:|Section\s+C[:\s]+Formatting|$)/i,
      /SECTION\s*B[:\s]*PAGE\s*([\s\S]*?)(?=\n\s*SECTION\s*[AC]:|SECTION\s*C[:\s]+FORMATTING|$)/i,
    ];

    let layoutText = null;
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        layoutText = match[1].trim();
        break;
      }
    }

    if (!layoutText) {
      console.log("[PDFStructureAnalysis] No page layouts found in rawText");
      return [];
    }

    // Clean up the text - remove section markers that might have leaked in
    layoutText = layoutText.replace(/SECTION\s*[A-Z]:/gi, "").trim();

    // Parse page layouts - handle both properly formatted and concatenated text
    const layouts = [];

    // First, try to split by newlines
    let lines = layoutText
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // If we only have one or very few lines, the text might be concatenated
    // Try to split by "Page" or "Pages" patterns
    if (lines.length <= 2 && layoutText.length > 50) {
      // Split by "Page" or "Pages" followed by a number (with lookahead to keep the pattern)
      const splitPattern = /(?=Pages?\s*\d+)/gi;
      const parts = layoutText
        .split(splitPattern)
        .filter((p) => p.trim().length > 0);
      if (parts.length > 1) {
        lines = parts.map((p) => p.trim());
      } else {
        // If still not split, try a more aggressive approach
        // Look for patterns like "Page1", "Page2", etc. and split there
        const aggressiveSplit = layoutText.match(
          /(Pages?\s*\d+[^P]*?)(?=Pages?\s*\d+|$)/gi
        );
        if (aggressiveSplit && aggressiveSplit.length > 1) {
          lines = aggressiveSplit.map((p) => p.trim());
        }
      }
    }

    for (const line of lines) {
      // Skip section markers
      if (line.match(/^SECTION\s*[A-Z]:/i)) continue;
      if (line.match(/^FORMATTING/i)) break; // Stop if we hit formatting section

      // Match patterns:
      // - "Page X: Description"
      // - "Page X Description" (no colon)
      // - "Pages X-Y: Description"
      // - "Page XDescription" (concatenated, no space)
      // - "Page1Description" (no space at all)
      const pagePatterns = [
        /^Pages?\s*(\d+(?:\s*-\s*\d+)?)\s*[–—]\s*(.+?)(?=Pages?\s*\d+|$)/i, // "Page 1 – Description" (en dash or em dash)
        /^Pages?\s*(\d+(?:\s*-\s*\d+)?)\s*:\s*(.+?)(?=Pages?\s*\d+|$)/i, // "Page 1: Description" (colon format for backward compatibility)
        /^Pages?\s*(\d+(?:\s*-\s*\d+)?)\s+(.+?)(?=Pages?\s*\d+|$)/i, // "Page 1 Description" (space after number, stop at next Page)
        /^Page\s*(\d+)([A-Za-z][^0-9]*?)(?=Pages?\s*\d+|Page\s*\d+|Page\d+|$)/i, // "Page 1Title page" (concatenated, stop at next Page)
        /^Page(\d+)([A-Za-z][^0-9]*?)(?=Pages?\s*\d+|Page\s*\d+|Page\d+|$)/i, // "Page1Title" (no space, stop at next Page)
      ];

      let matched = false;
      for (const pattern of pagePatterns) {
        const pageMatch = line.match(pattern);
        if (pageMatch) {
          const pageRange = pageMatch[1].trim();
          let description = pageMatch[2] ? pageMatch[2].trim() : "";

          // Clean up description - remove any trailing "Page" patterns
          description = description.replace(/^Pages?\s*\d+[:\s]*/i, "").trim();

          // If description is empty or too short, skip
          if (description.length < 2) continue;

          layouts.push({
            pageRange: pageRange,
            description: description,
          });
          matched = true;
          break;
        }
      }

      // Fallback: if line looks like it contains a page number but didn't match patterns
      if (!matched && line.length > 5 && !line.match(/^SECTION/i)) {
        const hasPageNumber = /\d+/.test(line);
        if (hasPageNumber) {
          // Try to extract page number and description manually
          const pageNumMatch = line.match(/(\d+)/);
          if (pageNumMatch) {
            const pageNum = pageNumMatch[1];
            const descStart = pageNumMatch.index + pageNum.length;
            let description = line.substring(descStart).trim();
            // Remove leading colon, dash, or space
            description = description.replace(/^[:\-\s]+/, "").trim();

            if (description.length > 0) {
              layouts.push({
                pageRange: pageNum,
                description: description,
              });
            }
          }
        }
      }
    }

    // Remove duplicates based on pageRange
    const uniqueLayouts = [];
    const seenRanges = new Set();
    for (const layout of layouts) {
      if (!seenRanges.has(layout.pageRange)) {
        seenRanges.add(layout.pageRange);
        uniqueLayouts.push(layout);
      }
    }

    return uniqueLayouts;
  };

  const extractFormattingSummary = () => {
    if (!rawText) return null;

    const patterns = [
      /SECTION\s*C[:\s]+FORMATTING[_\s]*SUMMARY\s*([\s\S]*?)(?=\n\s*SECTION\s*[AB]:|$)/i,
      /SECTION\s*C[:\s]+FORMATTING_SUMMARY\s*([\s\S]*?)(?=\n\s*SECTION\s*[AB]:|$)/i,
      /SECTIONC[:\s]+FORMATTING[_\s]*SUMMARY\s*([\s\S]*?)(?=\n\s*SECTION[AB]:|$)/i,
      /Section\s+C[:\s]+Formatting[_\s]*Summary\s*([\s\S]*?)(?=\n\s*Section\s+[AB]:|$)/i,
      /SECTION\s*C[:\s]*FORMATTING\s*([\s\S]*?)(?=\n\s*SECTION\s*[AB]:|$)/i,
    ];

    let summaryText = null;
    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        summaryText = match[1].trim();
        break;
      }
    }

    if (!summaryText) {
      console.log(
        "[PDFStructureAnalysis] No formatting summary found in rawText"
      );
      return null;
    }

    const summary = {};

    // Extract headings
    const headingsMatch = summaryText.match(/Headings?\s+detected:\s*(\d+)/i);
    if (headingsMatch) {
      summary.headings = parseInt(headingsMatch[1], 10);
    }

    // Extract font styles
    const fontsMatch = summaryText.match(/Font\s+styles?:\s*(\d+)/i);
    if (fontsMatch) {
      summary.fontStyles = parseInt(fontsMatch[1], 10);
    }

    // Extract paragraphs
    const paragraphsMatch = summaryText.match(/Paragraph\s+blocks?:\s*(\d+)/i);
    if (paragraphsMatch) {
      summary.paragraphs = parseInt(paragraphsMatch[1], 10);
    }

    // Extract lists
    const listsMatch = summaryText.match(
      /Lists?:\s*(\d+)\s*bulleted(?:,\s*(\d+)\s*numbered)?/i
    );
    if (listsMatch) {
      summary.bulletedLists = parseInt(listsMatch[1], 10);
      summary.numberedLists = listsMatch[2] ? parseInt(listsMatch[2], 10) : 0;
    }

    // Extract tables
    const tablesMatch = summaryText.match(/Tables?:\s*(\d+)/i);
    if (tablesMatch) {
      summary.tables = parseInt(tablesMatch[1], 10);
    }

    // Extract images
    const imagesMatch = summaryText.match(/Images?:\s*(\d+)/i);
    const metadataImageCount = analysisData?.metadata?.imageCount || 0;

    if (imagesMatch) {
      const aiImageCount = parseInt(imagesMatch[1], 10);
      // Always prefer metadata count if it's greater than 0 and AI says 0
      // This handles cases where AI incorrectly reports 0 images
      if (aiImageCount === 0 && metadataImageCount > 0) {
        summary.images = metadataImageCount;
      } else {
        summary.images = aiImageCount;
      }
    } else {
      // Fallback to metadata image count if AI didn't provide it
      if (metadataImageCount > 0) {
        summary.images = metadataImageCount;
      }
    }

    return summary;
  };

  const parseTreeStructure = (treeText) => {
    if (!treeText) return null;

    // Stop at SECTION B or SECTION C if they appear
    let processedText = treeText;
    const stopPattern = /(SECTION\s*[BC]:|Section\s*[BC]:)/i;
    const stopMatch = processedText.match(stopPattern);
    if (stopMatch) {
      processedText = processedText.substring(0, stopMatch.index).trim();
    }

    // Remove any remaining section markers
    processedText = processedText.replace(/SECTION\s*[A-Z]:\s*/gi, "").trim();

    // Handle case where "Document" is on the same line as tree structure
    if (processedText.match(/^Document[├└]/)) {
      processedText = processedText.replace(/^Document([├└])/, "Document\n$1");
    }

    // Split by newlines - handle both \n and \r\n
    let lines = processedText.split(/\r?\n/);

    // If we only have one or very few lines, the tree might be all on one line
    // Try to split by tree characters (├─ or └─) that appear mid-line
    if (lines.length < 5) {
      // Join all lines and try to split by tree branch characters
      const singleLine = lines.join(" ");
      // Split by ├─ or └─ (positive lookahead to keep the character)
      const splitByBranches = singleLine.split(/(?=[├└])/);
      if (splitByBranches.length > 1) {
        lines = splitByBranches;
      }
    }

    // Also try splitting by │ followed by ├ or └ (for nested structures on one line)
    if (lines.length === 1 && lines[0].includes("│")) {
      // Try to split by patterns like "│   ├─" or "│   └─"
      const splitByNested = lines[0].split(/(?=│\s+[├└])/);
      if (splitByNested.length > 1) {
        lines = splitByNested;
      }
    }

    // Clean and filter lines
    lines = lines
      .map((l) => l.trim())
      .filter((l) => {
        // Filter out empty lines and section markers
        if (!l || l.length === 0) return false;
        if (l.match(/^SECTION\s*[A-Z]:/i)) return false;
        // Include lines that have tree structure or look like content
        if (l.match(/[├└│]/) || l.match(/^[A-Za-z]/)) return true;
        return false;
      });

    // Debug: Log parsed lines
    if (process.env.NODE_ENV === "development") {
      console.log("[PDFStructureAnalysis] Parsed lines count:", lines.length);
      console.log("[PDFStructureAnalysis] First 5 lines:", lines.slice(0, 5));
    }

    const root = { name: "Document", children: [] };
    const stack = [{ node: root, level: -1 }];

    for (const line of lines) {
      // Skip if line is just "Document" (we already have root)
      if (line === "Document" && stack.length === 1) continue;

      // Skip section markers
      if (line.match(/^SECTION\s*[A-Z]:/i)) continue;

      // Calculate depth based on tree structure
      // Pattern examples:
      // "├─ Title" = depth 0
      // "│   ├─ Introduction" = depth 1 (one │ before ├─)
      // "│   │   ├─ Subsection" = depth 2 (two │ before ├─)

      let depth = 0;
      let i = 0;

      // Skip leading spaces
      while (i < line.length && line[i] === " ") {
        i++;
      }

      // Count │ characters - each │ before ├─ or └─ indicates one level deeper
      let foundBranch = false;
      while (i < line.length) {
        if (line[i] === "│") {
          depth++;
          i++;
          // Skip spaces after │
          while (i < line.length && line[i] === " ") {
            i++;
          }
        } else if (line[i] === "├" || line[i] === "└") {
          // Found the branch character, stop counting
          foundBranch = true;
          i += 2; // Skip "├─" or "└─"
          break;
        } else {
          // No tree structure found at start
          break;
        }
      }

      // If no branch character found, this might be a plain text line
      // Try to extract text anyway
      if (!foundBranch) {
        // Check if line starts with text (might be a top-level item without tree chars)
        const textMatch = line.match(/^([^├└│]+)/);
        if (textMatch) {
          i = 0;
          depth = 0;
        } else {
          continue; // Skip this line
        }
      }

      // Extract node text (everything after tree characters)
      let nodeText = line.substring(i).trim();
      // Clean up any remaining tree characters, dashes, trailing pipes, and extra spaces
      nodeText = nodeText
        .replace(/^[├└│─\s]+/, "")
        .replace(/[├└│─\s]+$/, "") // Remove trailing pipes, dashes, and spaces
        .replace(/\|+$/, "") // Specifically remove trailing pipes
        .trim();

      // Skip if no text extracted
      if (!nodeText || nodeText.length === 0) continue;

      // Skip if it's a section marker
      if (nodeText.match(/^SECTION\s*[A-Z]:/i)) continue;

      // Skip if the text is too long (likely contains multiple nodes or section markers)
      // This prevents the entire tree text from being treated as one node
      if (nodeText.length > 200) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[PDFStructureAnalysis] Skipping very long node text:",
            nodeText.substring(0, 100)
          );
        }
        continue;
      }

      // Find parent with lower depth
      while (stack.length > 1 && stack[stack.length - 1].level >= depth) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].node;
      const newNode = { name: nodeText, children: [] };

      // Check for duplicates - don't add if a child with the same name already exists at this level
      const isDuplicate = parent.children.some(
        (child) => child.name === nodeText
      );
      if (isDuplicate) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[PDFStructureAnalysis] Skipping duplicate node:",
            nodeText
          );
        }
        continue;
      }

      parent.children.push(newNode);
      stack.push({ node: newNode, level: depth });
    }

    // Remove duplicate nodes recursively
    const removeDuplicates = (node) => {
      if (!node.children || node.children.length === 0) return;

      // Remove duplicates at this level
      const seen = new Set();
      node.children = node.children.filter((child) => {
        if (seen.has(child.name)) {
          return false;
        }
        seen.add(child.name);
        // Recursively remove duplicates in children
        removeDuplicates(child);
        return true;
      });
    };

    removeDuplicates(root);

    // Debug: Log final tree structure
    if (process.env.NODE_ENV === "development") {
      console.log("[PDFStructureAnalysis] Final parsed tree:", root);
      console.log(
        "[PDFStructureAnalysis] Root children count:",
        root.children?.length || 0
      );
    }

    return root;
  };

  // Convert tree structure to rc-tree format
  const convertToTreeData = useCallback((node, keyPrefix = "0", index = 0) => {
    if (!node || !node.name) {
      return null;
    }

    const key =
      keyPrefix === "0" && index === 0 ? "0" : `${keyPrefix}-${index}`;
    const treeNode = {
      title: node.name,
      key: key,
    };

    if (
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    ) {
      treeNode.children = node.children
        .filter((child) => child && child.name)
        .map((child, idx) => convertToTreeData(child, key, idx))
        .filter((item) => item !== null);
    }

    return treeNode;
  }, []);

  // Extract data after functions are defined
  const structuralMapText = extractStructuralMap();
  const treeStructure = structuralMapText
    ? parseTreeStructure(structuralMapText)
    : null;
  const pageLayouts = extractPageLayouts();
  const formattingSummary = extractFormattingSummary();

  // Debug: Log tree structure
  React.useEffect(() => {
    if (treeStructure && process.env.NODE_ENV === "development") {
      console.log("[PDFStructureAnalysis] Tree structure:", treeStructure);
      console.log(
        "[PDFStructureAnalysis] Tree structure children count:",
        treeStructure.children?.length || 0
      );
      if (treeStructure.children && treeStructure.children.length > 0) {
        const treeData = treeStructure.children.map((child, idx) =>
          convertToTreeData(child, "0", idx)
        );
        console.log("[PDFStructureAnalysis] Converted tree data:", treeData);
        console.log(
          "[PDFStructureAnalysis] First child:",
          treeStructure.children[0]
        );
      } else {
        console.warn("[PDFStructureAnalysis] Tree structure has no children!");
      }
    }
  }, [treeStructure, convertToTreeData]);

  // Initialize expanded keys - expand first 2 levels by default
  React.useEffect(() => {
    if (treeStructure && treeStructure.children) {
      const getAllKeys = (node, level = 0, parentKey = "0", keys = []) => {
        if (level < 2 && node.children && node.children.length > 0) {
          node.children.forEach((child, idx) => {
            const key =
              level === 0 ? `${parentKey}-${idx}` : `${parentKey}-${idx}`;
            keys.push(key);
            getAllKeys(child, level + 1, key, keys);
          });
        }
        return keys;
      };

      // Start from root's children (skip the "Document" root node)
      const initialExpanded = [];
      treeStructure.children.forEach((child, idx) => {
        const key = `0-${idx}`;
        initialExpanded.push(key);
        getAllKeys(child, 1, key, initialExpanded);
      });

      setExpandedKeys(initialExpanded);
    }
  }, [treeStructure]);

  // Debug: Log extraction results
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PDFStructureAnalysis] Extraction results:", {
        hasStructuralMap: !!structuralMapText,
        hasTreeStructure: !!treeStructure,
        pageLayoutsCount: pageLayouts.length,
        hasFormattingSummary: !!formattingSummary,
      });
    }
  }, [structuralMapText, treeStructure, pageLayouts, formattingSummary]);

  // Check if we're receiving overview data instead of structure data
  const isOverviewData =
    rawText &&
    (rawText.includes("DOCUMENT_CATEGORY:") ||
      rawText.includes("SHORT_DESCRIPTION:") ||
      rawText.includes("**Document Overview:**"));

  if (isOverviewData && rawText) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faSitemap} className={styles.emptyIcon} />
          <p
            style={{ color: "#f97316", fontWeight: 600, marginBottom: "1rem" }}
          >
            Structure Analysis Data Not Found
          </p>
          <p style={{ marginBottom: "1rem" }}>
            It looks like overview data was received instead of structure
            analysis data.
          </p>
          <p style={{ fontSize: "0.875rem", color: "#666" }}>
            Please make sure you selected "Structure Analysis" and clicked
            "Generate Insights". If you selected "Analyze All", wait for the
            structure analysis to complete.
          </p>
        </div>
      </div>
    );
  }

  if (!structuralMapText && pageLayouts.length === 0 && !formattingSummary) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faSitemap} className={styles.emptyIcon} />
          <p>No structure analysis available</p>
          {process.env.NODE_ENV === "development" && rawText && (
            <details
              style={{
                marginTop: "1rem",
                fontSize: "0.75rem",
                textAlign: "left",
                maxWidth: "600px",
                margin: "1rem auto 0",
              }}
            >
              <summary style={{ cursor: "pointer", color: "#f97316" }}>
                Debug: Show received data
              </summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "1rem",
                  background: "#f5f5f5",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxHeight: "300px",
                  fontSize: "0.75rem",
                }}
              >
                {rawText.substring(0, 2000)}
                {rawText.length > 2000 && "\n... (truncated)"}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faSitemap} />
        </div>
        <div>
          <h2 className={styles.title}>Structure Analysis</h2>
          <p className={styles.subtitle}>Document organization & layout</p>
        </div>
      </div>

      {/* Section A: Structural Map */}
      {treeStructure && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Structural Map</h3>
          <div className={styles.treeContainer}>
            {treeStructure.children && treeStructure.children.length > 0 ? (
              <Tree
                treeData={treeStructure.children
                  .filter(
                    (child) =>
                      child &&
                      child.name &&
                      child.name.length > 0 &&
                      !child.name.includes("SECTION")
                  )
                  .map((child, idx) => convertToTreeData(child, "0", idx))}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys)}
                defaultExpandAll={false}
                showLine={true}
                showIcon={false}
                className={styles.rcTree}
              />
            ) : (
              <div>
                <p>No structure data available</p>
                {process.env.NODE_ENV === "development" && (
                  <pre
                    style={{
                      fontSize: "0.75rem",
                      marginTop: "1rem",
                      maxHeight: "200px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(treeStructure, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section B: Page Layout Detection */}
      {pageLayouts.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Page Layout Detection</h3>
          <div className={styles.pageLayoutGrid}>
            {pageLayouts.map((layout, idx) => (
              <div key={idx} className={styles.pageLayoutCard}>
                <div className={styles.pageLayoutHeader}>
                  <FontAwesomeIcon
                    icon={faFileAlt}
                    className={styles.pageIcon}
                  />
                  <span className={styles.pageRange}>
                    Page {layout.pageRange} – {layout.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section C: Formatting Summary */}
      {formattingSummary && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Formatting Summary</h3>
          <div className={styles.formattingGrid}>
            {formattingSummary.headings !== undefined && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faHeading}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>Headings</span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.headings}
                  </span>
                </div>
              </div>
            )}
            {formattingSummary.fontStyles !== undefined && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faFont}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>Font Styles</span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.fontStyles}
                  </span>
                </div>
              </div>
            )}
            {formattingSummary.paragraphs !== undefined && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faParagraph}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>
                    Paragraph Blocks
                  </span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.paragraphs}
                  </span>
                </div>
              </div>
            )}
            {(formattingSummary.bulletedLists !== undefined ||
              formattingSummary.numberedLists !== undefined) && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faList}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>Lists</span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.bulletedLists || 0} bulleted
                    {formattingSummary.numberedLists > 0 &&
                      `, ${formattingSummary.numberedLists} numbered`}
                  </span>
                </div>
              </div>
            )}
            {formattingSummary.tables !== undefined && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faTable}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>Tables</span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.tables}
                  </span>
                </div>
              </div>
            )}
            {formattingSummary.images !== undefined && (
              <div className={styles.formattingCard}>
                <div className={styles.formattingCardHeader}>
                  <FontAwesomeIcon
                    icon={faImage}
                    className={styles.formattingIcon}
                  />
                </div>
                <div className={styles.formattingContent}>
                  <span className={styles.formattingLabel}>Images</span>
                  <span className={styles.formattingValue}>
                    {formattingSummary.images}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFStructureAnalysis;
