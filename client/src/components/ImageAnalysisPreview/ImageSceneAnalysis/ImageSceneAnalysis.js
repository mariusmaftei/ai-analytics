import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faLightbulb,
  faUser,
  faCouch,
  faEye,
  faBrain,
  faInfoCircle,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ImageSceneAnalysis.module.css";

const extractItems = (section) => {
  if (!section) return [];
  if (section.items?.length) {
    return section.items
      .map((item, idx) => {
        const label = item.label || item.key || null;
        const value = item.value || item.text || item.description || "";
        return {
          id: `${section.name}-${idx}`,
          label: label,
          value: value,
          _original: item,
        };
      })
      .filter((item) => item.value && item.value.trim().length > 0);
  }
  if (section.text) {
    return section.text
      .split(/\n+/)
      .map((line, idx) => ({
        id: `${section.name}-text-${idx}`,
        label: null,
        value: line.trim(),
      }))
      .filter((item) => item.value && item.value.trim().length > 0);
  }
  return [];
};

const summarizeSection = (section) => {
  if (!section) return "";
  if (section.summary) return section.summary;

  const firstItem = section.items?.[0];
  if (firstItem) {
    const itemValue = firstItem.value || firstItem.text || "";
    if (itemValue && itemValue.trim() && !itemValue.match(/^N\/A/i)) {
      return itemValue.trim();
    }
  }

  if (section.text) {
    const firstLine = section.text.split("\n")[0]?.trim();
    if (firstLine && !firstLine.match(/^N\/A/i) && firstLine.length < 500) {
      return firstLine;
    }
  }

  return "";
};

const extractKeywords = (text) => {
  if (!text) return [];

  const objectPatterns = [
    /\b(?:blue|black|white|brown|wooden|metal|plastic|gray|grey|red|green|yellow)?\s*(?:desk|table|chair|monitor|screen|computer|laptop|keyboard|mouse|mousepad|mouse pad)\b/gi,
    /\b(?:desk|table)\s+(?:chair|stool)\b/gi,
    /\b(?:computer|desktop)\s+(?:monitor|screen)\b/gi,
    /\b(?:cat|dog|pet|animal)\b/gi,
    /\b(?:lamp|light|window|door|wall|artwork|painting|picture|frame)\b/gi,
    /\b(?:book|notebook|pen|pencil|paper|document|file)\b/gi,
    /\b(?:cup|mug|bottle|glass|plate|bowl)\b/gi,
    /\b(?:phone|tablet|device|gadget)\b/gi,
  ];

  const foundObjects = new Set();
  objectPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const cleaned = match.trim().toLowerCase();
        const words = cleaned.split(/\s+/);
        if (words.length <= 4 && cleaned.length <= 25) {
          foundObjects.add(cleaned);
        }
      });
    }
  });

  const nounPhrasePattern =
    /\b(?:blue|black|white|brown|wooden|metal|plastic|gray|grey|red|green|yellow|small|large|big|small|tall|short)?\s*(?:desk|table|chair|monitor|screen|computer|laptop|keyboard|mouse|cat|dog|pet|lamp|light|window|door|wall|artwork|painting|picture|frame|book|notebook|pen|pencil|paper|document|file|cup|mug|bottle|glass|plate|bowl|phone|tablet|device|gadget)\b/gi;
  const nounMatches = text.match(nounPhrasePattern);
  if (nounMatches) {
    nounMatches.forEach((match) => {
      const cleaned = match.trim().toLowerCase();
      const words = cleaned.split(/\s+/);
      if (words.length <= 3 && cleaned.length <= 20) {
        foundObjects.add(cleaned);
      }
    });
  }

  const separators = /[,;]|\.\s+|and\s+|with\s+|,\s*and\s+/i;
  const parts = text
    .split(separators)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p.length < 100);

  const keywords = parts
    .map((part) => {
      let cleaned = part
        .replace(/^(the|a|an|this|that|these|those)\s+/i, "")
        .replace(
          /\s+(is|are|was|were|appears|seems|visible|displaying|showing|visible|present|shows|displays)\s+.*$/i,
          ""
        )
        .replace(
          /\s+(in|on|at|with|from|to|by|of|the)\s+(?:the|a|an)?\s*(?:background|foreground|center|side|corner|edge|middle).*$/i,
          ""
        )
        .trim();

      cleaned = cleaned
        .replace(
          /\s+(bathed|surrounded|positioned|placed|located|situated|relaxed|comfortable).*$/i,
          ""
        )
        .replace(/\s+(sunlight|light|shadow|glow|warmth).*$/i, "")
        .replace(/\s+(displaying|showing|shows|displays)\s+.*$/i, "")
        .replace(/\s+(lines?|code|text|content).*$/i, "")
        .trim();

      const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 1 && words.length <= 4) {
        const firstWord = words[0].toLowerCase();
        const commonVerbs = [
          "is",
          "are",
          "was",
          "were",
          "has",
          "have",
          "had",
          "appears",
          "seems",
          "shows",
          "displays",
          "showing",
          "displaying",
        ];
        if (!commonVerbs.includes(firstWord)) {
          const phrase = words.join(" ").toLowerCase();
          if (phrase.length <= 25 && phrase.length > 2) {
            return phrase;
          }
        }
      }
      return null;
    })
    .filter(Boolean);

  const allKeywords = [...foundObjects, ...keywords]
    .filter((keyword, index, self) => self.indexOf(keyword) === index)
    .map((k) => {
      return k
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    })
    .slice(0, 15);

  return allKeywords;
};

