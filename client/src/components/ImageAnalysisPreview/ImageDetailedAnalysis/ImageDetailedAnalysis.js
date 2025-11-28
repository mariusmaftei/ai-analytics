import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from "@fortawesome/free-solid-svg-icons";
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

  const extractComposition = (text) => {
    if (!text) return [];
    const items = [];

    const patterns = [
      /(?:focal point|focus|subject)[:\s]+([^.•\n]+)/gi,
      /(?:background|bg)[:\s]+([^.•\n]+)/gi,
      /(?:foreground|fg)[:\s]+([^.•\n]+)/gi,
      /(?:composition|arrangement|layout)[:\s]+([^.•\n]+)/gi,
      /(?:perspective|viewpoint|angle)[:\s]+([^.•\n]+)/gi,
      /(?:balance|symmetry|asymmetry)[:\s]+([^.•\n]+)/gi,
      /(?:rule[-\s]of[-\s]thirds|thirds)[:\s]*([^.•\n]+)/gi,
      /(?:depth|depth cues)[:\s]+([^.•\n]+)/gi,
    ];

    patterns.forEach((pattern) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach((match) => {
        const value = match[1]?.trim();
        if (value && value.length > 3 && value.length < 150) {
          const label = match[0].split(/[:\s]/)[0].trim();
          const capitalizedLabel =
            label.charAt(0).toUpperCase() + label.slice(1);
          items.push({
            label: capitalizedLabel,
            value: value,
          });
        }
      });
    });

    const compositionKeywords = [
      "focal point",
      "background",
      "foreground",
      "composition",
      "perspective",
      "balance",
      "rule of thirds",
      "depth",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      compositionKeywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (
            clean.length > 10 &&
            clean.length < 200 &&
            !items.some((i) => i.value.includes(clean.substring(0, 30)))
          ) {
            const labelMatch = clean.match(
              new RegExp(`(${keyword})[:\\s]+(.+)`, "i")
            );
            if (labelMatch) {
              items.push({
                label:
                  labelMatch[1].charAt(0).toUpperCase() +
                  labelMatch[1].slice(1),
                value: labelMatch[2].trim(),
              });
            }
          }
        }
      });
    });

    const seen = new Set();
    return items
      .filter((item) => {
        const key = `${item.label}:${item.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  };

  const extractColors = (text) => {
    if (!text) return { dominant: [], palette: [], mood: "" };

    const colorKeywords = [
      "red",
      "blue",
      "green",
      "yellow",
      "orange",
      "purple",
      "pink",
      "brown",
      "black",
      "white",
      "gray",
      "grey",
      "beige",
      "tan",
      "warm",
      "cool",
      "pastel",
      "vibrant",
      "muted",
      "saturated",
    ];

    const dominant = [];
    const palette = [];
    let mood = "";

    const colorPatterns = [
      /(?:dominant|primary|main)\s+color[s]?[:\s]+([^.•\n]+)/gi,
      /(?:color palette|palette|colors)[:\s]+([^.•\n]+)/gi,
      /(?:mood|feeling|atmosphere).*?color[s]?[:\s]+([^.•\n]+)/gi,
    ];

    colorPatterns.forEach((pattern, idx) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach((match) => {
        const value = match[1]?.trim();
        if (value) {
          if (idx === 0) {
            const colors = value.split(/[,;]/).map((c) => c.trim());
            dominant.push(...colors);
          } else if (idx === 1) {
            const colors = value.split(/[,;]/).map((c) => c.trim());
            palette.push(...colors);
          } else if (idx === 2) mood = value;
        }
      });
    });

    const sentences = text.split(/[.!?]+/);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      colorKeywords.forEach((keyword) => {
        if (
          lower.includes(keyword) &&
          !dominant.some((d) => d.toLowerCase().includes(keyword))
        ) {
          const colorMatch = sentence.match(
            new RegExp(`\\b${keyword}\\b`, "i")
          );
          if (colorMatch) {
            const context = sentence.trim().substring(0, 50);
            if (context.length > keyword.length + 5) {
              dominant.push(keyword);
            }
          }
        }
      });
    });

    return {
      dominant: [...new Set(dominant)].slice(0, 8),
      palette: [...new Set(palette)].slice(0, 8),
      mood: mood || "",
    };
  };

  const extractTextures = (text) => {
    if (!text) return [];
    const items = [];

    const textureKeywords = [
      "smooth",
      "rough",
      "glossy",
      "matte",
      "blurry",
      "sharp",
      "grainy",
      "textured",
      "soft",
      "hard",
      "silky",
      "velvety",
      "metallic",
      "wooden",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      textureKeywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (clean.length > 10 && clean.length < 200) {
            items.push(clean);
          }
        }
      });
    });

    return [...new Set(items)].slice(0, 8);
  };

  const extractShapes = (text) => {
    if (!text) return [];
    const items = [];

    const shapeKeywords = [
      "geometric",
      "circular",
      "rectangular",
      "triangular",
      "curved",
      "straight",
      "angular",
      "rounded",
      "lines",
      "forms",
      "shapes",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      shapeKeywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (clean.length > 10 && clean.length < 200) {
            items.push(clean);
          }
        }
      });
    });

    return [...new Set(items)].slice(0, 8);
  };

  const extractLighting = (text) => {
    if (!text) return [];
    const items = [];

    const patterns = [
      /(?:lighting|light)[:\s]+([^.•\n]+)/gi,
      /(?:shadows|shadow)[:\s]+([^.•\n]+)/gi,
      /(?:highlights|highlight)[:\s]+([^.•\n]+)/gi,
      /(?:tone|brightness|contrast)[:\s]+([^.•\n]+)/gi,
      /(?:mood|atmosphere).*?(?:light|bright|dark)[:\s]+([^.•\n]+)/gi,
    ];

    patterns.forEach((pattern) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach((match) => {
        const value = match[1]?.trim();
        if (value && value.length > 3 && value.length < 150) {
          const label = match[0].split(/[:\s]/)[0].trim();
          const capitalizedLabel =
            label.charAt(0).toUpperCase() + label.slice(1);
          items.push({
            label: capitalizedLabel,
            value: value,
          });
        }
      });
    });

    const lightingKeywords = [
      "soft",
      "harsh",
      "diffused",
      "direct",
      "natural",
      "artificial",
    ];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      lightingKeywords.forEach((keyword) => {
        if (lower.includes(keyword) && lower.includes("light")) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (clean.length > 10 && clean.length < 200) {
            const labelMatch = clean.match(
              new RegExp(`(lighting|light)[:\\s]+(.+)`, "i")
            );
            if (labelMatch) {
              items.push({
                label: "Lighting",
                value: labelMatch[2].trim(),
              });
            }
          }
        }
      });
    });

    const seen = new Set();
    return items
      .filter((item) => {
        const key = `${item.label}:${item.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  };

  const extractObjectDetails = (text) => {
    if (!text) return [];
    const items = [];

    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [...text.matchAll(boldPattern)];

    boldMatches.forEach((match) => {
      const objectName = match[1].trim();
      if (objectName && objectName.length > 1 && objectName.length < 50) {
        const afterBold = text.substring(match.index + match[0].length);
        const description = afterBold.split(/\.|\*\*/)[0].trim();
        if (description && description.length > 5) {
          items.push(`${objectName} ${description}`);
        }
      }
    });

    const objectPatterns = [
      /(?:person|people|man|woman|child).*?(?:wearing|holding|sitting|standing)/i,
      /(?:cat|dog|animal|pet).*?(?:sitting|lying|standing|resting)/i,
      /(?:furniture|chair|table|desk|shelf).*?(?:with|containing|displaying)/i,
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    sentences.forEach((sentence) => {
      objectPatterns.forEach((pattern) => {
        if (pattern.test(sentence)) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (clean.length > 15 && clean.length < 200) {
            items.push(clean);
          }
        }
      });
    });

    return [...new Set(items)].slice(0, 10);
  };

  const extractSceneInterpretation = (text) => {
    if (!text) return "";

    const interpretationPatterns = [
      /(?:scene interpretation|interpretation|what's happening|what is happening)[:\s]+([^•\n]+)/gi,
      /(?:visually|visual meaning|visual significance)[:\s]+([^•\n]+)/gi,
    ];

    for (const pattern of interpretationPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const value = matches[0][1]?.trim();
        if (value && value.length > 20) {
          return value.substring(0, 500);
        }
      }
    }

    const paragraphs = text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const lower = para.toLowerCase();
      if (
        lower.includes("interpretation") ||
        lower.includes("what's happening") ||
        lower.includes("visually") ||
        (lower.includes("scene") && lower.includes("meaning"))
      ) {
        const clean = para.trim().replace(/\*\*/g, "");
        if (clean.length > 50 && clean.length < 500) {
          return clean;
        }
      }
    }

    return "";
  };

  const extractNotableFeatures = (text) => {
    if (!text) return [];
    const items = [];

    const featureKeywords = [
      "depth of field",
      "shallow",
      "bokeh",
      "motion blur",
      "symmetry",
      "asymmetry",
      "artistic",
      "style",
      "unusual",
      "unique",
      "contrast",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      featureKeywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          const clean = sentence.trim().replace(/\*\*/g, "");
          if (clean.length > 15 && clean.length < 200) {
            items.push(clean);
          }
        }
      });
    });

    return [...new Set(items)].slice(0, 8);
  };

  const overviewSection = findSection([
    "overview",
    "summary",
    "description",
    "visual description",
    "detailed description",
  ]);

  const getHighLevelSummary = () => {
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

  const highLevelSummary = getHighLevelSummary();
  const composition = extractComposition(rawText);
  const colors = extractColors(rawText);
  const textures = extractTextures(rawText);
  const shapes = extractShapes(rawText);
  const lighting = extractLighting(rawText);
  const objectDetails = extractObjectDetails(rawText);
  const sceneInterpretation = extractSceneInterpretation(rawText);
  const notableFeatures = extractNotableFeatures(rawText);

  const analysisMetrics = [
    {
      label: "Analysis Sections",
      value: [
        highLevelSummary,
        composition.length > 0,
        colors.dominant.length > 0,
        textures.length > 0,
        shapes.length > 0,
        lighting.length > 0,
        objectDetails.length > 0,
        sceneInterpretation,
        notableFeatures.length > 0,
      ].filter(Boolean).length,
    },
    {
      label: "Visual Elements",
      value: colors.dominant.length + textures.length + shapes.length,
    },
  ];

  const hasContent =
    highLevelSummary ||
    composition.length > 0 ||
    colors.dominant.length > 0 ||
    textures.length > 0 ||
    shapes.length > 0 ||
    lighting.length > 0 ||
    objectDetails.length > 0 ||
    sceneInterpretation ||
    notableFeatures.length > 0;

  if (!hasContent && !rawText.trim()) {
    return (
      <div className={styles.emptyState}>
        No detailed analysis available yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Visual Intelligence</p>
          <h3>Detailed Analysis</h3>
        </div>
        <p>Deep visual understanding and interpretation</p>
      </header>

      <section className={styles.summaryBanner}>
        <div className={styles.summaryTextBlock}>
          <span>High-Level Summary</span>
          <p>
            {highLevelSummary
              ? parseParagraphs(highLevelSummary)[0]?.substring(0, 200) ||
                "Deep visual understanding of colors, composition, lighting, and visual elements."
              : "Deep visual understanding of colors, composition, lighting, and visual elements."}
          </p>
        </div>
        {analysisMetrics.length > 0 && (
          <div className={styles.metricsGrid}>
            {analysisMetrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.layout}>
        <div className={styles.primaryColumn}>
          {highLevelSummary && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>High-Level Summary</h4>
                <span>Overall visual description</span>
              </div>
              <div className={styles.summaryContent}>
                {parseParagraphs(highLevelSummary).map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {composition.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Composition Breakdown</h4>
                <span>Arrangement of visual elements</span>
              </div>
              <ul className={styles.list}>
                {composition.map((item, idx) => (
                  <li key={idx}>
                    {item.label}: {item.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(colors.dominant.length > 0 ||
            textures.length > 0 ||
            shapes.length > 0) && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Visual Elements</h4>
                <span>Colors, textures, and shapes</span>
              </div>
              <div className={styles.visualElements}>
                {colors.dominant.length > 0 && (
                  <div className={styles.elementSubsection}>
                    <h5>
                      <FontAwesomeIcon
                        icon={faPalette}
                        className={styles.subIcon}
                      />
                      A. Colors
                    </h5>
                    <div className={styles.colorSection}>
                      <div className={styles.colorList}>
                        {colors.dominant.map((color, idx) => (
                          <span key={idx} className={styles.colorChip}>
                            {color}
                          </span>
                        ))}
                      </div>
                      {colors.mood && (
                        <p className={styles.colorMood}>Mood: {colors.mood}</p>
                      )}
                    </div>
                  </div>
                )}

                {textures.length > 0 && (
                  <div className={styles.elementSubsection}>
                    <h5>B. Textures</h5>
                    <ul className={styles.list}>
                      {textures.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {shapes.length > 0 && (
                  <div className={styles.elementSubsection}>
                    <h5>C. Shapes & Geometry</h5>
                    <ul className={styles.list}>
                      {shapes.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {objectDetails.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Object-Level Details</h4>
                <span>Interpretive object descriptions</span>
              </div>
              <ul className={styles.list}>
                {objectDetails.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.secondaryColumn}>
          {lighting.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Lighting & Mood</h4>
                <span>Technical aspects of light</span>
              </div>
              <ul className={styles.list}>
                {lighting.map((item, idx) => (
                  <li key={idx}>
                    {item.label}: {item.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sceneInterpretation && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Scene Interpretation</h4>
                <span>What's happening and why it matters visually</span>
              </div>
              <div className={styles.summaryContent}>
                <p>{sceneInterpretation}</p>
              </div>
            </div>
          )}

          {notableFeatures.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h4>Notable Visual Features</h4>
                <span>Unusual shapes, style, and artistic elements</span>
              </div>
              <ul className={styles.list}>
                {notableFeatures.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {!hasContent && rawText.trim() && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>Raw Model Output</h4>
            <span>Full text response</span>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </section>
      )}
    </div>
  );
};

export default ImageDetailedAnalysis;
