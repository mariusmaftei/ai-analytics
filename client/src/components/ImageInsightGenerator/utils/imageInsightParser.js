export const parseImageInsights = (text) => {
  console.log("[ImageInsightParser] ========== PARSING START ==========");
  console.log("[ImageInsightParser] Input text length:", text?.length);
  console.log(
    "[ImageInsightParser] Input text (first 500 chars):",
    text?.substring(0, 500)
  );
  console.log("[ImageInsightParser] Input text (full):", text);

  if (!text) {
    console.log(
      "[ImageInsightParser] No text provided, returning empty result"
    );
    return { sections: [], introText: null };
  }

  const result = {
    introText: null,
    sections: [],
  };

  // First, split by SECTION: markers to handle cases where sections are concatenated
  let lines = text.split(/(?=SECTION:)/i).filter((l) => l.trim());

  // Further split any line that contains multiple SECTION: markers
  const expandedLines = [];
  for (const line of lines) {
    const sectionMatches = line.matchAll(/SECTION:/gi);
    const matches = Array.from(sectionMatches);
    if (matches.length > 1) {
      // Split this line at each SECTION: marker
      let lastIndex = 0;
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (i > 0) {
          // Add the previous section
          expandedLines.push(line.substring(lastIndex, match.index).trim());
        }
        lastIndex = match.index;
      }
      // Add the last section
      expandedLines.push(line.substring(lastIndex).trim());
    } else {
      expandedLines.push(line);
    }
  }
  lines = expandedLines.filter((l) => l.trim());

  // If no SECTION: markers found, fall back to line-by-line
  if (lines.length === 1 && !text.includes("SECTION:")) {
    lines = text.split("\n");
  }

  let currentSection = null;

  const knownSections = [
    "General Overview",
    "Summary",
    "Scene Summary",
    "Key Attributes",
    "Image Type",
    "Main Subject",
    "Main Subjects",
    "Dominant Colors",
    "Colors",
    "Layout",
    "Layout Structure",
    "Mood",
    "Overall Mood",
    "Lighting",
    "Lighting & Atmosphere",
    "Key Elements",
    "Objects",
    "Objects & Furniture Context",
    "Objects & Furniture",
    "Environment",
    "Activity / Human Context",
    "Activity",
    "Human Context",
    "Scene Interpretation",
    "Scene Metadata",
    "Scene Context",
    "Text Content",
    "OCR",
    "Chart Type",
    "Data Insights",
    "Document Type",
    "Structure",
    "Supporting Details",
    "Tags",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line starts a new section
    if (line.match(/^SECTION:\s*(.+)$/i)) {
      const fullLine = line.replace(/^SECTION:\s*/i, "").trim();

      // Save previous section before starting new one
      if (currentSection) {
        result.sections.push(currentSection);
      }

      let sectionName = fullLine;
      let remainingContent = "";

      // Try to match known section names (longest match first)
      const sortedKnownSections = [...knownSections].sort(
        (a, b) => b.length - a.length
      );
      for (const knownSection of sortedKnownSections) {
        const knownLower = knownSection.toLowerCase();
        const fullLower = fullLine.toLowerCase();

        // Check if line starts with known section name
        if (fullLower.startsWith(knownLower)) {
          sectionName = knownSection;
          remainingContent = fullLine.substring(knownSection.length).trim();
          // Remove leading punctuation or connectors
          remainingContent = remainingContent.replace(/^[.,;:\s]+/, "").trim();
          break;
        }
      }

      // If no exact match, try normalized matching
      if (!knownSections.includes(sectionName)) {
        for (const knownSection of sortedKnownSections) {
          const normalizedKnown = knownSection
            .replace(/\s+/g, "")
            .toLowerCase();
          const normalizedFull = fullLine.replace(/\s+/g, "").toLowerCase();
          if (normalizedFull.startsWith(normalizedKnown)) {
            sectionName = knownSection;
            // Find the actual position in original string
            const index = fullLine
              .toLowerCase()
              .indexOf(knownSection.toLowerCase());
            remainingContent = fullLine
              .substring(index + knownSection.length)
              .trim();
            remainingContent = remainingContent
              .replace(/^[.,;:\s]+/, "")
              .trim();
            break;
          }
        }
      }

      // If section name is too long and not in known sections, try to extract just the name
      if (sectionName.length > 60 && !knownSections.includes(sectionName)) {
        // Look for common patterns: stop at first sentence end, colon, or newline
        const stopPattern = /[.:]\s|$/;
        const match = sectionName.match(/^(.{0,60}?)([.:]\s|$)/);
        if (match && match[1].trim().length > 5) {
          remainingContent = sectionName.substring(match[1].length).trim();
          sectionName = match[1].trim();
        }
      }

      // Create new section
      currentSection = {
        name: sectionName,
        items: [],
        text: remainingContent || "",
      };

      // If there's remaining content on the same line, add it to section text
      // It will be parsed later by postProcessSection
      if (remainingContent) {
        // Check if it's a key-value pair
        const keyValueMatch = remainingContent.match(
          /^([A-Za-z][A-Za-z0-9\s/&]+?):\s*(.+)$/
        );
        if (keyValueMatch) {
          currentSection.items.push({
            type: "keyValue",
            key: keyValueMatch[1].trim(),
            value: keyValueMatch[2].trim(),
            label: keyValueMatch[1].trim(),
          });
        }
        // Always add to text for fallback parsing
        if (!currentSection.text) {
          currentSection.text = remainingContent;
        }
      }
    } else if (currentSection) {
      // This line belongs to the current section
      const trimmedLine = line.trim();

      // Check if it's a key-value pair (e.g., "Image Type: photo")
      // More robust pattern: field name followed by colon and value
      const keyValuePattern = /^([A-Za-z][A-Za-z0-9\s/&]+?):\s*(.+)$/;
      if (keyValuePattern.test(trimmedLine)) {
        const keyValueMatch = trimmedLine.match(keyValuePattern);
        if (keyValueMatch) {
          const key = keyValueMatch[1].trim();
          const value = keyValueMatch[2].trim();

          // Skip if it looks like another section header
          if (!key.toLowerCase().includes("section") && value.length > 0) {
            currentSection.items.push({
              type: "keyValue",
              key: key,
              value: value,
              label: key, // Also add as label for compatibility
            });
            // Also add to section text for fallback extraction
            if (!currentSection.text) {
              currentSection.text = trimmedLine;
            } else {
              currentSection.text += "\n" + trimmedLine;
            }
          }
        }
      } else if (trimmedLine.match(/^[-•]\s*(.+)$/)) {
        // Bullet point
        currentSection.items.push({
          type: "bullet",
          text: trimmedLine.replace(/^[-•]\s*/, "").trim(),
        });
      } else if (trimmedLine.length > 0) {
        // Regular text - append to section text
        if (!currentSection.text) {
          currentSection.text = trimmedLine;
        } else {
          currentSection.text += "\n" + trimmedLine;
        }
      }
    } else {
      // Text before any section
      if (!result.introText) {
        result.introText = line;
      } else {
        result.introText += " " + line;
      }
    }
  }

  const postProcessSection = (section) => {
    if (!section) return section;
    section.items = section.items || [];
    if (section.text) {
      section.text = section.text.trim();
      const pattern =
        /([A-Za-z][A-Za-z0-9\s/&]+?):\s*([^:]+?)(?=(?:\s+[A-Za-z][A-Za-z0-9\s/&]+:\s)|$)/g;
      let match;
      while ((match = pattern.exec(section.text)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (
          !section.items.some(
            (item) => (item.key || "").toLowerCase() === key.toLowerCase()
          )
        ) {
          section.items.push({
            type: "keyValue",
            key,
            value,
          });
        }
      }
    }
    return section;
  };

  if (currentSection) {
    result.sections.push(postProcessSection(currentSection));
  }

  result.sections = result.sections.map(postProcessSection);

  console.log("[ImageInsightParser] ========== PARSING RESULT ==========");
  console.log(
    "[ImageInsightParser] Result sections count:",
    result.sections.length
  );
  result.sections.forEach((section, idx) => {
    console.log(`[ImageInsightParser] Section ${idx}:`, {
      name: section.name,
      itemsCount: section.items?.length || 0,
      items: section.items?.slice(0, 3), // Show first 3 items
      textPreview: section.text?.substring(0, 100),
      hasText: !!section.text,
      textLength: section.text?.length || 0,
    });
  });
  console.log(
    "[ImageInsightParser] Full result (sections only):",
    JSON.stringify(
      result.sections.map((s) => ({
        name: s.name,
        itemsCount: s.items?.length || 0,
        textLength: s.text?.length || 0,
      })),
      null,
      2
    )
  );
  console.log("[ImageInsightParser] ========== PARSING END ==========");

  return result;
};
