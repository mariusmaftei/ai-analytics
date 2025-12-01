import React, { useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faChartBar,
  faLayerGroup,
  faSearch,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PDFKeywordsExtraction.module.css";

const PDFKeywordsExtraction = ({ data, rawText, analysisData }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const extractKeywords = useCallback(() => {
    if (!rawText) return { frequencies: [], clusters: [], allKeywords: [] };

    // Extract SECTION A: KEYWORD_FREQUENCY
    // Handle both "SECTION A:" and "SECTIONA:" (with or without space)
    const sectionAPatterns = [
      /SECTION\s*A[:\s]+KEYWORD[_\s]*FREQUENCY\s*([\s\S]*?)(?=\n\s*SECTION\s*[BC]:|SECTION\s*B[:\s]+TOPIC|SECTION\s*C[:\s]+KEYWORDS|$)/i,
      /SECTION\s*A[:\s]+KEYWORD_FREQUENCY\s*([\s\S]*?)(?=\n\s*SECTION\s*[BC]:|SECTION\s*B[:\s]+TOPIC|SECTION\s*C[:\s]+KEYWORDS|$)/i,
      /SECTIONA[:\s]+KEYWORD[_\s]*FREQUENCY\s*([\s\S]*?)(?=\n\s*SECTION[BC]:|SECTIONB[:\s]+TOPIC|SECTIONC[:\s]+KEYWORDS|$)/i,
      /SECTIONA[:\s]+KEYWORD_FREQUENCY\s*([\s\S]*?)(?=\n\s*SECTION[BC]:|SECTIONB[:\s]+TOPIC|SECTIONC[:\s]+KEYWORDS|$)/i,
      /Section\s+A[:\s]+Keyword[_\s]*Frequency\s*([\s\S]*?)(?=\n\s*Section\s+[BC]:|Section\s+B[:\s]+Topic|Section\s+C[:\s]+Keywords|$)/i,
    ];

    let sectionAText = null;
    for (const pattern of sectionAPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        sectionAText = match[1].trim();
        break;
      }
    }

    // If no section found, try to find frequency patterns in the entire text
    // Look for patterns that indicate keyword frequency data
    const frequencies = [];
    const textToSearch = sectionAText || rawText;
    const lines = textToSearch.split("\n");

    // First, try global pattern matching on the entire section text
    // This handles cases where all keywords are on one line
    const globalFrequencyPattern = /([A-Za-z0-9][A-Za-z0-9\s&-]+?)\s*\((\d+)\)/g;
    const fullText = textToSearch.replace(/\n/g, " ");
    let globalMatch;
    
    while ((globalMatch = globalFrequencyPattern.exec(fullText)) !== null) {
      const keyword = globalMatch[1].trim();
      const count = parseInt(globalMatch[2], 10);
      
      // Validate keyword and count
      if (
        keyword.length > 1 && 
        keyword.length < 50 &&
        count > 0 && 
        count < 10000 &&
        !keyword.match(/^SECTION/i) &&
        !keyword.match(/^Cluster:/i) &&
        !keyword.toLowerCase().match(/^(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were)$/i)
      ) {
        // Check if we already have this keyword (avoid duplicates)
        const existing = frequencies.find(f => f.keyword.toLowerCase() === keyword.toLowerCase());
        if (!existing) {
          frequencies.push({ keyword, count });
        } else if (existing.count < count) {
          existing.count = count;
        }
      }
    }

    // Also parse line by line for other formats
    // Extract keyword frequency from raw text
    // Format: "Word (count)" or "Word: count" or "Word count"
    // Handle cases like "Scarlett 2i2 (20)" or "OS(2)" (no space before parenthesis)
    const frequencyPatterns = [
      /^([A-Za-z0-9][A-Za-z0-9\s&-]+?)\s*\((\d+)\)\s*$/m, // "Revenue (32)" or "Scarlett 2i2 (20)" or "OS(2)"
      /^([A-Za-z0-9][A-Za-z0-9\s&-]+?):\s*(\d+)\s*$/m, // "Revenue: 32"
      /^([A-Za-z0-9][A-Za-z0-9\s&-]+?)\s+(\d+)\s*$/m, // "Revenue 32" (space separated)
    ];

    for (const line of lines) {
      // Skip section markers and empty lines
      if (line.match(/^SECTION\s*[A-Z]:/i)) continue;
      if (!line.trim()) continue;
      
      // Try each pattern
      for (const pattern of frequencyPatterns) {
        const match = line.trim().match(pattern);
        if (match) {
          const keyword = match[1].trim();
          const count = parseInt(match[2], 10);
          
          // Validate keyword and count
          if (
            keyword.length > 1 && 
            keyword.length < 50 && // Reasonable keyword length
            count > 0 && 
            count < 10000 && // Reasonable count
            !keyword.match(/^SECTION/i) &&
            !keyword.match(/^Cluster:/i) &&
            !keyword.toLowerCase().match(/^(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were)$/i) // Skip common words
          ) {
            // Check if we already have this keyword (avoid duplicates)
            const existing = frequencies.find(f => f.keyword.toLowerCase() === keyword.toLowerCase());
            if (!existing) {
              frequencies.push({ keyword, count });
            } else if (existing.count < count) {
              // Update with higher count if found
              existing.count = count;
            }
            break;
          }
        }
      }
    }

    // Extract SECTION B: TOPIC_CLUSTERS
    const sectionBPatterns = [
      /SECTION\s*B[:\s]+TOPIC[_\s]*CLUSTERS\s*([\s\S]*?)(?=\n\s*SECTION\s*[AC]:|SECTION\s*C[:\s]+KEYWORDS|$)/i,
      /SECTION\s*B[:\s]+TOPIC_CLUSTERS\s*([\s\S]*?)(?=\n\s*SECTION\s*[AC]:|SECTION\s*C[:\s]+KEYWORDS|$)/i,
      /SECTIONB[:\s]+TOPIC[_\s]*CLUSTERS\s*([\s\S]*?)(?=\n\s*SECTION[AC]:|SECTIONC[:\s]+KEYWORDS|$)/i,
    ];

    let sectionBText = null;
    for (const pattern of sectionBPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        sectionBText = match[1].trim();
        break;
      }
    }

    // Extract topic clusters
    // Format: "Cluster: Topic Name" followed by keywords
    // Handle cases where clusters might be concatenated on one line
    const clusters = [];
    
    if (sectionBText) {
      // Handle concatenated clusters on one line
      // Pattern: "ClusterName- Keyword1- Keyword2Cluster: NextCluster- Keyword..."
      let workingText = sectionBText;
      
      // Split by "Cluster:" pattern to separate clusters
      // Use positive lookahead to keep "Cluster:" in the split
      const clusterParts = workingText.split(/(?=Cluster:\s*[A-Z])/i);
      
      for (let i = 0; i < clusterParts.length; i++) {
        const part = clusterParts[i].trim();
        if (!part || part.match(/^SECTION/i)) continue;
        
        let clusterName = null;
        let keywordsText = "";
        
        // Check if this part starts with "Cluster:"
        if (part.match(/^Cluster:/i)) {
          // Extract cluster name from "Cluster: Name"
          const nameMatch = part.match(/^Cluster:\s*([A-Za-z][A-Za-z0-9\s&]+?)(?=[-•]|$)/i);
          if (nameMatch) {
            clusterName = nameMatch[1].trim();
            // Get text after cluster name
            keywordsText = part.replace(/^Cluster:\s*[A-Za-z][A-Za-z0-9\s&]+?\s*/i, "");
          }
        } else {
          // First cluster without "Cluster:" prefix
          // Pattern: "ClusterName- Keyword1- Keyword2..."
          const firstClusterMatch = part.match(/^([A-Za-z][A-Za-z0-9\s&]+?)([-•].+)$/);
          if (firstClusterMatch) {
            clusterName = firstClusterMatch[1].trim();
            keywordsText = firstClusterMatch[2];
          }
        }
        
        if (!clusterName) continue;
        
        // Extract keywords from keywordsText
        // Keywords are separated by "- " or "• " or just "-" before next keyword/cluster
        const keywords = [];
        
        // Pattern: "- Keyword" or "• Keyword" followed by either "-", "•", "Cluster:", "SECTION", or end
        const keywordPattern = /[-•]\s*([A-Za-z][A-Za-z0-9\s&-]+?)(?=[-•]|Cluster:|SECTION|$)/g;
        let keywordMatch;
        
        while ((keywordMatch = keywordPattern.exec(keywordsText)) !== null) {
          let keyword = keywordMatch[1].trim();
          
          // Clean up keyword - remove trailing "Cluster:" if accidentally captured
          keyword = keyword.replace(/Cluster:\s*$/i, "").trim();
          
          if (
            keyword.length > 1 && 
            keyword.length < 50 && 
            !keyword.match(/^Cluster:/i) &&
            !keyword.match(/^SECTION/i)
          ) {
            keywords.push(keyword);
          }
        }
        
        if (clusterName && keywords.length > 0) {
          clusters.push({
            name: clusterName,
            keywords: keywords,
          });
        }
      }
    }
    
    // Fallback: try line-by-line parsing
    if (clusters.length === 0 && sectionBText) {
      let currentCluster = null;
      const clusterPattern = /^Cluster:\s*(.+)$/i;
      const keywordPattern = /^[-•]\s*(.+)$/;
      
      const clusterLines = sectionBText.split(/\n/);
      for (const line of clusterLines) {
        // Stop if we hit the next section
        if (line.match(/^SECTION\s*[AC]:/i)) break;
        
        const clusterMatch = line.match(clusterPattern);
        if (clusterMatch) {
          if (currentCluster) {
            clusters.push(currentCluster);
          }
          currentCluster = {
            name: clusterMatch[1].trim(),
            keywords: [],
          };
        } else if (currentCluster) {
          const keywordMatch = line.match(keywordPattern);
          if (keywordMatch) {
            currentCluster.keywords.push(keywordMatch[1].trim());
          } else if (line.trim() && !line.match(/^SECTION/i) && !line.match(/^Cluster:/i)) {
            const trimmed = line.trim();
            if (trimmed.length > 1 && !trimmed.match(/^\d+$/) && !trimmed.match(/^\(/)) {
              currentCluster.keywords.push(trimmed);
            }
          }
        }
      }
      if (currentCluster) {
        clusters.push(currentCluster);
      }
    }

    // Extract SECTION C: KEYWORDS_LIST
    const sectionCPatterns = [
      /SECTION\s*C[:\s]+KEYWORDS[_\s]*LIST\s*([\s\S]*?)(?=\n\s*SECTION\s*[AB]:|$)/i,
      /SECTION\s*C[:\s]+KEYWORDS_LIST\s*([\s\S]*?)(?=\n\s*SECTION\s*[AB]:|$)/i,
      /SECTIONC[:\s]+KEYWORDS[_\s]*LIST\s*([\s\S]*?)(?=\n\s*SECTION[AB]:|$)/i,
    ];

    let sectionCText = null;
    for (const pattern of sectionCPatterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        sectionCText = match[1].trim();
        break;
      }
    }

    // Extract all keywords for searchable list
    const allKeywords = new Set();
    
    // From frequencies
    frequencies.forEach((f) => allKeywords.add(f.keyword));
    
    // From clusters
    clusters.forEach((cluster) => {
      cluster.keywords.forEach((kw) => allKeywords.add(kw));
    });

    // From SECTION C if available
    if (sectionCText) {
      // Helper function to split concatenated keywords intelligently
      // Pattern: "Scarlett 2i2SoftwareInstallationWindowsUSB" -> ["Scarlett 2i2", "Software", "Installation", "Windows", "USB"]
      // Split where: lowercase/digit (no space before) followed by uppercase = new word
      // But preserve: "Bundle Code", "Scarlett 2i2" (spaces within keywords)
      const splitConcatenatedKeywords = (text) => {
        // Split by multiple patterns combined:
        // 1. Lowercase/digit followed by uppercase starting lowercase word
        // 2. Lowercase followed by all-caps word
        // 3. All-caps word followed by uppercase starting lowercase
        const combinedPattern = /(?<=[a-z0-9])(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z][A-Z](?![a-z]))|(?<=[A-Z][A-Z])(?=[A-Z][a-z])/;
        
        const parts = text.split(combinedPattern);
        
        return parts
          .map(part => part.trim())
          .filter(part => part.length > 0 && part.length < 100);
      };
      
      // First, try to split by newlines
      let keywordLines = sectionCText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 1 && !line.match(/^SECTION/i) && !line.match(/^[-•]\s*$/));
      
      // If we only have one or very few lines, the keywords might be concatenated
      if (keywordLines.length <= 2) {
        const fullText = sectionCText.replace(/\n/g, " ").trim();
        // Try intelligent splitting
        const splitKeywords = splitConcatenatedKeywords(fullText);
        if (splitKeywords.length > keywordLines.length) {
          keywordLines = splitKeywords;
        }
      }
      
      keywordLines.forEach((kw) => {
        // Remove bullet points if present
        let cleaned = kw.replace(/^[-•]\s*/, "").trim();
        
        // If the keyword is very long (likely concatenated), try to split it
        if (cleaned.length > 50) {
          const splitKeywords = splitConcatenatedKeywords(cleaned);
          splitKeywords.forEach((splitKw) => {
            const trimmed = splitKw.trim();
            // Filter: reasonable length, not section markers, not too long
            if (
              trimmed.length > 1 && 
              trimmed.length < 50 && 
              !trimmed.match(/^SECTION/i) &&
              !trimmed.match(/^Cluster:/i)
            ) {
              allKeywords.add(trimmed);
            }
          });
        } else if (cleaned.length > 1 && cleaned.length < 50) {
          // Only add if it's a reasonable length
          allKeywords.add(cleaned);
        }
      });
      
      // Final cleanup: remove any keywords that are still too long (likely still concatenated)
      const keywordsToCheck = Array.from(allKeywords);
      allKeywords.clear();
      
      keywordsToCheck.forEach((kw) => {
        if (kw.length < 50) {
          allKeywords.add(kw);
        } else {
          // Try one more time to split very long keywords
          // Use a more aggressive splitting pattern for very long strings
          const splitAgain = splitConcatenatedKeywords(kw);
          
          // If still not split well, try splitting on every capital letter boundary
          if (splitAgain.length === 1 && splitAgain[0].length > 50) {
            // More aggressive: split on any lowercase->uppercase or digit->uppercase transition
            const aggressiveSplit = kw.split(/(?<=[a-z0-9])(?=[A-Z])/);
            aggressiveSplit.forEach((splitKw) => {
              const trimmed = splitKw.trim();
              if (trimmed.length > 1 && trimmed.length < 50 && !trimmed.match(/^[A-Z]$/)) {
                allKeywords.add(trimmed);
              }
            });
          } else {
            splitAgain.forEach((splitKw) => {
              const trimmed = splitKw.trim();
              if (trimmed.length > 1 && trimmed.length < 50) {
                allKeywords.add(trimmed);
              }
            });
          }
        }
      });
    }

    // Fallback: Extract from raw text if no structured data found
    if (frequencies.length === 0 && clusters.length === 0 && allKeywords.size === 0) {
      // Try to extract any words that look like keywords (capitalized, not common words)
      const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
      const keywordLines = rawText
        .split(/\n|,|•/)
        .map((line) => line.trim())
        .filter((line) => {
          const lower = line.toLowerCase();
          return line.length > 2 && 
                 !line.match(/^SECTION/i) && 
                 !commonWords.has(lower) &&
                 !line.match(/^\d+$/) &&
                 !line.match(/^[()[\]]+$/);
        });
      keywordLines.forEach((kw) => allKeywords.add(kw));
    }

    return {
      frequencies: frequencies.sort((a, b) => b.count - a.count),
      clusters,
      allKeywords: Array.from(allKeywords).sort(),
    };
  }, [rawText]);

  const { frequencies, clusters, allKeywords } = useMemo(() => {
    const result = extractKeywords();
    
    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      console.log("[PDFKeywordsExtraction] Extraction results:", {
        frequenciesCount: result.frequencies.length,
        clustersCount: result.clusters.length,
        allKeywordsCount: result.allKeywords.length,
        hasRawText: !!rawText,
        rawTextLength: rawText?.length || 0,
      });
      
      if (result.frequencies.length === 0 && result.clusters.length === 0 && result.allKeywords.length === 0 && rawText) {
        console.log("[PDFKeywordsExtraction] Raw text preview:", rawText.substring(0, 500));
      }
    }
    
    return result;
  }, [extractKeywords, rawText]);

  const filteredKeywords = useMemo(() => {
    if (!searchQuery.trim()) return allKeywords;
    const query = searchQuery.toLowerCase();
    return allKeywords.filter((keyword) =>
      keyword.toLowerCase().includes(query)
    );
  }, [allKeywords, searchQuery]);

  const hasData = frequencies.length > 0 || clusters.length > 0 || allKeywords.length > 0;

  if (!hasData && !rawText) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No keywords available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faKey} />
        </div>
        <div>
          <h2 className={styles.title}>Keywords Extraction</h2>
          <p className={styles.subtitle}>Key terms & concepts</p>
        </div>
      </div>

      {/* Section A: Keyword Frequency */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faChartBar} className={styles.sectionIcon} />
          Keyword Frequency
        </h3>
        {frequencies.length > 0 ? (
          <div className={styles.frequencyList}>
            {frequencies.map((item, idx) => (
              <div key={idx} className={styles.frequencyItem}>
                <span className={styles.keyword}>{item.keyword}</span>
                <span className={styles.count}>({item.count})</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptySection}>
            <p>No keyword frequency data found. The AI may not have provided frequency counts in the expected format.</p>
            {process.env.NODE_ENV === "development" && rawText && (
              <details style={{ marginTop: "1rem" }}>
                <summary style={{ cursor: "pointer", color: "#f97316" }}>
                  Debug: Show raw text
                </summary>
                <pre
                  style={{
                    fontSize: "0.75rem",
                    padding: "1rem",
                    background: "var(--surface-color)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    overflow: "auto",
                    maxHeight: "300px",
                    whiteSpace: "pre-wrap",
                    marginTop: "0.5rem",
                  }}
                >
                  {rawText.substring(0, 1500)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Section B: Topic Clusters */}
      {clusters.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faLayerGroup} className={styles.sectionIcon} />
            Topic Clusters
          </h3>
          <div className={styles.clustersContainer}>
            {clusters.map((cluster, idx) => (
              <div key={idx} className={styles.clusterCard}>
                <div className={styles.clusterHeader}>
                  <FontAwesomeIcon icon={faTag} className={styles.clusterIcon} />
                  <span className={styles.clusterName}>{cluster.name}</span>
                </div>
                <div className={styles.clusterKeywords}>
                  {cluster.keywords.map((keyword, kidx) => (
                    <span key={kidx} className={styles.clusterKeyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section C: Searchable List */}
      {allKeywords.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faSearch} className={styles.sectionIcon} />
            Searchable List
          </h3>
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.keywordsList}>
              {filteredKeywords.length > 0 ? (
                filteredKeywords.map((keyword, idx) => (
                  <div key={idx} className={styles.keywordItem}>
                    <span className={styles.bullet}>•</span>
                    <span className={styles.keywordText}>{keyword}</span>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>No keywords found</div>
              )}
            </div>
            {searchQuery && (
              <div className={styles.resultCount}>
                Showing {filteredKeywords.length} of {allKeywords.length} keywords
              </div>
            )}
          </div>
        </div>
      )}

      {!hasData && rawText && (
        <div className={styles.emptyState}>
          <p>No structured keyword data found in the analysis</p>
          {process.env.NODE_ENV === "development" && (
            <details style={{ marginTop: "1rem", textAlign: "left", maxWidth: "800px" }}>
              <summary style={{ cursor: "pointer", color: "#f97316", marginBottom: "0.5rem" }}>
                Debug: Show raw text
              </summary>
              <pre
                style={{
                  fontSize: "0.75rem",
                  padding: "1rem",
                  background: "var(--surface-color)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  overflow: "auto",
                  maxHeight: "300px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {rawText.substring(0, 2000)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFKeywordsExtraction;
