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

  console.log("[ImageGeneralAnalysis] ========== DEBUG START ==========");
  console.log(
    "[ImageGeneralAnalysis] Full data object:",
    JSON.stringify(data, null, 2)
  );
  console.log(
    "[ImageGeneralAnalysis] Raw text (first 500 chars):",
    rawText.substring(0, 500)
  );
  console.log("[ImageGeneralAnalysis] Raw text (full):", rawText);
  console.log("[ImageGeneralAnalysis] Sections array:", sections);
  console.log("[ImageGeneralAnalysis] Sections count:", sections.length);
  sections.forEach((section, idx) => {
    console.log(`[ImageGeneralAnalysis] Section ${idx}:`, {
      name: section.name,
      text: section.text?.substring(0, 200),
      itemsCount: section.items?.length || 0,
      items: section.items,
    });
  });
  console.log("[ImageGeneralAnalysis] Metadata:", metadata);
  console.log("[ImageGeneralAnalysis] ========== DEBUG END ==========");

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
    // First try to find in sections
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

    // Fallback: search entire raw text
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

      // If we have a specific field name, try exact or close match first
      if (fieldName) {
        const fieldNameLower = fieldName.toLowerCase();
        // Exact match
        if (key === fieldNameLower) {
          return item.value || item.text || item.description;
        }
        // Field name contains the key (e.g., "Layout Structure" contains "Layout")
        if (fieldNameLower.includes(key) && key.length > 3) {
          return item.value || item.text || item.description;
        }
        // Key contains field name (e.g., "Layout Structure" in key)
        if (key.includes(fieldNameLower) && fieldNameLower.length > 3) {
          return item.value || item.text || item.description;
        }
      }

      // Fallback: check if any candidate matches
      return candidates.some((candidate) => {
        const candidateLower = candidate.toLowerCase();
        // Prefer exact match
        if (key === candidateLower) return true;
        // Then check if key contains candidate (but candidate must be substantial)
        if (key.includes(candidateLower) && candidateLower.length > 3)
          return true;
        return false;
      })
        ? item.value || item.text || item.description
        : null;
    };

    // First check Key Attributes section (most likely to have the data)
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

  console.log(
    "[ImageGeneralAnalysis] Key Attributes Section found:",
    keyAttributesSection
  );
  if (keyAttributesSection) {
    console.log(
      "[ImageGeneralAnalysis] Key Attributes items:",
      keyAttributesSection.items
    );
    console.log(
      "[ImageGeneralAnalysis] Key Attributes text:",
      keyAttributesSection.text
    );
  }

  // Debug: Log raw text to see what we're working with
  console.log("[ImageGeneralAnalysis] Raw text length:", rawText?.length);
  console.log(
    "[ImageGeneralAnalysis] Raw text preview (first 500 chars):",
    rawText?.substring(0, 500)
  );
  console.log(
    "[ImageGeneralAnalysis] Raw text contains 'Key Attributes':",
    rawText?.includes("Key Attributes")
  );
  console.log(
    "[ImageGeneralAnalysis] Raw text contains 'SECTION:':",
    rawText?.includes("SECTION:")
  );

  // Check all section names in data (parsedInsights)
  if (data?.sections) {
    console.log(
      "[ImageGeneralAnalysis] Parsed sections:",
      data.sections.map((s) => s.name)
    );
  }

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

  // Helper to validate if a value makes sense for a given field
  const isValidValueForField = (fieldId, value) => {
    if (!value || value.length < 1) return false;
    const valueLower = value.toLowerCase();

    // Reject values that are clearly field names or section headers
    if (
      valueLower.includes("section:") ||
      valueLower.includes("key attributes")
    )
      return false;

    // Field-specific validation
    switch (fieldId) {
      case "imageType":
        // Should be things like "photo", "screenshot", "illustration", not other field values
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
        // Should be lighting-related, not "photo" or other field values
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
        // Reject if value contains any invalid word (not just exact match)
        return !invalidForLighting.some(
          (invalid) => valueLower === invalid || valueLower.includes(invalid)
        );
      case "mainSubject":
        // Should be a subject, not a color or type
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
        // Should contain color words or be comma-separated
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
    console.log(`\n[ImageGeneralAnalysis] Processing card: ${card.label}`);

    let value = null;

    // Strategy -1: Use structured data from backend if available (MOST RELIABLE - like Object Detection)
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
        console.log(
          `[ImageGeneralAnalysis] ${card.label} - Found in structured data from backend: "${value}"`
        );
        // Return early with structured data - no need to continue parsing
        return {
          id: card.id,
          label: card.label,
          value: value,
          detail: card.detail,
          icon: card.icon,
        };
      }
    }

    // Strategy 0: First, try to get value from parsed items in Key Attributes section (FALLBACK)
    if (keyAttributesSection?.items && keyAttributesSection.items.length > 0) {
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Checking ${keyAttributesSection.items.length} items in Key Attributes section`
      );

      // Build field name variations to match - prioritize exact matches
      const fieldNameVariations = [
        card.label, // "Image Type", "Main Subject", "Lighting", etc. (EXACT MATCH FIRST)
        card.label.replace(/\s*&\s*/g, " "), // "Layout Structure" (for "Layout & Structure")
        card.label.replace(/\s*&\s*/g, " and "), // "Layout and Structure"
      ];

      // Look for EXACT match first (most reliable)
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

        // PRIORITY 1: Exact match with card label (case insensitive)
        const itemKeyLower = itemKey.toLowerCase();
        const cardLabelLower = card.label.toLowerCase();
        const cardLabelNoAmp = card.label
          .replace(/\s*&\s*/g, " ")
          .toLowerCase();

        if (
          itemKeyLower === cardLabelLower ||
          itemKeyLower === cardLabelNoAmp
        ) {
          // This is an exact match - use it immediately
          const normalizedValue = normalizeText(itemValue);
          if (
            normalizedValue &&
            isValidValueForField(card.id, normalizedValue)
          ) {
            value = normalizedValue;
            console.log(
              `[ImageGeneralAnalysis] ${card.label} - Found EXACT match in items! Key: "${itemKey}", Value: "${value}"`
            );
            break; // Found exact match, stop searching
          } else {
            console.log(
              `[ImageGeneralAnalysis] ${card.label} - Exact match found but value rejected: "${normalizedValue}" for field ${card.id}`
            );
          }
        }
      }

      // PRIORITY 2: If no exact match, try extractor keywords (but be more careful)
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

          // Check if extractor variations match (but only if it's a substantial match)
          const matched = extractorVariations.some((variation) => {
            const variationLower = variation.toLowerCase();
            // Prefer exact match
            if (itemKeyLower === variationLower) return true;
            // Only allow contains match if variation is substantial (3+ chars) and item key is not too different
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
              console.log(
                `[ImageGeneralAnalysis] ${card.label} - Found via extractor match! Key: "${itemKey}", Value: "${value}"`
              );
              break;
            }
          }
        }
      }
    }

    // Strategy 0.5: Direct search in raw text for "Key Attributes" section (fallback if items didn't work)
    // Try multiple patterns to find the Key Attributes section
    let keyAttributesText = null;

    // First, check if we have a parsed "Key Attributes" section text
    if (!value && keyAttributesSection?.text) {
      keyAttributesText = keyAttributesSection.text;
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Using Key Attributes text from parsed section`
      );
    }

    // Pattern 1: "SECTION: Key Attributes\n..."
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
          console.log(
            `[ImageGeneralAnalysis] ${card.label} - Found Key Attributes section (pattern 1)`
          );
        }
      }
    }

    // Pattern 2: "Key Attributes\n..." (without SECTION:)
    if (!keyAttributesText) {
      const match2 = rawText.match(
        /Key Attributes\s*\n([\s\S]+?)(?=\n\s*SECTION:|$)/i
      );
      if (match2 && match2[1]) {
        keyAttributesText = match2[1];
        console.log(
          `[ImageGeneralAnalysis] ${card.label} - Found Key Attributes section (pattern 2)`
        );
      }
    }

    // Pattern 3: Look for the fields directly after "Key Attributes" on same line or next lines
    if (!keyAttributesText && rawText.includes("Key Attributes")) {
      const keyAttrIndex = rawText.toLowerCase().indexOf("key attributes");
      if (keyAttrIndex !== -1) {
        const afterKeyAttr = rawText.substring(keyAttrIndex);
        // Extract until next SECTION or end
        const match3 = afterKeyAttr.match(
          /key attributes[:\s]*([\s\S]+?)(?=\n\s*SECTION:|$)/i
        );
        if (match3 && match3[1]) {
          keyAttributesText = match3[1];
          console.log(
            `[ImageGeneralAnalysis] ${card.label} - Found Key Attributes section (pattern 3)`
          );
        }
      }
    }

    // Pattern 4: Try to find fields directly in raw text (fallback if no section header)
    if (!keyAttributesText) {
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - No Key Attributes section found, will try direct field extraction`
      );
    }

    if (keyAttributesText) {
      // Split by lines to process each field separately - this prevents cross-field contamination
      const lines = keyAttributesText
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line);

      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Processing ${lines.length} lines from Key Attributes`
      );
      console.log(`[ImageGeneralAnalysis] ${card.label} - Lines:`, lines);

      // Build all possible field name variations to try
      // IMPORTANT: Backend returns exact field names like "Image Type", "Main Subject", "Layout Structure", etc.
      const fieldNameVariations = [
        // Exact matches first (most reliable)
        card.label, // "Image Type", "Main Subject", "Overall Mood", "Lighting"
        card.label.replace(/\s*&\s*/g, " "), // "Layout Structure" (for "Layout & Structure")
        card.label.replace(/\s*&\s*/g, " and "), // "Layout and Structure"
        // Also try without spaces for compound names
        card.label.replace(/\s+/g, " "), // Normalize spaces
        // Try extractor keywords capitalized
        ...card.extractors.flat().map((e) => {
          // Capitalize first letter of each word
          return e
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }),
      ];

      // Remove duplicates and filter out short ones
      const uniqueVariations = [...new Set(fieldNameVariations)].filter(
        (v) => v.length >= 3
      );

      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Trying variations:`,
        uniqueVariations
      );

      for (const line of lines) {
        // Skip empty lines
        if (!line || line.trim().length === 0) continue;

        // Try each variation - must match EXACTLY at start of line
        for (const variation of uniqueVariations) {
          const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Match at start of line (case insensitive) - be very precise
          const regex = new RegExp(`^${escaped}\\s*[:]\\s*(.+)$`, "i");
          const match = line.match(regex);

          if (match && match[1]) {
            const extracted = match[1].trim();
            // Stop at next field (capitalized word + colon) or end of line
            // More precise: look for pattern like "Word Word:" (field name pattern)
            const cleaned = extracted
              .split(/\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*:)/)[0]
              .trim();
            if (cleaned && cleaned.length > 0 && cleaned.length < 200) {
              const normalizedValue = normalizeText(cleaned);
              // Validate that this value makes sense for this field
              if (isValidValueForField(card.id, normalizedValue)) {
                value = normalizedValue;
                console.log(
                  `[ImageGeneralAnalysis] ${card.label} - Found match! Line: "${line}" | Variation: "${variation}" | Value: "${value}"`
                );
                break; // Found the correct field, stop searching variations
              } else {
                console.log(
                  `[ImageGeneralAnalysis] ${card.label} - Rejected invalid value: "${normalizedValue}" for field ${card.id}`
                );
              }
            }
          }
        }

        if (value && value !== "Not detected") {
          break; // Found value, stop processing lines
        }
      }
    }

    // Strategy 1: Try structured data from sections (with precise matching)
    if (!value || value === "Not detected") {
      // First, try to find exact match in Key Attributes items using card label
      if (keyAttributesSection?.items) {
        const cardLabelLower = card.label.toLowerCase();
        const cardLabelNoAmp = card.label
          .replace(/\s*&\s*/g, " ")
          .toLowerCase();

        for (const item of keyAttributesSection.items) {
          if (typeof item === "string") continue;
          const itemKey = (item.key || item.label || "").toLowerCase().trim();

          // Exact match with card label
          if (itemKey === cardLabelLower || itemKey === cardLabelNoAmp) {
            const itemValue = item.value || item.text || item.description;
            if (itemValue) {
              const normalized = normalizeText(itemValue);
              if (isValidValueForField(card.id, normalized)) {
                value = normalized;
                console.log(
                  `[ImageGeneralAnalysis] ${card.label} - Found exact match in items: "${value}"`
                );
                break;
              }
            }
          }
        }
      }

      // If still no value, try extractValueFromGroups (but it should be more precise now)
      if (!value || value === "Not detected") {
        value = extractValueFromGroups(card.extractors);
        console.log(
          `[ImageGeneralAnalysis] ${card.label} - After extractValueFromGroups:`,
          value
        );
      }
    }

    // Strategy 2: Try multiple label variations in raw text (direct search)
    if (!value || value === "Not detected") {
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Trying direct extraction from raw text`
      );

      const labelVariations = [
        card.label, // "Image Type"
        card.label.replace(/ & /g, " "), // "Layout Structure" (remove &)
        card.label.replace(/ & /g, " and "), // "Layout and Structure"
        ...card.extractors.flat().map((e) => {
          // Capitalize first letter of each word
          return e
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }),
      ];

      // Remove duplicates
      const uniqueLabels = [...new Set(labelVariations)];

      for (const label of uniqueLabels) {
        // More precise regex - stop at next field (capitalized word + colon) or section
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Try pattern: "Label: value" at start of line
        let regex = new RegExp(
          `^${escapedLabel}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
          "im"
        );
        let match = rawText.match(regex);

        // If no match, try anywhere in text (but still stop at next field)
        if (!match) {
          regex = new RegExp(
            `${escapedLabel}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
            "i"
          );
          match = rawText.match(regex);
        }

        if (match?.[1]) {
          const extracted = match[1].trim();
          // Clean up - remove any trailing field names that might have been captured
          const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
          if (
            cleaned &&
            cleaned.length > 0 &&
            !cleaned.toLowerCase().includes("section:") &&
            cleaned.length < 200 // Reasonable value length limit
          ) {
            const normalizedValue = normalizeText(cleaned);
            // Validate that this value makes sense for this field
            if (isValidValueForField(card.id, normalizedValue)) {
              value = normalizedValue;
              console.log(
                `[ImageGeneralAnalysis] ${card.label} - Found with label "${label}" in raw text:`,
                value
              );
              break;
            } else {
              console.log(
                `[ImageGeneralAnalysis] ${card.label} - Rejected invalid value in raw text: "${normalizedValue}" for field ${card.id}`
              );
            }
          }
        }
      }
    }

    // Strategy 3: Search in Key Attributes section specifically
    if ((!value || value === "Not detected") && keyAttributesSection) {
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Searching in Key Attributes section`
      );
      const sectionText = keyAttributesSection.text || "";
      const sectionItems = keyAttributesSection.items || [];

      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Key Attributes items:`,
        sectionItems
      );
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - Key Attributes text:`,
        sectionText
      );

      // Check items first - look for exact label match
      // Backend returns: "Image Type", "Main Subject", "Dominant Colors", "Layout Structure", "Overall Mood", "Lighting"
      for (const item of sectionItems) {
        if (typeof item === "string") continue;
        const itemKey = (item.key || item.label || item.name || "").trim();
        const itemValue = item.value || item.text || item.description;

        if (!itemKey || !itemValue) continue;

        console.log(`[ImageGeneralAnalysis] ${card.label} - Checking item:`, {
          itemKey,
          itemValue,
        });

        // Normalize both for comparison (case-insensitive, remove &, normalize spaces)
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

        // Try exact match first (most reliable)
        if (itemKeyNormalized === cardLabelNormalized) {
          value = normalizeText(itemValue);
          console.log(
            `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes items (exact match):`,
            value
          );
          break;
        }

        // Try word-by-word match (e.g., "Layout Structure" matches "Layout & Structure")
        const cardWords = cardLabelNormalized
          .split(/\s+/)
          .filter((w) => w.length > 2);
        const itemWords = itemKeyNormalized
          .split(/\s+/)
          .filter((w) => w.length > 2);

        // Check if all significant words from card label are in item key
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

        // Also check reverse (all item words in card label)
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
          console.log(
            `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes items (word match):`,
            value
          );
          break;
        }

        // Try extractor keywords - but be more precise
        for (const extractor of card.extractors.flat()) {
          const extractorLower = extractor.toLowerCase().trim();
          if (extractorLower.length < 3) continue;

          // Exact match or significant substring match
          if (
            itemKeyNormalized === extractorLower ||
            (itemKeyNormalized.includes(extractorLower) &&
              extractorLower.length > 4) ||
            (extractorLower.includes(itemKeyNormalized) &&
              itemKeyNormalized.length > 4)
          ) {
            value = normalizeText(itemValue);
            console.log(
              `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes items (extractor "${extractor}" match):`,
              value
            );
            break;
          }
        }
        if (value && value !== "Not detected") break;
      }

      // Check section text - try exact label match
      if (!value || value === "Not detected") {
        // Try with the exact card label first
        const cardLabelEscaped = card.label.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        let regex = new RegExp(
          `${cardLabelEscaped}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
          "i"
        );
        let match = sectionText.match(regex);
        console.log(
          `[ImageGeneralAnalysis] ${card.label} - Section text regex match (exact label):`,
          match
        );
        if (match?.[1]) {
          const extracted = match[1].trim();
          // Clean up - remove any trailing field names
          const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
          if (cleaned && cleaned.length > 0) {
            value = normalizeText(cleaned);
            console.log(
              `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes text (exact label):`,
              value
            );
          }
        }

        // Try without "&" in label (e.g., "Layout Structure" instead of "Layout & Structure")
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
          console.log(
            `[ImageGeneralAnalysis] ${card.label} - Section text regex match (without &):`,
            match
          );
          if (match?.[1]) {
            const extracted = match[1].trim();
            const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
            if (cleaned && cleaned.length > 0) {
              value = normalizeText(cleaned);
              console.log(
                `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes text (without &):`,
                value
              );
            }
          }
        }

        // Fallback to extractor keywords in section text
        if (!value || value === "Not detected") {
          for (const extractor of card.extractors.flat()) {
            // Only use longer extractors to avoid false matches
            if (extractor.length < 3) continue;

            const regex = new RegExp(
              `${extractor}\\s*[:]\\s*([^\\n:]+?)(?=\\s*[A-Z][a-z]+\\s*:|\\s*SECTION:|$)`,
              "i"
            );
            const match = sectionText.match(regex);
            if (match?.[1]) {
              const extracted = match[1].trim();
              // Clean up - remove any trailing field names
              const cleaned = extracted.split(/\s+[A-Z][a-z]+\s*:/)[0].trim();
              if (cleaned && cleaned.length > 0) {
                value = normalizeText(cleaned);
                console.log(
                  `[ImageGeneralAnalysis] ${card.label} - Found in Key Attributes text (extractor "${extractor}"):`,
                  value
                );
                break;
              }
            }
          }
        }
      }
    }

    // Strategy 4: Fallback to section text
    if (!value || value === "Not detected") {
      value = getSectionText(matchSection(card.extractors.flat()));
      if (value) value = normalizeText(value);
      console.log(
        `[ImageGeneralAnalysis] ${card.label} - From section text:`,
        value
      );
    }

    const result = {
      id: card.id,
      label: card.label,
      value: value || "Not detected",
      detail: card.detail,
      icon: card.icon,
    };
    console.log(`[ImageGeneralAnalysis] ${card.label} - Final result:`, result);
    return result;
  });

  const hasContent =
    summaryText ||
    keyAttributes.some((card) => card.value && card.value !== "Not detected");

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

      {!hasContent && rawText.trim() && (
        <div className={styles.summaryCard}>
          <h4>AI Notes</h4>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageGeneralAnalysis;
