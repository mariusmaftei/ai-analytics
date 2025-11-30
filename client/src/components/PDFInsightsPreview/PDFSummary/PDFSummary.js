import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faList,
  faHeading,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PDFSummary.module.css";

const PDFSummary = ({ data, rawText, analysisData }) => {
  const extractExecutiveSummary = () => {
    if (rawText) {
      // First, try to extract from AI Summary section (clean summary field)
      // Handle format: summary | "text here" | description
      const summaryPatterns = [
        /summary\s*\|\s*"([^"]+)"\s*\|\s*[^|]+/i,  // summary | "text" | description
        /summary\s*\|\s*([^|]+?)(?=\s*\|\s*[^|]+$|\s*$)/i,  // summary | text | description or summary | text
        /summary\s*\|\s*([^|]+)/i,  // summary | text
      ];
      
      for (const pattern of summaryPatterns) {
        const summaryMatch = rawText.match(pattern);
        if (summaryMatch) {
          let summary = summaryMatch[1].trim();
          // Clean up the summary
          summary = summary
            .replace(/^["']|["']$/g, '')
            .replace(/\*\*/g, '')
            .replace(/\|/g, '')
            .replace(/^\w+\s*\|\s*/g, '') // Remove any remaining key | value patterns
            .trim();
          if (summary.length > 50) {
            return summary;
          }
        }
      }
      
      // Also try from parsed data
      if (data?.sections) {
        const aiSummarySection = data.sections.find(s => 
          s.name?.toLowerCase().includes('ai summary') || 
          s.name?.toLowerCase().includes('summary')
        );
        if (aiSummarySection?.content) {
          for (const item of aiSummarySection.content) {
            if (item.type === "keyValue" && item.key?.toLowerCase() === 'summary') {
              const summary = item.value.trim();
              if (summary.length > 50) {
                return summary;
              }
            }
          }
        }
      }
      
      // Try multiple patterns to find EXECUTIVE_SUMMARY
      const patterns = [
        /SECTION A:\s*EXECUTIVE_SUMMARY\s*\n([\s\S]*?)(?=\n\s*SECTION [BC]:|$)/i,
        /SECTION A:\s*EXECUTIVE\s*SUMMARY\s*\n([\s\S]*?)(?=\n\s*SECTION [BC]:|$)/i,
        /EXECUTIVE_SUMMARY\s*\n([\s\S]*?)(?=\n\s*SECTION [BC]:|$)/i,
        /EXECUTIVE\s*SUMMARY\s*\n([\s\S]*?)(?=\n\s*SECTION [BC]:|$)/i,
        /Section A[:\s]+Executive Summary\s*\n([\s\S]*?)(?=\n\s*Section [BC]:|$)/i,
        /Executive Summary\s*\n([\s\S]*?)(?=\n\s*(?:SECTION|Section|Key|Important)|$)/i,
      ];
      
      for (const pattern of patterns) {
        const execMatch = rawText.match(pattern);
        if (execMatch) {
          let summary = execMatch[1].trim();
          summary = summary
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\|/g, '')
            .replace(/✅/g, '')
            .replace(/❌/g, '')
            .replace(/⚙️/g, '')
            .replace(/SECTION [ABC]:/gi, '')
            .replace(/Section [ABC]:/gi, '')
            .replace(/\*\*[^*]+\*\*/g, '')
            .replace(/KEY_HIGHLIGHTS/gi, '')
            .replace(/SECTION_HEADINGS/gi, '')
            .replace(/Important Sections/gi, '')
            .trim();
          
          // Remove bullet points and numbered lists from summary
          const lines = summary.split(/\n/).filter(line => {
            const trimmed = line.trim();
            return !trimmed.match(/^[-•*]\s/) && 
                   !trimmed.match(/^\d+\.\s/) &&
                   trimmed.length > 0;
          });
          
          summary = lines.join(' ').replace(/\s+/g, ' ').trim();
          
          // Extract sentences
          const sentences = summary.split(/[.!?]+/).filter(s => {
            const cleaned = s.trim();
            return cleaned.length > 15 && 
                   !cleaned.toLowerCase().includes('section') &&
                   !cleaned.toLowerCase().includes('key highlights') &&
                   !cleaned.toLowerCase().includes('headings');
          });
          
          if (sentences.length > 0) {
            return sentences.join('. ').trim() + '.';
          }
          
          // If no sentence breaks, return the cleaned text if it's substantial
          if (summary.length > 50) {
            return summary;
          }
        }
      }
      
      // Fallback: Extract first substantial paragraph before any SECTION markers
      const beforeSections = rawText.split(/SECTION [ABC]:/i)[0];
      if (beforeSections && beforeSections.trim().length > 100) {
        let summary = beforeSections.trim();
        // Remove any section headers
        summary = summary.replace(/EXECUTIVE[_\s]*SUMMARY/gi, '').trim();
        // Get first paragraph
        const firstPara = summary.split(/\n\n/)[0] || summary.split(/\n/).slice(0, 3).join(' ');
        if (firstPara.trim().length > 50) {
          const cleaned = firstPara.replace(/\s+/g, ' ').trim();
          if (cleaned.length > 50) {
            return cleaned;
          }
        }
      }
    }

    if (data?.sections) {
      const execSection = data.sections.find(
        (s) =>
          s.name?.toLowerCase().includes("executive") ||
          s.name?.toLowerCase().includes("summary")
      );

      if (execSection?.content) {
        const textParts = [];
        for (const item of execSection.content) {
          if (item.type === "text" && item.text) {
            const text = item.text.trim();
            if (!text.includes('|') && !text.match(/^\w+\s*:\s*\w+/) && text.length > 20) {
              textParts.push(text);
            }
          }
        }
        if (textParts.length > 0) {
          return textParts.join(' ');
        }
      }
    }

    return null;
  };

  const extractKeyHighlights = () => {
    if (rawText) {
      // First, try to extract from key_findings array in AI Summary section
      // Handle format: key_findings | ["item1", "item2", "item3"]
      const keyFindingsPatterns = [
        /key_findings\s*\|\s*\[([^\]]+)\]/i,
        /key_findings\s*\|\s*"([^"]+)"/i,
        /key_findings[:\s]+\[([^\]]+)\]/i,
      ];
      
      for (const pattern of keyFindingsPatterns) {
        const keyFindingsMatch = rawText.match(pattern);
        if (keyFindingsMatch) {
          const findingsStr = keyFindingsMatch[1];
          // Split by comma, but handle quoted strings properly
          const findings = findingsStr
            .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/) // Split by comma but respect quotes
            .map(f => f.trim().replace(/^["']|["']$/g, '').trim())
            .filter(f => f.length > 0);
          if (findings.length > 0) {
            return findings;
          }
        }
      }
      
      // Also try to find key_findings as a simple list after the label
      const keyFindingsSimple = rawText.match(/key_findings\s*\|\s*([^|]+?)(?=\s*\||$)/i);
      if (keyFindingsSimple) {
        const findingsStr = keyFindingsSimple[1].trim();
        // Try to extract array items
        if (findingsStr.includes('[') && findingsStr.includes(']')) {
          const arrayContent = findingsStr.match(/\[([^\]]+)\]/);
          if (arrayContent) {
            const findings = arrayContent[1]
              .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
              .map(f => f.trim().replace(/^["']|["']$/g, '').trim())
              .filter(f => f.length > 0);
            if (findings.length > 0) {
              return findings;
            }
          }
        }
      }
      
      // Also try to extract from parsed data
      if (data?.sections) {
        const aiSummarySection = data.sections.find(s => 
          s.name?.toLowerCase().includes('ai summary') || 
          s.name?.toLowerCase().includes('summary')
        );
        if (aiSummarySection?.content) {
          for (const item of aiSummarySection.content) {
            if (item.type === "keyValue" && item.key?.toLowerCase().includes('key_findings')) {
              // Try to parse array format
              const value = item.value;
              if (value.includes('[') && value.includes(']')) {
                const arrayMatch = value.match(/\[([^\]]+)\]/);
                if (arrayMatch) {
                  const findings = arrayMatch[1]
                    .split(',')
                    .map(f => f.trim().replace(/^["']|["']$/g, ''))
                    .filter(f => f.length > 0);
                  if (findings.length > 0) {
                    return findings;
                  }
                }
              }
            }
          }
        }
      }
      
      // Try multiple patterns to find KEY_HIGHLIGHTS section
      const patterns = [
        /SECTION B:\s*KEY_HIGHLIGHTS\s*\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i,
        /SECTION B:\s*KEY\s*HIGHLIGHTS\s*\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i,
        /KEY_HIGHLIGHTS\s*\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i,
        /KEY\s*HIGHLIGHTS\s*\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i,
        /Section B[:\s]+Key Highlights\s*\n([\s\S]*?)(?=\n\s*Section [AC]:|$)/i,
        /SECTION B[:\s]+KEY HIGHLIGHTS\s*\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i,
      ];
      
      for (const pattern of patterns) {
        const highlightsMatch = rawText.match(pattern);
        if (highlightsMatch) {
          let highlights = highlightsMatch[1].trim();
          highlights = highlights
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\|/g, '')
            .replace(/✅/g, '')
            .replace(/❌/g, '')
            .replace(/⚙️/g, '')
            .replace(/SECTION [ABC]:/gi, '')
            .replace(/Section [ABC]:/gi, '')
            .trim();
          
          // Extract bullet points - handle various formats
          const bullets = highlights
            .split(/\n/)
            .map(line => line.trim())
            .filter(line => {
              const cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
              return cleaned.length > 10 && 
                     !cleaned.match(/^\w+\s*\|\s*/) &&
                     !cleaned.toLowerCase().includes('section') &&
                     !cleaned.toLowerCase().includes('key highlights') &&
                     !cleaned.toLowerCase().includes('executive summary') &&
                     !cleaned.toLowerCase().includes('headings');
            })
            .map(line => {
              // Remove bullet markers and numbering
              return line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
            })
            .filter(line => line.length > 0);
          
          if (bullets.length > 0) {
            return bullets;
          }
        }
      }
      
      // Fallback 1: Look for content between SECTION A and SECTION C
      const betweenSectionsMatch = rawText.match(/SECTION A:[\s\S]*?\n\n([\s\S]*?)(?=\n\s*SECTION C:|$)/i);
      if (betweenSectionsMatch) {
        const potentialHighlights = betweenSectionsMatch[1].trim();
        // Remove SECTION B header if present
        const cleaned = potentialHighlights.replace(/SECTION B:\s*KEY[_\s]*HIGHLIGHTS?/gi, '').trim();
        const bullets = cleaned
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => {
            const hasBullet = line.match(/^[-•*]\s/) || line.startsWith('-');
            const cleaned = line.replace(/^[-•*]\s*/, '').trim();
            return hasBullet && 
                   cleaned.length > 10 && 
                   !cleaned.match(/^\w+\s*\|\s*/) &&
                   !cleaned.toLowerCase().includes('section') &&
                   !cleaned.toLowerCase().includes('headings') &&
                   !cleaned.toLowerCase().includes('executive');
          })
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
        
        if (bullets.length >= 3) {
          return bullets;
        }
      }
      
      // Fallback 2: Look for bullet points after Executive Summary
      const afterExecMatch = rawText.match(/EXECUTIVE_SUMMARY[\s\S]*?\n\n([\s\S]*?)(?=\n\s*SECTION [AC]:|$)/i);
      if (afterExecMatch) {
        const potentialHighlights = afterExecMatch[1].trim();
        const bullets = potentialHighlights
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => {
            const hasBullet = line.match(/^[-•*]\s/) || line.startsWith('-');
            const cleaned = line.replace(/^[-•*]\s*/, '').trim();
            return hasBullet && 
                   cleaned.length > 10 && 
                   !cleaned.match(/^\w+\s*\|\s*/) &&
                   !cleaned.toLowerCase().includes('section') &&
                   !cleaned.toLowerCase().includes('headings');
          })
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
        
        if (bullets.length >= 3) {
          return bullets;
        }
      }
    }

    // Try to extract from parsed data sections
    if (data?.sections) {
      // Look for section with "B" or "KEY" or "HIGHLIGHT" in name
      const highlightsSection = data.sections.find(
        (s) => {
          const name = s.name?.toLowerCase() || '';
          return name.includes("highlight") ||
                 name.includes("key finding") ||
                 name.includes("key takeaway") ||
                 name.includes("section b") ||
                 (name.includes("key") && name.includes("point"));
        }
      );

      if (highlightsSection?.content) {
        const bullets = [];
        for (const item of highlightsSection.content) {
          if (item.type === "bullet" && item.text) {
            const text = item.text.trim();
            if (!text.includes('|') && text.length > 10) {
              bullets.push(text);
            }
          } else if (item.type === "text" && item.text) {
            // Sometimes highlights are in text format with bullet markers
            const text = item.text.trim();
            if (text.match(/^[-•*]\s/) || text.match(/^\d+\.\s/) || text.startsWith('-')) {
              const cleaned = text.replace(/^[-•*]\d+\.\s*/, '').replace(/^[-•*]\s*/, '').trim();
              if (cleaned.length > 10 && !cleaned.includes('|')) {
                bullets.push(cleaned);
              }
            }
          }
        }
        if (bullets.length > 0) {
          return bullets;
        }
      }
      
      // Also check if any section has multiple bullet points
      for (const section of data.sections) {
        if (section.content) {
          const bullets = [];
          for (const item of section.content) {
            if (item.type === "bullet" && item.text) {
              const text = item.text.trim();
              if (!text.includes('|') && text.length > 10 && bullets.length < 8) {
                bullets.push(text);
              }
            }
          }
          // If we found 3+ bullets in a section, it might be the highlights
          if (bullets.length >= 3 && bullets.length <= 8) {
            return bullets;
          }
        }
      }
    }

    // Last resort: Try to find bullet points anywhere in the raw text
    if (rawText) {
      // First, try to find bullets that are NOT in the section headings area
      const sectionHeadingsStart = rawText.search(/SECTION[_\s]*HEADINGS|Important Sections|TABLE OF CONTENTS/i);
      const textBeforeHeadings = sectionHeadingsStart > 0 
        ? rawText.substring(0, sectionHeadingsStart)
        : rawText;
      
      // Try to find content between Executive Summary and Section Headings
      const execSummaryEnd = textBeforeHeadings.search(/EXECUTIVE[_\s]*SUMMARY/i);
      const sectionHeadingsStartInText = textBeforeHeadings.search(/SECTION[_\s]*HEADINGS|Important Sections/i);
      
      let searchText = textBeforeHeadings;
      if (execSummaryEnd > 0 && sectionHeadingsStartInText > execSummaryEnd) {
        // Extract text between Executive Summary and Section Headings
        searchText = textBeforeHeadings.substring(execSummaryEnd + 50, sectionHeadingsStartInText);
      }
      
      const allBullets = searchText
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => {
          const hasBullet = line.match(/^[-•*]\s/) || line.startsWith('-') || line.startsWith('•') || line.match(/^[-•*]/);
          if (!hasBullet) return false;
          
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          return cleaned.length > 15 && 
                 !cleaned.match(/^\w+\s*\|\s*/) &&
                 !cleaned.toLowerCase().includes('section') &&
                 !cleaned.toLowerCase().includes('key highlights') &&
                 !cleaned.toLowerCase().includes('executive summary') &&
                 !cleaned.toLowerCase().includes('headings') &&
                 !cleaned.toLowerCase().includes('table of contents') &&
                 !cleaned.toLowerCase().startsWith('important');
        })
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 8); // Limit to 8 highlights
      
      if (allBullets.length >= 2) {
        return allBullets;
      }
      
      // If still nothing, try the entire text before headings but be more lenient
      const allBulletsLenient = textBeforeHeadings
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => {
          const hasBullet = line.match(/^[-•*]\s/) || line.startsWith('-') || line.match(/^[-•*]/);
          if (!hasBullet) return false;
          
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          return cleaned.length > 10 && 
                 !cleaned.match(/^\w+\s*\|\s*/) &&
                 !cleaned.toLowerCase().match(/^(section|key|executive|heading|table|important)/) &&
                 !cleaned.toLowerCase().includes('table of contents');
        })
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 8);
      
      if (allBulletsLenient.length >= 2) {
        return allBulletsLenient;
      }
      
      // Very lenient: any line starting with dash or bullet, minimum 10 chars
      const veryLenient = textBeforeHeadings
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => {
          const hasBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.match(/^[-•*]\s/);
          if (!hasBullet) return false;
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          return cleaned.length > 10 && !cleaned.includes('|');
        })
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 8);
      
      if (veryLenient.length >= 2) {
        return veryLenient;
      }
    }

    return [];
  };

  const extractSectionHeadings = () => {
    if (rawText) {
      // Try multiple patterns to find SECTION_HEADINGS
      const patterns = [
        /SECTION C:\s*SECTION_HEADINGS\s*\n([\s\S]*?)(?=\n\s*SECTION [AB]:|$)/i,
        /SECTION C:\s*SECTION\s*HEADINGS\s*\n([\s\S]*?)(?=\n\s*SECTION [AB]:|$)/i,
        /SECTION_HEADINGS\s*\n([\s\S]*?)(?=\n\s*SECTION [AB]:|$)/i,
        /Section C[:\s]+Section Headings\s*\n([\s\S]*?)(?=\n\s*Section [AB]:|$)/i,
        /Major Section Headings\s*\n([\s\S]*?)(?=\n\s*SECTION [AB]:|$)/i,
      ];
      
      for (const pattern of patterns) {
        const headingsMatch = rawText.match(pattern);
        if (headingsMatch) {
          let headings = headingsMatch[1].trim();
          headings = headings
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\|/g, '')
            .replace(/✅/g, '')
            .replace(/❌/g, '')
            .replace(/⚙️/g, '')
            .replace(/SECTION [ABC]:/gi, '')
            .replace(/Section [ABC]:/gi, '')
            .trim();
          
          const headingList = headings
            .split(/\n/)
            .map(line => line.trim())
            .filter(line => {
              const cleaned = line.replace(/^\d+\.\s*/, '').trim();
              return cleaned.length > 2 && 
                     !cleaned.match(/^\w+\s*\|\s*/) &&
                     !cleaned.toLowerCase().includes('section headings') &&
                     !cleaned.toLowerCase().includes('key highlights') &&
                     !cleaned.toLowerCase().includes('executive summary');
            })
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);
          
          if (headingList.length > 0) {
            return headingList;
          }
        }
      }
    }

    if (analysisData?.metadata?.sections && Array.isArray(analysisData.metadata.sections)) {
      return analysisData.metadata.sections.slice(0, 20);
    }

    if (rawText) {
      const lines = rawText.split('\n');
      const potentialHeadings = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length > 5 && line.length < 100 && 
            (line[0].toUpperCase() === line[0] || line.match(/^\d+\./)) &&
            !line.endsWith('.') && !line.endsWith(',') &&
            i < lines.length - 1 && lines[i + 1].trim().length > 50) {
          const cleaned = line.replace(/^\d+\.\s*/, '').trim();
          if (cleaned.length > 0 && !potentialHeadings.includes(cleaned)) {
            potentialHeadings.push(cleaned);
          }
        }
      }
      if (potentialHeadings.length > 0) {
        return potentialHeadings.slice(0, 15);
      }
    }

    return [];
  };

  let executiveSummary = extractExecutiveSummary();
  let keyHighlights = extractKeyHighlights();
  const sectionHeadings = extractSectionHeadings();

  // Fallback: If we have rawText but no executive summary or highlights, try to extract from the beginning
  if (rawText && !executiveSummary && keyHighlights.length === 0) {
    // Try to get first substantial paragraph as executive summary
    const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    const firstParagraph = lines.slice(0, 10).join(' ');
    
    if (firstParagraph && firstParagraph.trim().length > 100) {
      const cleaned = firstParagraph
        .replace(/SECTION [ABC]:/gi, '')
        .replace(/EXECUTIVE[_\s]*SUMMARY/gi, '')
        .replace(/KEY[_\s]*HIGHLIGHTS/gi, '')
        .replace(/SECTION[_\s]*HEADINGS/gi, '')
        .replace(/Important Sections/gi, '')
        .replace(/\*\*/g, '')
        .replace(/\|/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleaned.length > 100) {
        // Extract sentences for executive summary
        const sentences = cleaned.split(/[.!?]+/).filter(s => {
          const sTrimmed = s.trim();
          return sTrimmed.length > 20 && 
                 !sTrimmed.toLowerCase().includes('section') &&
                 !sTrimmed.toLowerCase().includes('highlight');
        }).slice(0, 7);
        
        if (sentences.length >= 2) {
          executiveSummary = sentences.join('. ').trim() + '.';
        } else if (cleaned.length > 150) {
          executiveSummary = cleaned.substring(0, 500).trim();
        }
      }
    }
    
    // Try to find bullet points in the text for highlights
    if (keyHighlights.length === 0) {
      // Find where section headings start to avoid extracting those
      const headingsStart = rawText.search(/SECTION[_\s]*HEADINGS|Important Sections|TABLE OF CONTENTS/i);
      const textToSearch = headingsStart > 0 ? rawText.substring(0, headingsStart) : rawText;
      
      const allLines = textToSearch.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
      const bullets = allLines
        .filter(line => {
          const hasBullet = line.match(/^[-•*]\s/) || line.startsWith('-') || line.startsWith('•') || line.match(/^[-•*]/);
          if (!hasBullet) return false;
          
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          return cleaned.length > 15 && 
                 !cleaned.toLowerCase().match(/^(section|key|executive|heading|table|important|table of contents)/) &&
                 !cleaned.includes('|') &&
                 !cleaned.toLowerCase().includes('table of contents');
        })
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 8);
      
      if (bullets.length >= 2) {
        keyHighlights = bullets;
      } else {
        // More lenient: any bullet point with at least 10 chars
        const lenientBullets = allLines
          .filter(line => {
            const hasBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.match(/^[-•*]\s/);
            if (!hasBullet) return false;
            const cleaned = line.replace(/^[-•*]\s*/, '').trim();
            return cleaned.length > 10 && 
                   !cleaned.toLowerCase().match(/^(section|executive|heading|table|important)/) &&
                   !cleaned.includes('|');
          })
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 8);
        
        if (lenientBullets.length >= 2) {
          keyHighlights = lenientBullets;
        } else {
          // Very lenient: any line starting with dash or bullet, minimum 10 chars, just exclude obvious headers
          const veryLenient = allLines
            .filter(line => {
              const hasBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.match(/^[-•*]\s/);
              if (!hasBullet) return false;
              const cleaned = line.replace(/^[-•*]\s*/, '').trim();
              return cleaned.length > 10 && 
                     !cleaned.toLowerCase().startsWith('section') &&
                     !cleaned.toLowerCase().startsWith('executive') &&
                     !cleaned.toLowerCase().startsWith('heading') &&
                     !cleaned.toLowerCase().startsWith('table of') &&
                     !cleaned.includes('|');
            })
            .map(line => line.replace(/^[-•*]\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 8);
          
          if (veryLenient.length >= 1) {
            keyHighlights = veryLenient;
          }
        }
      }
    }
  }

  // Debug: Log what we extracted (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('PDFSummary Extraction:', {
      hasExecutiveSummary: !!executiveSummary,
      executiveSummaryPreview: executiveSummary?.substring(0, 100),
      keyHighlightsCount: keyHighlights.length,
      keyHighlightsPreview: keyHighlights.slice(0, 2),
      sectionHeadingsCount: sectionHeadings.length,
      rawTextPreview: rawText?.substring(0, 1000),
      rawTextLength: rawText?.length,
    });
  }

  if (!executiveSummary && keyHighlights.length === 0 && sectionHeadings.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No summary data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faFileAlt} />
        </div>
        <div>
          <h2 className={styles.title}>Executive Summary</h2>
          <p className={styles.subtitle}>Condensed high-level interpretation</p>
        </div>
      </div>

      {executiveSummary && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Executive Summary</h3>
          <div className={styles.executiveSummaryCard}>
            <p className={styles.executiveSummaryText}>{executiveSummary}</p>
          </div>
        </div>
      )}

      {keyHighlights.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faList} className={styles.sectionIcon} />
            Key Highlights
          </h3>
          <div className={styles.highlightsCard}>
            <ul className={styles.highlightsList}>
              {keyHighlights.map((highlight, idx) => (
                <li key={idx} className={styles.highlightItem}>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sectionHeadings.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faHeading} className={styles.sectionIcon} />
            Important Sections Extracted
          </h3>
          <div className={styles.headingsCard}>
            <ol className={styles.headingsList}>
              {sectionHeadings.map((heading, idx) => (
                <li key={idx} className={styles.headingItem}>
                  {heading}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSummary;
