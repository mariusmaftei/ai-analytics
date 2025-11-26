import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faHandPointer,
  faProjectDiagram,
  faDesktop,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ImageDetailedAnalysis.module.css";

const ImageDetailedAnalysis = ({ data = {}, rawText = "" }) => {
  const sections = data?.sections || [];

  const findSection = (keywords = []) =>
    sections.find((section) =>
      keywords.some((name) =>
        section?.name?.toLowerCase().includes(name.toLowerCase())
      )
    );

  const getSectionText = (section) => {
    if (!section) return "";
    if (section.text) return section.text;
    if (section.items?.length) {
      return section.items
        .map((item) => {
          if (typeof item === "string") return item;
          if (item.value)
            return `${item.label ? `${item.label}: ` : ""}${item.value}`;
          return item.text || item.description;
        })
        .filter(Boolean)
        .join(" ");
    }
    return "";
  };

  const cleanBulletText = (text) => {
    if (!text) return "";
    
    let cleaned = text.trim();
    
    const leadingWords = [
      /^and\s+/i,
      /^with\s+/i,
      /^the\s+/i,
      /^a\s+/i,
      /^an\s+/i,
      /^in\s+/i,
      /^on\s+/i,
      /^at\s+/i,
      /^to\s+/i,
      /^from\s+/i,
      /^of\s+/i,
      /^by\s+/i,
      /^for\s+/i,
    ];
    
    leadingWords.forEach(pattern => {
      cleaned = cleaned.replace(pattern, "");
    });
    
    return cleaned.trim();
  };

  const parseParagraphs = (text) => {
    if (!text) return [];
    
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    
    const paragraphs = cleanText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.match(/^Parsing error:/i));
    
    if (paragraphs.length === 0 && cleanText.trim()) {
      const singlePara = cleanText.trim();
      if (!singlePara.match(/^Parsing error:/i)) {
        return [singlePara];
      }
      return [];
    }
    return paragraphs;
  };

  const extractObjectsAndPositions = (text) => {
    if (!text) return [];
    const items = [];
    
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [...text.matchAll(boldPattern)];
    
    boldMatches.forEach((match) => {
      const objectName = match[1].trim();
      if (objectName && objectName.length > 1 && objectName.length < 50) {
        const afterBold = text.substring(match.index + match[0].length);
        const description = afterBold.split(/\.|\*\*/)[0].trim();
        
        const positionPatterns = [
          /(?:positioned|located|placed|situated|found)\s+(?:at|in|on|near|to|from)\s+([^.,]+)/i,
          /(?:in|on|at|near|to|from)\s+(?:the\s+)?(left|right|center|middle|top|bottom|foreground|background|front|back|side)/i,
          /(?:off-)?center/i,
        ];
        
        let position = "";
        for (const pattern of positionPatterns) {
          const posMatch = text.substring(0, match.index).match(pattern) || 
                          afterBold.match(pattern);
          if (posMatch) {
            position = posMatch[1] || posMatch[0];
            break;
          }
        }
        
        const fullText = position 
          ? `${objectName}: ${description || ""} (${position})`.trim()
          : `${objectName}: ${description || ""}`.trim();
        
        if (fullText.length > objectName.length + 2) {
          items.push(fullText);
        }
      }
    });
    
    if (items.length === 0) {
      const objectKeywords = [
        "cat", "dog", "person", "people", "animal", "object", "item",
        "building", "car", "tree", "flower", "book", "computer", "phone",
        "table", "chair", "window", "door", "wall", "floor", "ceiling"
      ];
      
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        const hasObject = objectKeywords.some(keyword => lower.includes(keyword));
        if (hasObject) {
          const positionMatch = sentence.match(/(?:in|on|at|near|to|from|positioned|located)\s+([^.,]+)/i);
          if (positionMatch || lower.includes("center") || lower.includes("side")) {
            items.push(sentence.trim());
          }
        }
      });
    }
    
    return items.slice(0, 10);
  };

  const extractActions = (text) => {
    if (!text) return [];
    const items = [];
    
    const actionVerbs = [
      "facing", "looking", "sitting", "standing", "lying", "resting",
      "moving", "running", "walking", "jumping", "playing", "eating",
      "drinking", "holding", "wearing", "carrying", "extending", "shining",
      "displaying", "showing", "appearing", "creating", "forming"
    ];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      const hasAction = actionVerbs.some(verb => lower.includes(verb));
      if (hasAction) {
        let cleanSentence = sentence.trim().replace(/\*\*/g, "");
        cleanSentence = cleanBulletText(cleanSentence);
        if (cleanSentence.length > 15 && cleanSentence.length < 200) {
          items.push(cleanSentence);
        }
      }
    });
    
    return items.slice(0, 8);
  };

  const extractVisualRelationships = (text) => {
    if (!text) return [];
    const items = [];
    
    const relationshipPatterns = [
      /(?:between|among|with|and|next to|beside|near|around|surrounding)\s+([^.,]+)/gi,
      /(?:relationship|connection|interaction|relation)\s+between\s+([^.,]+)/gi,
      /(?:together|combined|paired|grouped)\s+([^.,]+)/gi,
    ];
    
    relationshipPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        let relationship = match[0].trim().replace(/\*\*/g, "");
        relationship = cleanBulletText(relationship);
        if (relationship.length > 10 && relationship.length < 150) {
          items.push(relationship);
        }
      });
    });
    
    const contextWords = ["background", "foreground", "behind", "in front of", "surrounding"];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      const hasContext = contextWords.some(word => lower.includes(word));
      if (hasContext) {
        let cleanSentence = sentence.trim().replace(/\*\*/g, "");
        cleanSentence = cleanBulletText(cleanSentence);
        if (cleanSentence.length > 15 && cleanSentence.length < 200) {
          items.push(cleanSentence);
        }
      }
    });
    
    return [...new Set(items)].slice(0, 8);
  };

  const extractUIElements = (text) => {
    if (!text) return [];
    const items = [];
    
    const uiKeywords = [
      "button", "menu", "icon", "toolbar", "window", "dialog", "panel",
      "tab", "scrollbar", "input", "field", "form", "link", "header",
      "footer", "sidebar", "navigation", "dropdown", "checkbox", "radio",
      "slider", "progress", "badge", "alert", "modal", "popup"
    ];
    
    const lowerText = text.toLowerCase();
    const isScreenshot = lowerText.includes("screenshot") || 
                        lowerText.includes("interface") ||
                        lowerText.includes("ui") ||
                        uiKeywords.some(keyword => lowerText.includes(keyword));
    
    if (isScreenshot) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        const hasUI = uiKeywords.some(keyword => lower.includes(keyword));
        if (hasUI) {
          let cleanSentence = sentence.trim().replace(/\*\*/g, "");
          cleanSentence = cleanBulletText(cleanSentence);
          if (cleanSentence.length > 15 && cleanSentence.length < 200) {
            items.push(cleanSentence);
          }
        }
      });
      
      uiKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}[^.,!?]*`, "gi");
        const matches = text.match(regex);
        if (matches) {
          matches.forEach(match => {
            let clean = match.trim().replace(/\*\*/g, "");
            clean = cleanBulletText(clean);
            if (clean.length > keyword.length + 3 && !items.includes(clean)) {
              items.push(clean);
            }
          });
        }
      });
    }
    
    return items.slice(0, 8);
  };

  const extractLayout = (text) => {
    if (!text) return [];
    const items = [];
    
    const layoutKeywords = [
      "composition", "layout", "arrangement", "structure", "framing",
      "positioning", "balance", "symmetry", "asymmetry", "alignment",
      "spacing", "proportion", "perspective", "angle", "viewpoint"
    ];
    
    const positionKeywords = [
      "left", "right", "center", "top", "bottom", "middle", "corner",
      "edge", "foreground", "background", "front", "back", "side"
    ];
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      const hasLayout = layoutKeywords.some(keyword => lower.includes(keyword)) ||
                       positionKeywords.some(keyword => lower.includes(keyword));
      if (hasLayout) {
        let cleanSentence = sentence.trim().replace(/\*\*/g, "");
        cleanSentence = cleanBulletText(cleanSentence);
        if (cleanSentence.length > 15 && cleanSentence.length < 200) {
          items.push(cleanSentence);
        }
      }
    });
    
    return items.slice(0, 8);
  };

  const overviewSection = findSection([
    "overview",
    "description",
    "visual description",
    "detailed description",
  ]);

  const getMainDescription = () => {
    if (overviewSection) {
      return getSectionText(overviewSection);
    }
    
    let desc = rawText.split(/^\d+\.|^SECTION:/im)[0].trim();
    if (!desc || desc.length < 20) {
      desc = rawText.substring(0, Math.min(500, rawText.length)).trim();
    }
    
    return desc
      .replace(/Parsing error:.*?\)/gi, "")
      .replace(/\d+:\s*Parsing error:.*?\)/gi, "")
      .trim();
  };

  const mainDescription = getMainDescription();

  const objects = extractObjectsAndPositions(rawText);
  const actions = extractActions(rawText);
  const relationships = extractVisualRelationships(rawText);
  const uiElements = extractUIElements(rawText);
  const layout = extractLayout(rawText);

  const hasContent =
    mainDescription ||
    objects.length > 0 ||
    actions.length > 0 ||
    relationships.length > 0 ||
    uiElements.length > 0 ||
    layout.length > 0;

  if (!hasContent && !rawText.trim()) {
    return (
      <div className={styles.emptyState}>
        No detailed analysis available yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>Detailed Analysis</h3>
          <p>Comprehensive visual analysis</p>
        </div>
      </div>

      {mainDescription && (
        <div className={styles.descriptionCard}>
          {parseParagraphs(mainDescription).map((paragraph, idx) => (
            <p key={idx} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <div className={styles.sectionsGrid}>
        {objects.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faCube} className={styles.sectionIcon} />
              <div>
                <h4>Objects + Positions</h4>
                <span>Items and their locations</span>
              </div>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {objects.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.marker}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faHandPointer} className={styles.sectionIcon} />
              <div>
                <h4>Actions</h4>
                <span>Activities and movements</span>
              </div>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {actions.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.marker}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {relationships.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faProjectDiagram} className={styles.sectionIcon} />
              <div>
                <h4>Visual Relationships</h4>
                <span>Connections and interactions</span>
              </div>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {relationships.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.marker}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {uiElements.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faDesktop} className={styles.sectionIcon} />
              <div>
                <h4>UI Elements</h4>
                <span>Interface components (if screenshot)</span>
              </div>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {uiElements.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.marker}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {layout.length > 0 && (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FontAwesomeIcon icon={faLayerGroup} className={styles.sectionIcon} />
              <div>
                <h4>Structural Layout</h4>
                <span>Composition and arrangement</span>
              </div>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                {layout.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.marker}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {!hasContent && rawText.trim() && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h4>AI Notes</h4>
            <span>Raw response preview</span>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageDetailedAnalysis;