const ImageSceneAnalysis = ({ data = {}, rawText = "" }) => {
  const parseSceneData = () => {
    if (!rawText) return null;

    try {
      let jsonText = rawText.trim();

      if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/```json?/gi, "")
          .replace(/```/g, "")
          .trim();
      }

      let objectStart = jsonText.indexOf("{");
      let objectEnd = jsonText.lastIndexOf("}");

      if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
        jsonText = jsonText.substring(objectStart, objectEnd + 1);

        const parsed = JSON.parse(jsonText);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {}

    return null;
  };

  const sceneJsonData = parseSceneData();

  const convertJsonToSections = (jsonData) => {
    if (!jsonData) return [];

    const sections = [];

    if (jsonData.sceneSummary) {
      sections.push({
        name: "Scene Summary",
        text: jsonData.sceneSummary,
        items: [],
      });
    }

    if (jsonData.environment && Object.keys(jsonData.environment).length > 0) {
      const envItems = Object.entries(jsonData.environment).map(
        ([key, value]) => ({
          key: key,
          label: key,
          value: value,
        })
      );
      sections.push({
        name: "Environment",
        items: envItems,
        text: Object.entries(jsonData.environment)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      });
    }

    if (jsonData.lighting && Object.keys(jsonData.lighting).length > 0) {
      sections.push({
        name: "Lighting & Atmosphere",
        items: Object.entries(jsonData.lighting).map(([key, value]) => ({
          key: key,
          label: key,
          value: value,
        })),
        text: Object.entries(jsonData.lighting)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      });
    }

    if (jsonData.activity && Object.keys(jsonData.activity).length > 0) {
      sections.push({
        name: "Activity / Human Context",
        items: Object.entries(jsonData.activity).map(([key, value]) => ({
          key: key,
          label: key,
          value: value,
        })),
        text: Object.entries(jsonData.activity)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      });
    }

    if (jsonData.objects && Object.keys(jsonData.objects).length > 0) {
      sections.push({
        name: "Objects & Furniture Context",
        items: Object.entries(jsonData.objects).map(([key, value]) => ({
          key: key,
          label: key,
          value: value,
        })),
        text: Object.entries(jsonData.objects)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      });
    }

    if (jsonData.interpretation) {
      sections.push({
        name: "Scene Interpretation",
        text: jsonData.interpretation,
        items: [],
      });
    }

    if (jsonData.metadata && Object.keys(jsonData.metadata).length > 0) {
      sections.push({
        name: "Scene Metadata",
        items: Object.entries(jsonData.metadata).map(([key, value]) => ({
          key: key,
          label: key,
          value: value,
        })),
        text: Object.entries(jsonData.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      });
    }

    if (jsonData.tags && jsonData.tags.length > 0) {
      sections.push({
        name: "Tags",
        text: jsonData.tags.join(", "),
        items: jsonData.tags.map((tag) => ({ value: tag })),
      });
    }

    return sections;
  };

  const sections = sceneJsonData
    ? convertJsonToSections(sceneJsonData)
    : data?.sections || [];

  const findSection = (keywords = []) => {
    const found = sections.find((section) => {
      const sectionNameLower = (section?.name || "").toLowerCase();
      return keywords.some((name) => {
        const keywordLower = name.toLowerCase();
        if (sectionNameLower === keywordLower) return true;
        if (sectionNameLower.includes(keywordLower)) return true;
        if (keywordLower.includes(sectionNameLower)) return true;
        const normalizedSection = sectionNameLower
          .replace(/[&/]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const normalizedKeyword = keywordLower
          .replace(/[&/]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (
          normalizedSection.includes(normalizedKeyword) ||
          normalizedKeyword.includes(normalizedSection)
        )
          return true;
        return false;
      });
    });
    return found;
  };

  const summarySection = findSection([
    "summary",
    "general overview",
    "scene summary",
  ]);
  const interpretationSection = findSection([
    "scene interpretation",
    "interpretation",
    "analysis",
    "story",
  ]);
  const environmentSection = findSection([
    "environment",
    "scene",
    "setting",
    "location",
  ]);
  const lightingSection = findSection([
    "lighting & atmosphere",
    "lighting",
    "atmosphere",
    "mood",
    "tone",
    "weather",
  ]);
  const activitySection = findSection([
    "activity / human context",
    "activity",
    "human context",
    "human",
    "context",
    "events",
    "action",
  ]);
  const objectsSection = findSection([
    "objects & furniture context",
    "objects & furniture",
    "objects",
    "elements",
    "furniture",
    "props",
  ]);
  const metadataSection = findSection([
    "scene metadata",
    "metadata",
    "scene info",
    "details",
  ]);
  const tagsSection = findSection(["tags", "keywords", "labels"]);

  const summaryText = (() => {
    const text =
      summarizeSection(summarySection) ||
      summarizeSection(environmentSection) ||
      data.introText ||
      "";
    if (text && (text.match(/^N\/A/) || text.length > 500)) {
      return "";
    }
    return text;
  })();

  const contextHighlights = [
    environmentSection && {
      label: "Environment",
      value: summarizeSection(environmentSection),
    },
    lightingSection && {
      label: "Lighting",
      value: summarizeSection(lightingSection),
    },
    activitySection && {
      label: "Activity",
      value: summarizeSection(activitySection),
    },
  ]
    .filter(Boolean)
    .slice(0, 3);

  const getCardIcon = (title) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes("environment")) return faHome;
    if (titleLower.includes("lighting") || titleLower.includes("atmosphere"))
      return faLightbulb;
    if (titleLower.includes("activity") || titleLower.includes("human"))
      return faUser;
    if (titleLower.includes("object") || titleLower.includes("furniture"))
      return faCouch;
    return faInfoCircle;
  };

  const parseCommaSeparated = (value) => {
    if (!value) return [];
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const buildCard = (title, subtitle, section, fallback) => {
    let items = extractItems(section);
    const isObjectsSection =
      title.toLowerCase().includes("object") ||
      title.toLowerCase().includes("furniture");
    const isKeywordsSection =
      title.toLowerCase().includes("environment") ||
      title.toLowerCase().includes("lighting") ||
      title.toLowerCase().includes("atmosphere") ||
      title.toLowerCase().includes("activity") ||
      title.toLowerCase().includes("human");

    if (isKeywordsSection && items.length > 0) {
      const keywordsItem = items.find((item) => {
        const label = (item.label || item.key || "").toLowerCase();
        return label.includes("keywords") || label === "keywords";
      });

      if (keywordsItem && keywordsItem.value) {
        const value = keywordsItem.value.trim();
        if (value.length > 0 && !value.match(/^N\/A/) && value.length < 200) {
          const keywords = parseCommaSeparated(value);
          if (keywords.length > 0) {
            const validKeywords = keywords
              .filter((k) => {
                const trimmed = k.trim();
                return (
                  trimmed.length > 0 &&
                  trimmed.length < 50 &&
                  !trimmed.match(/^N\/A/) &&
                  !trimmed.match(/transcend|culture|lightinged/i)
                );
              })
              .slice(0, 6);

            if (validKeywords.length > 0) {
              items = validKeywords.map((keyword, idx) => ({
                id: `${title}-keyword-${idx}`,
                label: null,
                value: keyword.trim(),
              }));
            } else {
              items = [];
            }
          } else {
            items = [];
          }
        } else {
          items = [];
        }
      } else {
        const priorityFields = title.toLowerCase().includes("environment")
          ? [
              "room type",
              "indoor / outdoor",
              "indoor/outdoor",
              "outdoor",
              "style",
              "clean / cluttered",
              "clean/cluttered",
            ]
          : [];

        const keywordCandidates = items
          .filter((item) => {
            const value = (item.value || "").trim();
            const label = (item.label || item.key || "").toLowerCase();

            if (value.match(/^N\/A/i)) return false;

            if (priorityFields.length > 0) {
              const isPriority = priorityFields.some((pf) =>
                label.includes(pf)
              );
              if (isPriority) {
                return value.length > 0 && value.length < 50;
              }
            }

            if (value.length > 30) return false;
            if (value.includes(".") && value.split(".").length > 1)
              return false;
            return true;
          })
          .sort((a, b) => {
            if (priorityFields.length === 0) return 0;
            const aLabel = (a.label || a.key || "").toLowerCase();
            const bLabel = (b.label || b.key || "").toLowerCase();
            const aPriority = priorityFields.some((pf) => aLabel.includes(pf));
            const bPriority = priorityFields.some((pf) => bLabel.includes(pf));
            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;
            return 0;
          })
          .map((item) => {
            const value = (item.value || "").trim();
            if (value.includes(",")) {
              return parseCommaSeparated(value);
            }
            return [value];
          })
          .flat()
          .filter((k) => k && k.trim().length > 0 && k.trim().length < 50)
          .slice(0, 8);

        if (keywordCandidates.length > 0) {
          items = keywordCandidates.map((keyword, idx) => ({
            id: `${title}-field-${idx}`,
            label: null,
            value: keyword.trim(),
          }));
        } else {
          items = [];
        }
      }
    }

    if (!items.length && section?.text) {
      const cleanText = section.text.replace(/N\/A[^\n]*/g, "").trim();

      if (!cleanText || cleanText.length < 3) {
        items = [];
      } else {
        const lines = cleanText
          .split(/\n+/)
          .filter((l) => l.trim() && !l.trim().match(/^N\/A/));

        items = lines
          .map((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.match(/^N\/A/) || trimmed.length > 200) {
              return null;
            }

            const keyValueMatch = trimmed.match(/^([^:]+?):\s*(.+)$/);
            if (keyValueMatch) {
              const label = keyValueMatch[1].trim();
              let value = keyValueMatch[2].trim();

              if (value.match(/^N\/A/) || value.length > 150) {
                return null;
              }

              if (
                isObjectsSection &&
                (label.toLowerCase().includes("elements") ||
                  label.toLowerCase().includes("furniture") ||
                  label.toLowerCase().includes("key elements"))
              ) {
                const keywords = parseCommaSeparated(value);
                if (keywords.length > 1) {
                  return keywords.slice(0, 6).map((keyword, kIdx) => ({
                    id: `${title}-parsed-${idx}-${kIdx}`,
                    label: label,
                    value: keyword,
                  }));
                }
              }

              if (isKeywordsSection) {
                if (label.toLowerCase().includes("keywords")) {
                  const keywords = parseCommaSeparated(value);
                  if (keywords.length > 0) {
                    const validKeywords = keywords
                      .filter(
                        (k) =>
                          k.length > 0 && k.length < 50 && !k.match(/^N\/A/)
                      )
                      .slice(0, 6);

                    if (validKeywords.length > 0) {
                      return validKeywords.map((keyword, kIdx) => ({
                        id: `${title}-parsed-${idx}-${kIdx}`,
                        label: null,
                        value: keyword.trim(),
                      }));
                    }
                  }
                  return null;
                }

                const isEnvironment = title
                  .toLowerCase()
                  .includes("environment");
                const priorityFields = isEnvironment
                  ? [
                      "room type",
                      "indoor / outdoor",
                      "indoor/outdoor",
                      "outdoor",
                      "style",
                      "clean / cluttered",
                      "clean/cluttered",
                    ]
                  : [];
                const isPriorityField = priorityFields.some((pf) =>
                  label.toLowerCase().includes(pf)
                );

                const maxLength = isPriorityField ? 50 : 30;

                if (
                  value.length <= maxLength &&
                  (!value.includes(".") || isPriorityField)
                ) {
                  if (value.includes(",")) {
                    const keywords = parseCommaSeparated(value);
                    if (keywords.length > 0) {
                      return keywords
                        .filter(
                          (k) =>
                            k.trim().length > 0 && k.trim().length < maxLength
                        )
                        .slice(0, isEnvironment ? 8 : 6)
                        .map((keyword, kIdx) => ({
                          id: `${title}-parsed-${idx}-${kIdx}`,
                          label: null,
                          value: keyword.trim(),
                        }));
                    }
                  } else {
                    return {
                      id: `${title}-parsed-${idx}`,
                      label: null,
                      value: value.trim(),
                    };
                  }
                }
                return null;
              }

              return {
                id: `${title}-parsed-${idx}`,
                label: label,
                value: value,
              };
            }
            if (trimmed.length < 100 && trimmed.length > 0) {
              return {
                id: `${title}-text-${idx}`,
                label: null,
                value: trimmed,
              };
            }
            return null;
          })
          .flat()
          .filter((item) => item && item.value && item.value.trim());
      }
    }

    if (isObjectsSection && items.length > 0) {
      items = items
        .map((item) => {
          if (
            item.value &&
            item.value.includes(",") &&
            !item.value.includes(":")
          ) {
            const keywords = parseCommaSeparated(item.value);
            if (keywords.length > 1) {
              return keywords.map((keyword, idx) => ({
                ...item,
                id: `${item.id}-split-${idx}`,
                value: keyword,
              }));
            }
          }

          if (
            item.value &&
            item.value.length > 40 &&
            !item.value.includes(",")
          ) {
            const keywords = extractKeywords(item.value);
            if (keywords.length > 0) {
              return keywords.slice(0, 6).map((keyword, idx) => ({
                ...item,
                id: `${item.id}-keyword-${idx}`,
                value: keyword,
              }));
            }
          }
          return item;
        })
        .flat()
        .filter((item) => item.value);
    }

    if (!items.length && fallback) {
      if (isKeywordsSection) {
        const fallbackKeywords = (() => {
          const cleaned = fallback.trim();
          if (!cleaned) return [];
          const commaSplit = parseCommaSeparated(cleaned);
          if (commaSplit.length) return commaSplit;
          if (cleaned.includes("·")) {
            return cleaned.split("·").map((part) => part.trim());
          }
          if (cleaned.length <= 40) return [cleaned];
          return [];
        })()
          .map((keyword) => keyword.trim())
          .filter(
            (keyword) =>
              keyword &&
              keyword.length > 0 &&
              keyword.length < 50 &&
              !keyword.match(/^N\/A/)
          )
          .slice(0, 6);

        if (fallbackKeywords.length > 0) {
          items = fallbackKeywords.map((keyword, idx) => ({
            id: `${title}-fallback-${idx}`,
            label: null,
            value: keyword,
          }));
        }
      } else if (isObjectsSection && fallback.includes(",")) {
        const keywords = parseCommaSeparated(fallback);
        if (keywords.length > 0) {
          items = keywords.map((keyword, idx) => ({
            id: `${title}-fallback-${idx}`,
            label: null,
            value: keyword,
          }));
        }
      } else if (isObjectsSection && fallback.length > 30) {
        const keywords = extractKeywords(fallback);
        if (keywords.length > 0) {
          items = keywords.slice(0, 6).map((keyword, idx) => ({
            id: `${title}-fallback-${idx}`,
            label: null,
            value: keyword,
          }));
        }
      }
      if (!items.length && !isKeywordsSection) {
        items.push({
          id: `${title}-fallback`,
          label: null,
          value: fallback,
        });
      }
    }

    if (!items.length) {
      items.push({
        id: `${title}-placeholder`,
        label: null,
        value: "Awaiting model details for this dimension.",
      });
    }

    return { title, subtitle, items, icon: getCardIcon(title) };
  };

  const interpretationText =
    summarizeSection(interpretationSection) ||
    (interpretationSection?.text ? interpretationSection.text : "") ||
    summaryText ||
    rawText;

  const breakdownCards = [
    buildCard(
      "Environment",
      "Indoor/outdoor · room type · overall feel",
      environmentSection,
      summarizeSection(environmentSection) || summaryText
    ),
    buildCard(
      "Lighting & Atmosphere",
      "Light sources · mood · temperature",
      lightingSection,
      summarizeSection(lightingSection) || summaryText
    ),
    buildCard(
      "Activity / Human Context",
      "People · posture · actions",
      activitySection,
      summarizeSection(activitySection) || interpretationText
    ),
    buildCard(
      "Object & Furniture Context",
      "Key items · spatial layout",
      objectsSection,
      extractItems(environmentSection)[0]?.value || summaryText
    ),
  ];

  const metadataEntries = [
    ...(extractItems(metadataSection) || []),
    ...((environmentSection?.items || [])
      ?.filter((item) => item.label && item.value)
      .map((item, idx) => ({
        id: `env-meta-${idx}`,
        label: item.label,
        value: item.value,
      })) || []),
    ...((lightingSection?.items || [])
      ?.filter((item) => item.label && item.value)
      .map((item, idx) => ({
        id: `light-meta-${idx}`,
        label: item.label,
        value: item.value,
      })) || []),
    ...((activitySection?.items || [])
      ?.filter((item) => item.label && item.value)
      .map((item, idx) => ({
        id: `activity-meta-${idx}`,
        label: item.label,
        value: item.value,
      })) || []),
  ];

  const uniqueMetadata = [];
  const seenLabels = new Set();
  metadataEntries.forEach((entry) => {
    const labelKey = (entry.label || "").toLowerCase();
    if (labelKey && !seenLabels.has(labelKey)) {
      seenLabels.add(labelKey);
      uniqueMetadata.push(entry);
    }
  });

  const tagValues = (() => {
    if (!tagsSection) return [];
    if (tagsSection.items?.length) {
      return tagsSection.items
        .map((item) => item.value || item.text)
        .filter(Boolean)
        .flatMap((value) => value.split(/[,/]/).map((tag) => tag.trim()));
    }
    if (tagsSection.text) {
      return tagsSection.text
        .split(/[,/]/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [];
  })();

  const normalizedTags = Array.from(
    new Set(
      tagValues
        .map((tag) => tag.replace(/\[|\]/g, "").trim())
        .filter((tag) => tag.length > 1)
    )
  ).slice(0, 8);

  const hasStructuredContent =
    summaryText ||
    breakdownCards.some((card) => card.items.length > 0) ||
    interpretationText ||
    uniqueMetadata.length ||
    normalizedTags.length;

  if (!hasStructuredContent) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          {sections.length > 0
            ? "Scene analysis data received but could not be parsed. Showing raw output below."
            : "No scene context available yet."}
        </div>
        {rawText?.trim() && (
          <div className={styles.rawPreview}>
            <span>Raw Model Output</span>
            <pre className={styles.rawText}>{rawText}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Scene Intelligence</p>
          <h3>
            <FontAwesomeIcon icon={faEye} className={styles.headerIcon} />
            Scene Analysis
          </h3>
        </div>
        <p>Environment, lighting, and activity breakdown</p>
      </header>

      <section className={styles.summaryBanner}>
        <div className={styles.summaryContent}>
          <span className={styles.summaryLabel}>
            <FontAwesomeIcon icon={faEye} className={styles.labelIcon} />
            Scene Summary
          </span>
          <p className={styles.summaryText}>
            {summaryText || "The model did not return a scene overview."}
          </p>
        </div>
        {contextHighlights.length > 0 && (
          <div className={styles.summaryHighlights}>
            {contextHighlights.map((highlight) => (
              <div className={styles.highlightCard} key={highlight.label}>
                <span>{highlight.label}</span>
                <p>{highlight.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.contextBlock}>
        <div className={styles.contextFrame}>
          <div className={styles.contextGlow} />
          <div className={styles.contextOverlay}>
            <span>Immediate Context</span>
            <p>
              {contextHighlights.length
                ? contextHighlights.map((h) => h.value).join(" • ")
                : "Context highlights become available once the model describes the setting."}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.breakdownSection}>
        <div className={styles.breakdownHeader}>
          <h4>Scene Breakdown</h4>
          <p>Key dimensions mapped into focused cards</p>
        </div>
        <div className={styles.breakdownGrid}>
          {breakdownCards.map((card) => (
            <div className={styles.breakdownCard} key={card.title}>
              <div>
                <span className={styles.cardLabel}>
                  <FontAwesomeIcon
                    icon={card.icon}
                    className={styles.cardIcon}
                  />
                  {card.title}
                </span>
                <p className={styles.cardSubtitle}>{card.subtitle}</p>
              </div>
              <ul className={styles.breakdownList}>
                {card.items.map((item) => {
                  const displayText = item.label
                    ? `${item.label}: ${item.value}`
                    : item.value;
                  return (
                    <li key={item.id} className={styles.breakdownItem}>
                      {displayText}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {(interpretationText ||
        uniqueMetadata.length > 0 ||
        normalizedTags.length > 0) && (
        <section className={styles.interpretationSection}>
          <div className={styles.interpretationCard}>
            <span className={styles.summaryLabel}>
              <FontAwesomeIcon icon={faBrain} className={styles.labelIcon} />
              Scene Interpretation
            </span>
            <p className={styles.interpretationText}>{interpretationText}</p>
          </div>
          <div className={styles.metadataCard}>
            <div className={styles.breakdownHeader}>
              <h4>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className={styles.headerIcon}
                />
                Scene Metadata
              </h4>
              <p>Structured cues inferred by the model</p>
            </div>
            {uniqueMetadata.length > 0 && (
              <div className={styles.metadataGrid}>
                {uniqueMetadata.slice(0, 6).map((entry) => (
                  <div className={styles.metadataItem} key={entry.id}>
                    <span>{entry.label}</span>
                    <p>{entry.value}</p>
                  </div>
                ))}
              </div>
            )}
            {normalizedTags.length > 0 && (
              <div className={styles.tagsRow}>
                <FontAwesomeIcon icon={faTags} className={styles.tagsIcon} />
                {normalizedTags.map((tag) => (
                  <span className={styles.tagChip} key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!sections.length && rawText?.trim() && (
        <div className={styles.rawPreview}>
          <span>Raw Model Output</span>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageSceneAnalysis;
