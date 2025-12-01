import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faUser,
  faPalette,
  faBorderAll,
  faSmile,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ImageGeneralAnalysis.module.css";

const ImageGeneralAnalysis = ({
  data = {},
  rawText = "",
  structuredData = null,
}) => {
  const sections = data?.sections || [];
  const metadata = data?.metadata || [];

  const matchSection = (candidates = []) =>
    sections.find((section) =>
      candidates.some((name) =>
        section?.name?.toLowerCase().includes(name.toLowerCase())
      )
    );

  const normalizeText = (text = "") =>
    text
      .replace(/^['"]+/, "")
      .replace(/\s+/g, " ")
      .replace(/\s([,.!?])/g, "$1")
      .trim();

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

  const extractFromRaw = (keys = []) => {
    for (const section of sections) {
      if (section.text) {
        for (const key of keys) {
          const regex = new RegExp(`${key}\\s*[:|-]\\s*(.+?)(?:\n|$)`, "i");
          const match = section.text.match(regex);
          if (match?.[1]) {
            const value = match[1].trim();
            if (value && value.length > 0) return normalizeText(value);
          }
        }
      }
      if (section.items) {
        for (const item of section.items) {
          if (typeof item === "string") continue;
          const itemKey = (
            item.key ||
            item.label ||
            item.name ||
            ""
          ).toLowerCase();
          for (const key of keys) {
            if (itemKey.includes(key.toLowerCase())) {
              const value = item.value || item.text || item.description;
              if (value) return normalizeText(value);
            }
          }
        }
      }
    }

    const lines = rawText.split(/\n|•|-/).map((line) => line.trim());
    for (const line of lines) {
      if (!line) continue;
      for (const key of keys) {
        const regex = new RegExp(
          `${key}\\s*[:|-]\\s*(.+?)(?:\n|$|SECTION:)`,
          "i"
        );
        const match = line.match(regex);
        if (match?.[1]) {
          const value = match[1].trim();
          if (
            value &&
            value.length > 0 &&
            !value.toLowerCase().includes("section:")
          ) {
            return normalizeText(value);
          }
        }
      }
    }
    return "";
  };

  const getSectionValue = (section, candidates = []) => {
    if (!section?.items) return "";
    for (const candidate of candidates) {
      const match = section.items.find((item) => {
        const key = (item.key || item.label || item.name || "").toLowerCase();
        return key.includes(candidate.toLowerCase());
      });
      if (match) {
        return match.value || match.text || match.description || "";
      }
    }
    return "";
  };

  const findValue = (candidates = []) => {
    const matchFromItem = (item = {}, fieldName = null) => {
      const key = (item.label || item.key || item.name || "")
        .toLowerCase()
        .trim();
      if (!key) return null;

      if (fieldName) {
        const fieldNameLower = fieldName.toLowerCase();
        if (key === fieldNameLower) {
          return item.value || item.text || item.description;
        }
        if (fieldNameLower.includes(key) && key.length > 3) {
          return item.value || item.text || item.description;
        }
        if (key.includes(fieldNameLower) && fieldNameLower.length > 3) {
          return item.value || item.text || item.description;
        }
      }

      return candidates.some((candidate) => {
        const candidateLower = candidate.toLowerCase();
        if (key === candidateLower) return true;
        if (key.includes(candidateLower) && candidateLower.length > 3)
          return true;
        return false;
      })
        ? item.value || item.text || item.description
        : null;
    };

    if (keyAttributesSection?.items) {
      for (const item of keyAttributesSection.items) {
        if (typeof item === "string") continue;
        const value = matchFromItem(item);
        if (value) return value;
      }
    }
    if (keyAttributesSection?.text) {
      const lower = keyAttributesSection.text.toLowerCase();
      const candidate = candidates.find((c) =>
        lower.includes(`${c.toLowerCase()}:`)
      );
      if (candidate) {
        const regex = new RegExp(
          `${candidate}\\s*:\\s*(.+?)(?:\n|$|SECTION:)`,
          "i"
        );
        const match = keyAttributesSection.text.match(regex);
        if (match?.[1]) {
          const value = match[1].trim();
          if (value && value.length > 0) return value;
        }
      }
    }

    for (const item of metadata) {
      const value = matchFromItem(item);
      if (value) return value;
    }

    for (const section of sections) {
      if (section.items) {
        for (const item of section.items) {
          if (typeof item === "string") continue;
          const value = matchFromItem(item);
          if (value) return value;
        }
      }
      if (section.text) {
        const lower = section.text.toLowerCase();
        const candidate = candidates.find((c) =>
          lower.includes(`${c.toLowerCase()}:`)
        );
        if (candidate) {
          const regex = new RegExp(
            `${candidate}\\s*:\\s*(.+?)(?:\n|$|SECTION:)`,
            "i"
          );
          const match = section.text.match(regex);
          if (match?.[1]) {
            const value = match[1].trim();
            if (value && value.length > 0) return value;
          }
        }
      }
    }

    return null;
  };

  const overviewSection = matchSection(["overview", "general", "summary"]);
  const keyAttributesSection = matchSection(["key attributes", "attributes"]);

  const summaryFromSection =
    getSectionValue(overviewSection, ["summary", "overall description"]) ||
    getSectionText(overviewSection);

  const rawSummary =
    summaryFromSection ||
    rawText.split(
      /(?:Main Objects|Key Elements|Overall Impression|Card Grid)/i
    )[0] ||
    rawText.split("\n").slice(0, 3).join(" ");

  const summaryText = normalizeText(rawSummary);

  const isValidValueForField = (fieldId, value) => {
    if (!value || value.length < 1) return false;
    const valueLower = value.toLowerCase();

    if (
      valueLower.includes("section:") ||
      valueLower.includes("key attributes")
    )
      return false;

    switch (fieldId) {
      case "imageType":
        const validTypes = [
          "photo",
          "screenshot",
          "illustration",
          "document",
          "diagram",
          "chart",
          "graph",
        ];
        return (
          validTypes.some((type) => valueLower.includes(type)) ||
          valueLower.length < 20
        );
      case "lighting":
        const invalidForLighting = [
          "photo",
          "screenshot",
          "illustration",
          "cat",
          "black",
          "white",
          "blue",
          "yellow",
          "tan",
          "beige",
          "red",
          "green",
          "gray",
          "grey",
          "brown",
          "orange",
          "pink",
          "purple",
        ];
        return !invalidForLighting.some(
          (invalid) => valueLower === invalid || valueLower.includes(invalid)
        );
      case "mainSubject":
        const invalidForSubject = [
          "photo",
          "natural",
          "artificial",
          "black",
          "white",
          "blue",
        ];
        return !invalidForSubject.some((invalid) => valueLower === invalid);
      case "colors":
        const colorWords = [
          "black",
          "white",
          "blue",
          "red",
          "green",
          "yellow",
          "gray",
          "grey",
          "brown",
          "orange",
          "pink",
          "purple",
        ];
        return (
          colorWords.some((color) => valueLower.includes(color)) ||
          valueLower.includes(",")
        );
      default:
        return true;
    }
  };

  const CARD_DEFINITIONs = [
    {
      id: "imageType",
      label: "Image Type",
      detail: "Photo, screenshot, illustration",
      icon: faImage,
      extractors: [
        ["image type", "type", "category"],
        ["media", "format"],
        ["visual type"],
        ["presentation"],
        ["capture type"],
      ],
    },
    {
      id: "mainSubject",
      label: "Main Subject",
      detail: "Primary focus in the frame",
      icon: faUser,
      extractors: [
        ["main subject", "subject", "object focus", "main objects"],
        ["primary subject", "focus"],
        ["featured subject"],
        ["topic"],
      ],
    },
    {
      id: "colors",
      label: "Dominant Colors",
      detail: "Palette or key hues",
      icon: faPalette,
      extractors: [
        ["color palette", "dominant colors", "colors"],
        ["primary colors"],
        ["tones"],
      ],
    },
    {
      id: "layout",
      label: "Layout & Structure",
      detail: "Framing, composition, alignment",
      icon: faBorderAll,
      extractors: [
        ["layout", "frame", "composition", "structure"],
        ["arrangement"],
        ["scene structure"],
      ],
    },
    {
      id: "mood",
      label: "Overall Mood",
      detail: "Tone or emotion conveyed",
      icon: faSmile,
      extractors: [["overall mood", "mood", "atmosphere", "tone"], ["emotion"]],
    },
    {
      id: "lighting",
      label: "Lighting",
      detail: "Light source and intensity",
      icon: faLightbulb,
      extractors: [
        ["lighting", "illumination", "light source"],
        ["lighting style"],
      ],
    },
  ];

  const extractValueFromGroups = (groups = []) => {
    for (const group of groups) {
      const value =
        findValue(group) ||
        extractFromRaw(
          group.map((label) => label.replace(/^\w/, (c) => c.toUpperCase()))
        );
      if (value) return value;
    }
    return null;
  };

  const keyAttributes = CARD_DEFINITIONs.map((card) => {
    let value = null;
    if (structuredData && structuredData.keyAttributes) {
      const keyAttrs = structuredData.keyAttributes;
      const fieldMap = {
        imageType: keyAttrs.imageType,
        mainSubject: keyAttrs.mainSubject,
        colors: keyAttrs.dominantColors,
        layout: keyAttrs.layoutStructure,
        mood: keyAttrs.overallMood,
        lighting: keyAttrs.lighting,
      };

      const mappedValue = fieldMap[card.id];
      if (mappedValue && mappedValue.trim()) {
        value = normalizeText(mappedValue);
        return {
          id: card.id,
          label: card.label,
          value: value,
          detail: card.detail,
          icon: card.icon,
        };
      }
    }

    if (keyAttributesSection?.items && keyAttributesSection.items.length > 0) {
      for (const item of keyAttributesSection.items) {
        if (typeof item === "string" || (!item.key && !item.label)) continue;

        const itemKey = (item.key || item.label || "").trim();
        const itemValue = (
          item.value ||
          item.text ||
          item.description ||
          ""
        ).trim();

        if (!itemKey || !itemValue) continue;

        const itemKeyLower = itemKey.toLowerCase();
        const cardLabelLower = card.label.toLowerCase();
        const cardLabelNoAmp = card.label
          .replace(/\s*&\s*/g, " ")
          .toLowerCase();

        if (
          itemKeyLower === cardLabelLower ||
          itemKeyLower === cardLabelNoAmp
        ) {
          const normalizedValue = normalizeText(itemValue);
          if (
            normalizedValue &&
            isValidValueForField(card.id, normalizedValue)
          ) {
            value = normalizedValue;
            break;
          }
        }
      }

      if (!value) {
        const extractorVariations = card.extractors.flat().map((e) => {
          return e
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        });

        for (const item of keyAttributesSection.items) {
          if (typeof item === "string" || (!item.key && !item.label)) continue;

          const itemKey = (item.key || item.label || "").trim();
          const itemValue = (
            item.value ||
            item.text ||
            item.description ||
            ""
          ).trim();

          if (!itemKey || !itemValue) continue;

          const itemKeyLower = itemKey.toLowerCase();

          const matched = extractorVariations.some((variation) => {
            const variationLower = variation.toLowerCase();
            if (itemKeyLower === variationLower) return true;
            if (
              variationLower.length >= 5 &&
              itemKeyLower.includes(variationLower)
            )
              return true;
            return false;
          });

          if (matched) {
            const normalizedValue = normalizeText(itemValue);
            if (
              normalizedValue &&
              isValidValueForField(card.id, normalizedValue)
            ) {
              value = normalizedValue;
              break;
            }
          }
        }
      }
    }

    let keyAttributesText = null;

    if (!value && keyAttributesSection?.text) {
      keyAttributesText = keyAttributesSection.text;
    }
    if (!keyAttributesText) {
      if (
        rawText.includes("SECTION: Key Attributes") ||
        rawText.includes("Key Attributes")
      ) {
        const match1 = rawText.match(
          /SECTION:\s*Key Attributes\s*\n([\s\S]+?)(?=\n\s*SECTION:|$)/i
        );
        if (match1 && match1[1]) {
          keyAttributesText = match1[1];
        }
      }
    }
    if (!keyAttributesText) {
      const match2 = rawText.match(
        /Key Attributes\s*\n([\s\S]+?)(?=\n\s*SECTION:|$)/i
      );
      if (match2 && match2[1]) {
        keyAttributesText = match2[1];
      }
    }
    if (!keyAttributesText && rawText.includes("Key Attributes")) {
      const keyAttrIndex = rawText.toLowerCase().indexOf("key attributes");
      if (keyAttrIndex !== -1) {
        const afterKeyAttr = rawText.substring(keyAttrIndex);
        const match3 = afterKeyAttr.match(
          /key attributes[:\s]*([\s\S]+?)(?=\n\s*SECTION:|$)/i
        );
        if (match3 && match3[1]) {
          keyAttributesText = match3[1];
        }
      }
    }

    if (keyAttributesText) {
      const lines = keyAttributesText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line);

      const fieldNameVariations = [
        card.label,
        card.label.replace(/\s*&\s*/g, " "),
        card.label.replace(/\s*&\s*/g, " and "),
        card.label.replace(/\s+/g, " "),
        ...card.extractors.flat().map((e) => {
          return e
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }),
      ];

      const uniqueVariations = [...new Set(fieldNameVariations)].filter(
        (v) => v.length >= 3
      );

      for (const line of lines) {
        if (!line || line.trim().length === 0) continue;

        for (const variation of uniqueVariations) {
          const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`^${escaped}\\s*[:]\\s*(.+)$`, "i");
          const match = line.match(regex);

          if (match && match[1]) {
            const extracted = match[1].trim();
            const cleaned = extracted
              .split(/\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:)/)[0]
              .trim();
            if (cleaned && cleaned.length > 0 && cleaned.length < 200) {
              const normalizedValue = normalizeText(cleaned);
              if (isValidValueForField(card.id, normalizedValue)) {
                value = normalizedValue;
                break;
              }
            }
          }
        }

        if (value && value !== "Not detected") {
          break;
        }
      }
    }

    if (!value || value === "Not detected") {
      if (keyAttributesSection?.items) {
        const cardLabelLower = card.label.toLowerCase();
        const cardLabelNoAmp = card.label
          .replace(/\s*&\s*/g, " ")
          .toLowerCase();

        for (const item of keyAttributesSection.items) {
          if (typeof item === "string") continue;
          const itemKey = (item.key || item.label || "").toLowerCase().trim();

          if (itemKey === cardLabelLower || itemKey === cardLabelNoAmp) {
            const itemValue = item.value || item.text || item.description;
            if (itemValue) {
              const normalized = normalizeText(itemValue);
              if (isValidValueForField(card.id, normalized)) {
                value = normalized;
                break;
              }
            }
          }
        }
      }

      if (!value || value === "Not detected") {
        value = extractValueFromGroups(card.extractors);
      }
    }

    if (!value || value === "Not detected") {
      const labelVariations = [
        card.label,
        card.label.replace(/ & /g, " "),
        card.label.replace(/ & /g, " and "),
        ...card.extractors.flat().map((e) => {
          return e
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }),
      ];

      const uniqueLabels = [...new Set(labelVariations)];

      for (const label of uniqueLabels) {
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        let regex = new RegExp(
          `^${escapedLabel}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
          "im"
        );
        let match = rawText.match(regex);

        if (!match) {
          regex = new RegExp(
            `${escapedLabel}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
            "i"
          );
          match = rawText.match(regex);
        }

        if (match?.[1]) {
          const extracted = match[1].trim();
          const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
          if (
            cleaned &&
            cleaned.length > 0 &&
            !cleaned.toLowerCase().includes("section:") &&
            cleaned.length < 200
          ) {
            const normalizedValue = normalizeText(cleaned);
            if (isValidValueForField(card.id, normalizedValue)) {
              value = normalizedValue;
              break;
            }
          }
        }
      }
    }

    if ((!value || value === "Not detected") && keyAttributesSection) {
      const sectionText = keyAttributesSection.text || "";
      const sectionItems = keyAttributesSection.items || [];
      for (const item of sectionItems) {
        if (typeof item === "string") continue;
        const itemKey = (item.key || item.label || item.name || "").trim();
        const itemValue = item.value || item.text || item.description;

        if (!itemKey || !itemValue) continue;

        const cardLabelNormalized = card.label
          .toLowerCase()
          .replace(/\s*&\s*/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const itemKeyNormalized = itemKey
          .toLowerCase()
          .replace(/\s*&\s*/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (itemKeyNormalized === cardLabelNormalized) {
          value = normalizeText(itemValue);
          break;
        }

        const cardWords = cardLabelNormalized
          .split(/\s+/)
          .filter((w) => w.length > 2);
        const itemWords = itemKeyNormalized
          .split(/\s+/)
          .filter((w) => w.length > 2);

        const allWordsMatch =
          cardWords.length > 0 &&
          cardWords.every((word) =>
            itemWords.some(
              (itemWord) =>
                itemWord === word ||
                itemWord.includes(word) ||
                word.includes(itemWord)
            )
          );

        const allItemWordsMatch =
          itemWords.length > 0 &&
          itemWords.every((word) =>
            cardWords.some(
              (cardWord) =>
                cardWord === word ||
                cardWord.includes(word) ||
                word.includes(cardWord)
            )
          );

        if ((allWordsMatch || allItemWordsMatch) && itemValue) {
          value = normalizeText(itemValue);
          break;
        }

        for (const extractor of card.extractors.flat()) {
          const extractorLower = extractor.toLowerCase().trim();
          if (extractorLower.length < 3) continue;

          if (
            itemKeyNormalized === extractorLower ||
            (itemKeyNormalized.includes(extractorLower) &&
              extractorLower.length > 4) ||
            (extractorLower.includes(itemKeyNormalized) &&
              itemKeyNormalized.length > 4)
          ) {
            value = normalizeText(itemValue);
            break;
          }
        }
        if (value && value !== "Not detected") break;
      }

      if (!value || value === "Not detected") {
        const cardLabelEscaped = card.label.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        let regex = new RegExp(
          `${cardLabelEscaped}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
          "i"
        );
        let match = sectionText.match(regex);
        if (match?.[1]) {
          const extracted = match[1].trim();
          const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
          if (cleaned && cleaned.length > 0) {
            value = normalizeText(cleaned);
          }
        }

        if (!value || value === "Not detected") {
          const labelWithoutAmp = card.label.replace(/\s*&\s*/g, " ");
          const labelEscaped = labelWithoutAmp.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          regex = new RegExp(
            `${labelEscaped}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
            "i"
          );
          match = sectionText.match(regex);
          if (match?.[1]) {
            const extracted = match[1].trim();
            const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
            if (cleaned && cleaned.length > 0) {
              value = normalizeText(cleaned);
            }
          }
        }

        if (!value || value === "Not detected") {
          for (const extractor of card.extractors.flat()) {
            if (extractor.length < 3) continue;

            const regex = new RegExp(
              `${extractor}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
              "i"
            );
            const match = sectionText.match(regex);
            if (match?.[1]) {
              const extracted = match[1].trim();
              const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
              if (cleaned && cleaned.length > 0) {
                value = normalizeText(cleaned);
                break;
              }
            }
          }
        }
      }
    }

    if (!value || value === "Not detected") {
      value = getSectionText(matchSection(card.extractors.flat()));
      if (value) value = normalizeText(value);
    }

    const result = {
      id: card.id,
      label: card.label,
      value: value || "Not detected",
      detail: card.detail,
      icon: card.icon,
    };
    return result;
  });

  const hasContent =
    summaryText ||
    keyAttributes.some((card) => card.value && card.value !== "Not detected");

  const hasStructuredData = structuredData && structuredData.keyAttributes;

  const shouldShowRawText = !hasStructuredData && !hasContent;

  if (!hasContent && !rawText.trim()) {
    return (
      <div className={styles.emptyState}>
        No general analysis available yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>General Analysis</h3>
          <p>Overall description and key elements</p>
        </div>
      </div>

      {summaryText && (
        <div className={styles.summaryCard}>
          <h4>Overall Description</h4>
          <p>{summaryText}</p>
        </div>
      )}

      <div className={styles.attributesGrid}>
        {keyAttributes.map((attr) => (
          <div className={styles.attributeCard} key={attr.id}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}>
                <FontAwesomeIcon icon={attr.icon} className={styles.cardIcon} />
              </div>
              <span className={styles.cardLabel}>{attr.label}</span>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.cardValue}>{attr.value || "Not detected"}</p>
              <span className={styles.cardDetail}>{attr.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {metadata.length > 0 && (
        <div className={styles.metadataStrip}>
          {metadata.slice(0, 4).map((item, idx) => (
            <div
              className={styles.metadataItem}
              key={`${item.label || item.key}-${idx}`}
            >
              <span className={styles.metaLabel}>
                {item.label || item.key || "Field"}
              </span>
              <span className={styles.metaValue}>
                {item.value || item.text || item.detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {shouldShowRawText && rawText.trim() && (
        <div className={styles.summaryCard}>
          <h4>AI Notes</h4>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageGeneralAnalysis;
