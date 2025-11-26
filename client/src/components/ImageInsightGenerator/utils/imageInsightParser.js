export const parseImageInsights = (text) => {
  console.log("[ImageInsightParser] ========== PARSING START ==========");
  console.log("[ImageInsightParser] Input text length:", text?.length);
  console.log("[ImageInsightParser] Input text (first 500 chars):", text?.substring(0, 500));
  console.log("[ImageInsightParser] Input text (full):", text);
  
  if (!text) {
    console.log("[ImageInsightParser] No text provided, returning empty result");
    return { sections: [], introText: null };
  }

  const result = {
    introText: null,
    sections: [],
  };

  let lines = text.split('\n');
  
  if (lines.length === 1 && text.includes('SECTION:')) {
    lines = text.split(/(?=SECTION:)/i).filter(l => l.trim());
  }
  
  let currentSection = null;

  const knownSections = [
    'General Overview',
    'Summary',
    'Key Attributes',
    'Image Type',
    'Main Subject',
    'Main Subjects',
    'Dominant Colors',
    'Colors',
    'Layout',
    'Layout Structure',
    'Mood',
    'Overall Mood',
    'Lighting',
    'Key Elements',
    'Objects',
    'Scene Context',
    'Text Content',
    'OCR',
    'Chart Type',
    'Data Insights',
    'Document Type',
    'Structure',
    'Supporting Details',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line starts a new section
    if (line.match(/^SECTION:\s*(.+)$/i)) {
      const fullLine = line.replace(/^SECTION:\s*/i, '').trim();
      
      // Save previous section before starting new one
      if (currentSection) {
        result.sections.push(currentSection);
      }
      
      let sectionName = fullLine;
      let remainingContent = '';
      
      // Try to match known section names
      for (const knownSection of knownSections) {
        if (fullLine.toLowerCase().startsWith(knownSection.toLowerCase())) {
          sectionName = knownSection;
          remainingContent = fullLine.substring(knownSection.length).trim();
          break;
        }
      }
      
      // If no exact match, try normalized matching
      if (!knownSections.includes(sectionName)) {
        for (const knownSection of knownSections) {
          const normalizedKnown = knownSection.replace(/\s+/g, '').toLowerCase();
          const normalizedFull = fullLine.replace(/\s+/g, '').toLowerCase();
          if (normalizedFull.startsWith(normalizedKnown)) {
            sectionName = knownSection;
            const index = fullLine.toLowerCase().indexOf(knownSection.toLowerCase());
            remainingContent = fullLine.substring(index + knownSection.length).trim();
            break;
          }
        }
      }
      
      // If section name is too long, it might have content attached
      if (sectionName.length > 50 && !knownSections.includes(sectionName)) {
        // Try to split at first colon or newline
        const colonIndex = sectionName.indexOf(':');
        if (colonIndex > 0 && colonIndex < 50) {
          remainingContent = sectionName.substring(colonIndex + 1).trim();
          sectionName = sectionName.substring(0, colonIndex).trim();
        }
      }
      
      // Create new section
      currentSection = {
        name: sectionName,
        items: [],
        text: remainingContent || '',
      };
      
      // If there's remaining content on the same line, try to parse it
      if (remainingContent) {
        const keyValueMatch = remainingContent.match(/^([^:]+):\s*(.+)$/);
        if (keyValueMatch) {
          currentSection.items.push({
            type: 'keyValue',
            key: keyValueMatch[1].trim(),
            value: keyValueMatch[2].trim(),
          });
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
          if (!key.toLowerCase().includes('section') && value.length > 0) {
            currentSection.items.push({
              type: 'keyValue',
              key: key,
              value: value,
              label: key, // Also add as label for compatibility
            });
            // Also add to section text for fallback extraction
            if (!currentSection.text) {
              currentSection.text = trimmedLine;
            } else {
              currentSection.text += '\n' + trimmedLine;
            }
          }
        }
      } else if (trimmedLine.match(/^[-•]\s*(.+)$/)) {
        // Bullet point
        currentSection.items.push({
          type: 'bullet',
          text: trimmedLine.replace(/^[-•]\s*/, '').trim(),
        });
      } else if (trimmedLine.length > 0) {
        // Regular text - append to section text
        if (!currentSection.text) {
          currentSection.text = trimmedLine;
        } else {
          currentSection.text += '\n' + trimmedLine;
        }
      }
    } else {
      // Text before any section
      if (!result.introText) {
        result.introText = line;
      } else {
        result.introText += ' ' + line;
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
  console.log("[ImageInsightParser] Result sections count:", result.sections.length);
  result.sections.forEach((section, idx) => {
    console.log(`[ImageInsightParser] Section ${idx}:`, {
      name: section.name,
      itemsCount: section.items?.length || 0,
      items: section.items,
      textPreview: section.text?.substring(0, 100)
    });
  });
  console.log("[ImageInsightParser] Full result:", JSON.stringify(result, null, 2));
  console.log("[ImageInsightParser] ========== PARSING END ==========");

  return result;
};

