export const parseAudioInsights = (text) => {
  if (!text || typeof text !== "string") {
    return {
      sections: [],
      metadata: [],
      introText: "",
    };
  }

  // Clean up the text - remove extra whitespace and normalize
  let cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Remove "Audio Overview" or similar title at the start if present
  cleanedText = cleanedText.replace(/^Audio\s+Overview\s*\n*/i, "");
  
  // Remove standalone words like "Performance" that appear before SECTION:
  // This handles cases like "PerformanceSECTION:" where "Performance" is not a section
  // Match word(s) followed immediately by SECTION: (no newline between)
  cleanedText = cleanedText.replace(/^([A-Za-z\s]+?)(?=\s*SECTION:)/i, "");
  
  // Add newline before SECTION: if it's missing (handles cases like "TextSECTION:")
  cleanedText = cleanedText.replace(/([^\n])(SECTION:)/gi, "$1\n$2");
  
  // Clean up any remaining leading/trailing whitespace
  cleanedText = cleanedText.trim();
  
  // Normalize multiple newlines
  cleanedText = cleanedText.replace(/\n{3,}/g, "\n\n");

  const sections = [];
  const metadata = [];
  let introText = "";

  // Improved regex to handle sections better
  // Matches "SECTION: Name" followed by content until next "SECTION:" or end
  const sectionRegex = /SECTION:\s*([^\n]+)\s*\n([\s\S]*?)(?=\n\s*SECTION:|$)/gi;
  let sectionMatch;
  let lastIndex = 0;
  let firstSectionIndex = -1;

  while ((sectionMatch = sectionRegex.exec(cleanedText)) !== null) {
    // Capture any text before the first section as intro
    if (firstSectionIndex === -1) {
      firstSectionIndex = sectionMatch.index;
      if (sectionMatch.index > 0) {
        introText = cleanedText.substring(0, sectionMatch.index).trim();
      }
    }

    const sectionName = sectionMatch[1].trim();
    let sectionContent = sectionMatch[2].trim();

    // Clean up section content - remove extra blank lines but keep single blank lines
    sectionContent = sectionContent.replace(/\n{3,}/g, "\n\n");

    const content = parseSectionContent(sectionContent);

    if (content.length > 0 || sectionContent.length > 0) {
      sections.push({
        name: sectionName,
        content: content,
        text: sectionContent,
      });
    }

    lastIndex = sectionRegex.lastIndex;
  }

  // If no sections found, try to parse as unstructured text
  if (sections.length === 0) {
    const lines = cleanedText.split("\n").filter((line) => line.trim());
    introText = lines.slice(0, 3).join(" ");

    const content = parseSectionContent(cleanedText);
    if (content.length > 0) {
      sections.push({
        name: "Overview",
        content: content,
        text: cleanedText,
      });
    }
  }

  return {
    sections,
    metadata,
    introText,
  };
};

const parseSectionContent = (text) => {
  const content = [];
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip empty lines and section markers
    if (!line || line.match(/^SECTION:/i)) continue;

    // Handle bullet points (various formats)
    if (line.match(/^[-•*]\s+/)) {
      const bulletText = line.replace(/^[-•*]\s+/, "").trim();
      if (bulletText) {
        content.push({
          type: "bullet",
          text: bulletText,
        });
      }
    } 
    // Handle key-value pairs (must have colon and both key and value)
    else if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // For Description field only, collect multi-line content until next key-value pair or section
      if (key.toLowerCase().includes("description")) {
        // Collect lines until we hit the next key-value pair or section
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          // Stop if we hit a section marker
          if (nextLine.match(/^SECTION:/i)) break;
          // Stop if next line is a key-value pair (has colon and looks like a key, not a bullet)
          if (nextLine.includes(":") && !nextLine.match(/^[-•*]/)) {
            const nextColonIndex = nextLine.indexOf(":");
            const nextKey = nextLine.substring(0, nextColonIndex).trim();
            // If next line looks like a key-value pair (key doesn't start with dash/bullet and is reasonable length), stop
            if (nextKey && !nextKey.match(/^[-•*]/) && nextKey.length < 100) {
              break;
            }
          }
          // Stop if next line is a bullet point
          if (nextLine.match(/^[-•*]\s+/)) break;
          
          // Append next line to value if it doesn't look like a new key-value pair
          if (nextLine && !nextLine.includes(":") || (nextLine.includes(":") && nextLine.match(/^[-•*]/))) {
            value += " " + nextLine;
          } else {
            break;
          }
          j++;
        }
        
        // Remove any prefixes like "Music", "Audio", etc.
        value = value.replace(/^(Music|Audio|Recording|Performance)\s*/i, "");
        // Remove any field names that might be concatenated before the description
        value = value.replace(/^(Artist|Performer|Album|Collection|Type of Music|Type of Content|Genre):\s*[^\s]+\s*/gi, "");
        // Split value at SECTION: marker and take only the first part (most important)
        value = value.split(/\s*SECTION:/i)[0].trim();
        value = value.split(/\s*SECTION\s*:/i)[0].trim();
        // Also stop at other section-like markers
        value = value.split(/\n\s*(?=Key Statistics|Content Summary|Participants|Quality|AI Summary|Audio Description|Audio Overview)/i)[0].trim();
        // Remove any remaining SECTION: markers
        value = value.replace(/SECTION:\s*/gi, "").trim();
        // Limit to first 2-3 sentences for brevity
        const sentences = value.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 3) {
          value = sentences.slice(0, 3).join(". ").trim();
          if (!value.match(/[.!?]$/)) {
            value += ".";
          }
        }
      }
      // For all other fields, just take the value from the current line only
      // (they should be single-line values)

      // Clean up value - remove extra spaces
      value = value.replace(/\s+/g, " ").trim();
      
      // Remove any trailing key-value patterns that might have been included
      // (e.g., if "MerusiaAlbum/Collection" got concatenated)
      if (!key.toLowerCase().includes("description")) {
        // Remove patterns like "ValueAlbum/Collection:" from the end
        value = value.replace(/\s*Album\/Collection:\s*.*$/i, "").trim();
        value = value.replace(/\s*Collection:\s*.*$/i, "").trim();
        // Remove patterns like "ValueType of Music:" etc.
        value = value.replace(/\s*Type of Music\/Content:\s*.*$/i, "").trim();
        value = value.replace(/\s*Type of Content:\s*.*$/i, "").trim();
        value = value.replace(/\s*Genre:\s*.*$/i, "").trim();
        value = value.replace(/\s*Description:\s*.*$/i, "").trim();
        // Remove any remaining key-value patterns
        value = value.replace(/\s*[A-Z][a-z]+(\/[A-Z][a-z]+)?:\s*.*$/i, "").trim();
      }

      if (key && value) {
        // Skip if it looks like a section header
        if (!key.match(/^SECTION$/i)) {
          content.push({
            type: "keyValue",
            key: key,
            value: value,
          });
        }
      } else if (line.length > 0) {
        // If no valid key-value, treat as text
        content.push({
          type: "text",
          text: line,
        });
      }
    } 
    // Regular text lines
    else if (line.length > 0) {
      content.push({
        type: "text",
        text: line,
      });
    }
  }

  return content;
};

