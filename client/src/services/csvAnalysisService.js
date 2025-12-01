/**
 * CSV Analysis Service - Analyze CSV files client-side
 */

/**
 * Analyze CSV file and extract structure, metadata, and insights
 * @param {File} file - The CSV file to analyze
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeCSVFile = async (file) => {
  try {
    const fileText = await file.text();
    const csvData = parseCSV(fileText);
    
    const analysis = analyzeCSVStructure(csvData, file.name);
    
    return {
      fileType: 'CSV',
      success: true,
      data: analysis.data,
      columns: analysis.columns,
      metadata: {
        totalRows: analysis.totalRows,
        totalColumns: analysis.totalColumns,
        fileSize: file.size,
        hasHeaders: analysis.hasHeaders,
      },
      insights: {
        summary: analysis.summary,
        patterns: analysis.patterns,
      },
      text: fileText.substring(0, 5000), // Store first 5000 chars for preview
    };
  } catch (error) {
    console.error('CSV Analysis Error:', error);
    throw new Error(`Failed to analyze CSV: ${error.message}`);
  }
};

/**
 * Parse CSV text into structured data
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Try to detect delimiter
  const delimiters = [',', ';', '\t', '|'];
  let delimiter = ',';
  let maxFields = 0;
  
  for (const delim of delimiters) {
    const fieldCount = lines[0].split(delim).length;
    if (fieldCount > maxFields) {
      maxFields = fieldCount;
      delimiter = delim;
    }
  }
  
  // Parse CSV with proper handling of quoted fields
  const parseLine = (line) => {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    fields.push(currentField.trim());
    return fields;
  };
  
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => parseLine(line));
  
  return { headers, rows, delimiter };
}

/**
 * Analyze CSV structure and extract insights
 */
function analyzeCSVStructure(csvData, fileName) {
  const { headers, rows } = csvData;
  const totalRows = rows.length;
  const totalColumns = headers.length;
  const hasHeaders = headers.length > 0 && headers.some(h => h.length > 0);
  
  // Prepare data for preview (first 100 rows)
  const previewRows = rows.slice(0, 100).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header || `Column${index + 1}`] = row[index] || '';
    });
    return obj;
  });
  
  // Analyze data types for each column
  const columnTypes = {};
  const sampleSize = Math.min(100, totalRows);
  
  headers.forEach((header, colIndex) => {
    const values = rows.slice(0, sampleSize)
      .map(row => row[colIndex])
      .filter(val => val !== null && val !== undefined && val !== '');
    
    if (values.length === 0) {
      columnTypes[header] = 'empty';
      return;
    }
    
    // Data type detection removed (currently not used)
    // Default to string type
    columnTypes[header] = 'string';
  });
  
  // Generate summary and patterns
  const summary = generateSummary(totalRows, totalColumns, hasHeaders, fileName);
  const patterns = generatePatterns(totalRows, totalColumns, columnTypes, hasHeaders);
  
  return {
    data: previewRows,
    columns: headers,
    totalRows,
    totalColumns,
    hasHeaders,
    columnTypes,
    summary,
    patterns,
  };
}

/**
 * Generate summary text
 */
function generateSummary(totalRows, totalColumns, hasHeaders, fileName) {
  if (totalRows === 0) {
    return `This CSV file appears to be empty or contains only headers.`;
  }
  
  const rowText = totalRows === 1 ? 'row' : 'rows';
  const colText = totalColumns === 1 ? 'column' : 'columns';
  
  return `This CSV file contains ${totalRows.toLocaleString()} ${rowText} with ${totalColumns} ${colText}${hasHeaders ? ' (with headers)' : ' (no headers detected)'}.`;
}

/**
 * Generate insight patterns
 */
function generatePatterns(totalRows, totalColumns, columnTypes, hasHeaders) {
  const patterns = [];
  
  patterns.push(`${totalRows.toLocaleString()} ${totalRows === 1 ? 'row' : 'rows'} of data`);
  patterns.push(`${totalColumns} ${totalColumns === 1 ? 'column' : 'columns'}`);
  
  if (hasHeaders) {
    patterns.push('Header row detected');
  } else {
    patterns.push('No header row detected');
  }
  
  // Count data types
  const typeCounts = {};
  Object.values(columnTypes).forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  const typeDescriptions = [];
  if (typeCounts.number) {
    typeDescriptions.push(`${typeCounts.number} numeric`);
  }
  if (typeCounts.text) {
    typeDescriptions.push(`${typeCounts.text} text`);
  }
  if (typeCounts.date) {
    typeDescriptions.push(`${typeCounts.date} date`);
  }
  if (typeCounts.boolean) {
    typeDescriptions.push(`${typeCounts.boolean} boolean`);
  }
  
  if (typeDescriptions.length > 0) {
    patterns.push(`Column types: ${typeDescriptions.join(', ')}`);
  }
  
  // Check for empty columns
  const emptyColumns = Object.values(columnTypes).filter(type => type === 'empty').length;
  if (emptyColumns > 0) {
    patterns.push(`${emptyColumns} ${emptyColumns === 1 ? 'column is' : 'columns are'} empty`);
  }
  
  return patterns;
}

