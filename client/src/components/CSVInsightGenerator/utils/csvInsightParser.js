export const parseCSVInsights = (text) => {
  if (!text) return { sections: [], introText: null };

  const result = {
    introText: null,
    sections: [],
  };

  let lines = text.split('\n');
  
  if (lines.length === 1 && text.includes('SECTION:')) {
    lines = text.split(/(?=SECTION:)/i).filter(l => l.trim());
  }
  
  let currentSection = null;

  console.log('[CSV Parser] Parsing text, total lines:', lines.length);
  console.log('[CSV Parser] First 20 lines:', lines.slice(0, 20));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    if (line.match(/^SECTION:\s*(.+)$/i)) {
      const fullLine = line.replace(/^SECTION:\s*/i, '').trim();
      
      const knownSections = [
        'Document Overview',
        'Key Insights',
        'Regional Insights',
        'Data Quality',
        'Patterns and Trends',
        'Patterns & Trends',
        'AI Summary',
        'Statistical Summary',
        'Column Statistics',
        'Distribution Analysis',
        'Comparative Statistics'
      ];
      
      let sectionName = fullLine;
      let remainingContent = '';
      
      for (const knownSection of knownSections) {
        if (fullLine.startsWith(knownSection)) {
          sectionName = knownSection;
          remainingContent = fullLine.substring(knownSection.length).trim();
          break;
        }
      }
      
      if (sectionName.length > 50 || !knownSections.includes(sectionName)) {
        for (const knownSection of knownSections) {
          const normalizedKnown = knownSection.replace(/\s+/g, '');
          const normalizedFull = fullLine.replace(/\s+/g, '');
          if (normalizedFull.startsWith(normalizedKnown)) {
            sectionName = knownSection;
            const index = fullLine.toLowerCase().indexOf(knownSection.toLowerCase());
            remainingContent = fullLine.substring(index + knownSection.length).trim();
            break;
          }
        }
        
        if (sectionName.length > 50 && !knownSections.includes(sectionName)) {
          for (const knownSection of knownSections) {
            if (fullLine.toLowerCase().includes(knownSection.toLowerCase())) {
              const index = fullLine.toLowerCase().indexOf(knownSection.toLowerCase());
              sectionName = knownSection;
              remainingContent = fullLine.substring(index + knownSection.length).trim();
              break;
            }
          }
          
          if (sectionName.length > 50 && !knownSections.includes(sectionName)) {
            const firstColon = sectionName.indexOf(':');
            if (firstColon > 0 && firstColon < 50) {
              remainingContent = sectionName.substring(firstColon + 1).trim();
              sectionName = sectionName.substring(0, firstColon).trim();
            } else {
              sectionName = sectionName.substring(0, 50).trim();
              remainingContent = fullLine.substring(50).trim();
            }
          }
        }
      }
      
      console.log('[CSV Parser] Found section:', sectionName, 'Remaining:', remainingContent.substring(0, 50));
      
      if (currentSection) {
        console.log('[CSV Parser] Pushing previous section:', currentSection.name, 'with', currentSection.content.length, 'items');
        result.sections.push(currentSection);
      }
      
      currentSection = {
        name: sectionName,
        content: [],
        tables: [],
      };
      
      if (remainingContent && remainingContent.length > 0) {
        const contentLine = remainingContent.trim();
        if (contentLine.includes(':')) {
          const colonIndex = contentLine.indexOf(':');
          const key = contentLine.substring(0, colonIndex).trim();
          const value = contentLine.substring(colonIndex + 1).trim();
          if (key && value) {
            currentSection.content.push({
              type: 'keyValue',
              key: key,
              value: value,
            });
          }
        } else if (contentLine.startsWith('-')) {
          const cleaned = contentLine.replace(/^-\s*/, '').trim();
          if (cleaned.length > 0) {
            currentSection.content.push({
              type: 'bullet',
              text: cleaned,
            });
          }
        } else {
          currentSection.content.push({
            type: 'text',
            text: contentLine,
          });
        }
      }
      
      continue;
    }

    if (line.match(/^\*\*([^*]+)\*\*:?\s*$/)) {
      const sectionName = line.replace(/\*\*/g, '').replace(':', '').trim();
      console.log('[CSV Parser] Found markdown section:', sectionName);
      if (currentSection) {
        console.log('[CSV Parser] Pushing previous section:', currentSection.name, 'with', currentSection.content.length, 'items');
        result.sections.push(currentSection);
      }
      currentSection = {
        name: sectionName,
        content: [],
        tables: [],
      };
      continue;
    }

    if (currentSection) {
      if (line.startsWith('-')) {
        const cleaned = line.replace(/^-\s*/, '').trim();
        if (cleaned.length > 0) {
          currentSection.content.push({
            type: 'bullet',
            text: cleaned,
          });
        }
      } else if (line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (key && value) {
          if (key.endsWith('Summary') || key.endsWith('Analysis') || key.includes('Customer Analysis') || key.match(/^\d+\./)) {
            currentSection.content.push({
              type: 'subsection',
              text: line,
            });
          } else {
            currentSection.content.push({
              type: 'keyValue',
              key: key,
              value: value,
            });
          }
        } else if (key && !value) {
          currentSection.content.push({
            type: 'subsection',
            text: line,
          });
        } else {
          currentSection.content.push({
            type: 'text',
            text: line,
          });
        }
      } else if (line.trim().length > 0 && !line.match(/^SECTION:/i)) {
        currentSection.content.push({
          type: 'text',
          text: line,
        });
      }
    } else if (!result.introText && line.length > 20 && !line.match(/^SECTION:/i) && !line.match(/^\*\*/)) {
      result.introText = line;
    }
  }

  if (currentSection) {
    if (currentSection.name && (currentSection.name.length > 50 || currentSection.content.length === 0)) {
      const fullText = currentSection.name;
      const knownSections = [
        'Document Overview',
        'Key Insights',
        'Regional Insights',
        'Data Quality',
        'Patterns and Trends',
        'Patterns & Trends',
        'AI Summary',
        'Statistical Summary',
        'Column Statistics',
        'Distribution Analysis',
        'Comparative Statistics'
      ];
      
      let actualName = null;
      let contentStart = 0;
      
      for (const knownSection of knownSections) {
        if (fullText.startsWith(knownSection)) {
          actualName = knownSection;
          contentStart = knownSection.length;
          break;
        }
      }
      
      if (!actualName) {
        const firstColon = fullText.indexOf(':');
        if (firstColon > 0 && firstColon < 50) {
          actualName = fullText.substring(0, firstColon).trim();
          contentStart = firstColon + 1;
        } else {
          for (const knownSection of knownSections) {
            if (fullText.includes(knownSection)) {
              const index = fullText.indexOf(knownSection);
              actualName = knownSection;
              contentStart = index + knownSection.length;
              break;
            }
          }
          if (!actualName) {
            actualName = fullText.substring(0, 30).trim();
            contentStart = 30;
          }
        }
      }
      
      currentSection.name = actualName;
      const contentText = fullText.substring(contentStart).trim();
      
      if (contentText && contentText.length > 0) {
        const commonKeys = [
          'File Type', 'Purpose', 'Rows', 'Columns', 'Column Names',
          'Contains Headers', 'Contains Missing Values', 'File Structure Quality',
          'Data Completeness', 'Confidence Score'
        ];
        
        let foundKeys = new Set();
        
        const splitPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):/g;
        const matches = [...contentText.matchAll(splitPattern)];
        
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const key = match[1].trim();
          const keyStart = match.index;
          const keyEnd = keyStart + match[0].length;
          
          let valueEnd = contentText.length;
          if (i + 1 < matches.length) {
            valueEnd = matches[i + 1].index;
          } else {
            const sectionMatch = contentText.substring(keyEnd).match(/SECTION:/i);
            if (sectionMatch) {
              valueEnd = keyEnd + sectionMatch.index;
            }
          }
          
          const value = contentText.substring(keyEnd, valueEnd).trim();
          
          if (key && value && key.length < 100 && value.length < 500 && !foundKeys.has(key)) {
            currentSection.content.push({
              type: 'keyValue',
              key: key,
              value: value,
            });
            foundKeys.add(key);
          }
        }
        
        const bulletMatches = contentText.match(/- [^\n]+/g);
        if (bulletMatches) {
          bulletMatches.forEach(bullet => {
            const cleaned = bullet.replace(/^-\s*/, '').trim();
            if (cleaned && cleaned.length > 0) {
              currentSection.content.push({
                type: 'bullet',
                text: cleaned,
              });
            }
          });
        }
      }
    }
    
    console.log('[CSV Parser] Pushing final section:', currentSection.name, 'with', currentSection.content.length, 'items');
    result.sections.push(currentSection);
  }

  result.sections.forEach(section => {
    if (section.name && (section.name.length > 50 || section.content.length === 0)) {
      const fullText = section.name;
      const knownSections = [
        'Document Overview',
        'Key Insights',
        'Regional Insights',
        'Data Quality',
        'Patterns and Trends',
        'Patterns & Trends',
        'AI Summary',
        'Statistical Summary',
        'Column Statistics',
        'Distribution Analysis',
        'Comparative Statistics'
      ];
      
      let actualName = null;
      let contentStart = 0;
      
      for (const knownSection of knownSections) {
        if (fullText.startsWith(knownSection)) {
          actualName = knownSection;
          contentStart = knownSection.length;
          break;
        }
      }
      
      if (!actualName) {
        for (const knownSection of knownSections) {
          if (fullText.includes(knownSection)) {
            const index = fullText.indexOf(knownSection);
            actualName = knownSection;
            contentStart = index + knownSection.length;
            break;
          }
        }
      }
      
      if (!actualName) {
        const firstColon = fullText.indexOf(':');
        if (firstColon > 0 && firstColon < 50) {
          actualName = fullText.substring(0, firstColon).trim();
          contentStart = firstColon + 1;
        } else {
          actualName = fullText.substring(0, 30).trim();
          contentStart = 30;
        }
      }
      
      section.name = actualName;
      const contentText = fullText.substring(contentStart).trim();
      
      if (contentText && contentText.length > 0) {
        const commonKeys = [
          'File Type', 'Purpose', 'Rows', 'Columns', 'Column Names',
          'Contains Headers', 'Contains Missing Values', 'File Structure Quality',
          'Data Completeness', 'Confidence Score', 'Total Transactions', 'Total Revenue',
          'Average Revenue per Transaction', 'Most Frequent Region', 'Average Quantity Sold',
          'Date Range', 'Products Sold', 'Total Unique Products', 'Top Revenue Product',
          'Lowest Revenue Product', 'Price Range', 'Average Unit Price',
          'Total Unique Customers', 'Average Transactions per Customer'
        ];
        
        let foundKeys = new Set();
        
        const splitPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):/g;
        const matches = [...contentText.matchAll(splitPattern)];
        
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const key = match[1].trim();
          const keyStart = match.index;
          const keyEnd = keyStart + match[0].length;
          
          let valueEnd = contentText.length;
          if (i + 1 < matches.length) {
            valueEnd = matches[i + 1].index;
          } else {
            const sectionMatch = contentText.substring(keyEnd).match(/SECTION:/i);
            if (sectionMatch) {
              valueEnd = keyEnd + sectionMatch.index;
            }
          }
          
          const value = contentText.substring(keyEnd, valueEnd).trim();
          
          if (key && value && key.length < 100 && value.length < 500 && !foundKeys.has(key)) {
            section.content.push({
              type: 'keyValue',
              key: key,
              value: value,
            });
            foundKeys.add(key);
          }
        }
        
        const bulletMatches = contentText.match(/- [^\n]+/g);
        if (bulletMatches) {
          bulletMatches.forEach(bullet => {
            const cleaned = bullet.replace(/^-\s*/, '').trim();
            if (cleaned && cleaned.length > 0 && !section.content.some(c => c.text === cleaned || c.value === cleaned)) {
              section.content.push({
                type: 'bullet',
                text: cleaned,
              });
            }
          });
        }
      }
      
      console.log('[CSV Parser] Fixed section:', section.name, 'now has', section.content.length, 'items');
    }
  });

  console.log('[CSV Parser] Final result:', {
    sectionsCount: result.sections.length,
    sections: result.sections.map(s => ({
      name: s.name,
      contentCount: s.content.length,
      firstFewItems: s.content.slice(0, 3)
    }))
  });

  if (!result.introText && result.sections.length > 0) {
    const firstSection = result.sections[0];
    if (firstSection.content.length > 0) {
      const firstContent = firstSection.content[0];
      result.introText = firstContent.text || `${firstContent.key}: ${firstContent.value}` || '';
    }
  }

  return result;
};

