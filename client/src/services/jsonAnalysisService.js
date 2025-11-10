/**
 * JSON Analysis Service - Analyze JSON files client-side
 */

/**
 * Analyze JSON file and extract structure, metadata, and insights
 * @param {File} file - The JSON file to analyze
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeJSONFile = async (file) => {
  try {
    const fileText = await file.text();
    const jsonData = JSON.parse(fileText);
    
    const analysis = analyzeJSONStructure(jsonData, file.name);
    
    return {
      fileType: 'JSON',
      success: true,
      data: analysis.data,
      columns: analysis.columns,
      metadata: {
        totalRecords: analysis.totalRecords,
        totalKeys: analysis.totalKeys,
        structureType: analysis.structureType,
        nestingLevel: analysis.nestingLevel,
        fileSize: file.size,
      },
      insights: {
        summary: analysis.summary,
        patterns: analysis.patterns,
      },
      rawData: jsonData,
      text: fileText.substring(0, 5000), // Store first 5000 chars for preview
    };
  } catch (error) {
    console.error('JSON Analysis Error:', error);
    throw new Error(`Failed to analyze JSON: ${error.message}`);
  }
};

/**
 * Analyze JSON structure and extract insights
 */
function analyzeJSONStructure(data, fileName) {
  const structureType = Array.isArray(data) ? 'array' : 'object';
  let totalRecords = 0;
  let columns = [];
  let flatData = [];
  let totalKeys = 0;
  let nestingLevel = 0;
  
  if (Array.isArray(data)) {
    totalRecords = data.length;
    
    if (data.length > 0) {
      // Analyze first item to get structure
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        columns = Object.keys(firstItem);
        totalKeys = columns.length;
        
        // Flatten data for preview (first 100 items)
        flatData = data.slice(0, 100).map(item => {
          const row = {};
          columns.forEach(key => {
            const value = item[key];
            if (value === null || value === undefined) {
              row[key] = '';
            } else if (typeof value === 'object') {
              row[key] = JSON.stringify(value);
            } else {
              row[key] = String(value);
            }
          });
          return row;
        });
        
        // Calculate nesting level
        nestingLevel = calculateNestingLevel(firstItem);
      } else {
        // Array of primitives
        columns = ['value'];
        flatData = data.slice(0, 100).map(item => ({ value: String(item) }));
        totalKeys = 1;
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Single object
    totalRecords = 1;
    columns = Object.keys(data);
    totalKeys = columns.length;
    
    const row = {};
    columns.forEach(key => {
      const value = data[key];
      if (value === null || value === undefined) {
        row[key] = '';
      } else if (typeof value === 'object') {
        row[key] = JSON.stringify(value);
      } else {
        row[key] = String(value);
      }
    });
    flatData = [row];
    
    nestingLevel = calculateNestingLevel(data);
  }
  
  // Generate summary and patterns
  const summary = generateSummary(data, totalRecords, totalKeys, structureType, fileName);
  const patterns = generatePatterns(data, totalRecords, totalKeys, structureType, nestingLevel);
  
  return {
    data: flatData,
    columns,
    totalRecords,
    totalKeys,
    structureType,
    nestingLevel,
    summary,
    patterns,
  };
}

/**
 * Calculate maximum nesting level in JSON structure
 */
function calculateNestingLevel(obj, currentLevel = 0) {
  if (typeof obj !== 'object' || obj === null) {
    return currentLevel;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentLevel;
    return Math.max(...obj.map(item => calculateNestingLevel(item, currentLevel + 1)));
  }
  
  const values = Object.values(obj);
  if (values.length === 0) return currentLevel;
  
  return Math.max(...values.map(value => calculateNestingLevel(value, currentLevel + 1)));
}

/**
 * Generate summary text
 */
function generateSummary(data, totalRecords, totalKeys, structureType, fileName) {
  if (structureType === 'array') {
    if (totalRecords === 0) {
      return `This JSON file contains an empty array.`;
    }
    if (totalKeys > 0) {
      return `This JSON file contains an array with ${totalRecords.toLocaleString()} ${totalRecords === 1 ? 'object' : 'objects'}, each having ${totalKeys} ${totalKeys === 1 ? 'field' : 'fields'}.`;
    }
    return `This JSON file contains an array with ${totalRecords.toLocaleString()} ${totalRecords === 1 ? 'item' : 'items'}.`;
  } else {
    return `This JSON file contains a single object with ${totalKeys} ${totalKeys === 1 ? 'field' : 'fields'}.`;
  }
}

/**
 * Generate insight patterns
 */
function generatePatterns(data, totalRecords, totalKeys, structureType, nestingLevel) {
  const patterns = [];
  
  if (structureType === 'array') {
    patterns.push(`Array structure with ${totalRecords.toLocaleString()} ${totalRecords === 1 ? 'record' : 'records'}`);
  } else {
    patterns.push('Single object structure');
  }
  
  if (totalKeys > 0) {
    patterns.push(`${totalKeys} ${totalKeys === 1 ? 'field' : 'fields'} per ${structureType === 'array' ? 'record' : 'object'}`);
  }
  
  if (nestingLevel > 1) {
    patterns.push(`Nested structure (${nestingLevel} levels deep)`);
  }
  
  // Analyze data types if it's an array of objects
  if (structureType === 'array' && Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const sample = data[0];
    const dataTypes = {};
    
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      let type = typeof value;
      if (value === null) type = 'null';
      else if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object') type = 'object';
      
      dataTypes[type] = (dataTypes[type] || 0) + 1;
    });
    
    const typeCounts = Object.entries(dataTypes)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    if (typeCounts) {
      patterns.push(`Field types: ${typeCounts}`);
    }
  }
  
  return patterns;
}

