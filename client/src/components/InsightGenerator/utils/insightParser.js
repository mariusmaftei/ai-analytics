export const extractDocumentDescription = (text) => {
  if (!text) return null;

  const cleanedText = text
    .replace(
      /^(okay|ok|alright|well|so|now|here|let me|i've|i have|i'll|i will)[^.!?]*[.!?]\s*/i,
      ""
    )
    .replace(
      /^(i've analyzed|i have analyzed|here are|here's|this is|these are)[^.!?]*[.!?]\s*/i,
      ""
    )
    .replace(/formatted as requested[^.!?]*[.!?]\s*/i, "")
    .replace(/and here are the insights[^.!?]*[.!?]\s*/i, "")
    .replace(/:\s*/g, ". ")
    .trim();

  const descriptionPatterns = [
    /(?:this\s+document\s+is\s+(?:a\s+|an\s+)?)([^.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^.]{0,80})/i,
    /(?:this\s+is\s+(?:a\s+|an\s+)?)([^.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^.]{0,80})/i,
    /(?:a\s+|an\s+)([^.]+(?:catalog|list|manual|report|guide|document|specification|handbook|directory|price\s+list|product\s+catalog)[^.]{0,80})/i,
    /([^.]*(?:price\s+list|product\s+catalog|product\s+list)[^.]{0,100})/i,
    /([^.]*(?:focused\s+on|about|containing|including|for)[^.]{0,100}(?:catalog|list|manual|report|guide|document|components|products|supplies|tools|equipment)[^.]{0,50})/i,
  ];

  for (const pattern of descriptionPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let description = match[1] || match[0];

      description = description
        .replace(
          /^(this\s+document\s+is\s+(?:a\s+|an\s+)?|this\s+is\s+(?:a\s+|an\s+)?)/i,
          "This document is a "
        )
        .replace(/^(a\s+|an\s+)/i, "This document is a ")
        .replace(/^([a-z])/, (match) => match.toUpperCase())
        .trim();

      if (!description.toLowerCase().startsWith("this document")) {
        if (
          description.match(/^[A-Z]/) &&
          !description.match(/^(Price|Product|A|An)/)
        ) {
          description = "This document is a " + description.toLowerCase();
        } else if (description.match(/^(Price|Product)/)) {
          description = "This document is a " + description.toLowerCase();
        }
      }

      description = description
        .replace(/\s+/g, " ")
        .replace(/[,;:]+$/, "")
        .replace(/\.+$/, "")
        .trim();

      if (description.length > 150) {
        const cutPoint = description.substring(0, 147).lastIndexOf(" ");
        if (cutPoint > 100) {
          description = description.substring(0, cutPoint) + "...";
        } else {
          description = description.substring(0, 147) + "...";
        }
      }

      if (description.length > 20) {
        return description;
      }
    }
  }

  const sentences = cleanedText.split(/[.!?]\s+/);
  for (const sentence of sentences) {
    if (sentence.length > 30 && sentence.length < 200) {
      const lowerSentence = sentence.toLowerCase();
      if (
        lowerSentence.includes("catalog") ||
        lowerSentence.includes("list") ||
        lowerSentence.includes("manual") ||
        lowerSentence.includes("document") ||
        lowerSentence.includes("focused") ||
        lowerSentence.includes("about") ||
        lowerSentence.includes("product") ||
        lowerSentence.includes("price")
      ) {
        let cleanSentence = sentence.trim();
        if (!cleanSentence.toLowerCase().startsWith("this document")) {
          if (cleanSentence.match(/^[a-z]/)) {
            cleanSentence = "This document is a " + cleanSentence.toLowerCase();
          } else if (!cleanSentence.match(/^This/)) {
            cleanSentence = "This document is a " + cleanSentence.toLowerCase();
          }
        }
        return cleanSentence;
      }
    }
  }

  return null;
};

export const extractMetrics = (text) => {
  const metrics = {};

  // More specific author matching - only match if it's clearly in a document context
  // Avoid matching CSV column names or data values
  const authorMatch = text.match(
    /(?:^|\n)\s*(?:author|by|created by|written by)[:\s|]+\s*([A-Z][^\n|,.]{2,50})(?:\s*\||\s*$)/i
  );
  if (authorMatch) {
    const author = authorMatch[1].trim();
    // Filter out common CSV column names and data values
    const invalidAuthors = ['region', 'customer', 'product', 'date', 'transaction', 'revenue', 'quantity', 'price'];
    if (!invalidAuthors.some(invalid => author.toLowerCase().includes(invalid))) {
      metrics.author = author;
    }
  }

  const pagesMatch = text.match(/(\d+)\s*(?:pages?|page)/i);
  if (pagesMatch) {
    metrics.pages = pagesMatch[1];
  }

  const wordsMatch = text.match(/(\d+(?:,\d+)?)\s*(?:words?|word)/i);
  if (wordsMatch) {
    metrics.words = wordsMatch[1].replace(/,/g, "");
  }

  const skuMatch = text.match(/(\d+(?:,\d+)?)\s*(?:skus?|sku)/i);
  if (skuMatch) {
    metrics.skus = skuMatch[1].replace(/,/g, "");
  }

  return metrics;
};

export const parseInsights = (text) => {
  if (!text) return { categories: [], metrics: {}, description: null };

  const metrics = extractMetrics(text);
  const description = extractDocumentDescription(text);
  const categories = [];
  
  // Normalize the text - ensure section headers are on their own lines
  // Fix cases where **Section:** is immediately followed by content without newline
  let normalizedText = text;
  
  // Step 1: Ensure section headers are on their own lines
  normalizedText = normalizedText.replace(/\*\*([^*]+):\*\*/g, '\n**$1:**\n');
  
  // Step 2: Split concatenated key-value pairs
  // Pattern: "Value" (ending with lowercase/number) followed by "Key" (starting with capital) -> add newline
  // Example: "ValueFile Type" -> "Value\nFile Type"
  // Example: "CSVPurpose" -> "CSV\nPurpose"
  normalizedText = normalizedText.replace(/([a-z0-9%.,\s]+)([A-Z][a-z]+\s*\|)/g, '$1\n$2');
  
  // Step 3: Handle "Key | Value" immediately after section header (no newline)
  normalizedText = normalizedText.replace(/\*\*([^*]+):\*\*\s*Key\s*\|\s*Value/gi, '**$1:**\nKey | Value');
  
  // Step 4: Ensure pipes have spaces around them for consistent parsing
  normalizedText = normalizedText.replace(/([^\s])\|([^\s\n])/g, '$1 | $2');
  
  // Step 5: Normalize multiple newlines
  normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n').trim();
  
  // Debug: Log normalized text for troubleshooting
  console.log("[Parser] Original text length:", text.length);
  console.log("[Parser] Normalized text length:", normalizedText.length);
  console.log("[Parser] Normalized text preview (first 800 chars):", normalizedText.substring(0, 800));
  
  const lines = normalizedText.split("\n");

  let currentCategory = null;
  let currentKeyValuePairs = [];
  let currentSummary = null;

  lines.forEach((line) => {
    const trimmed = line.trim();

    const categoryMatch = trimmed.match(/^\*\*([^*]+):\*\*/);
    if (categoryMatch) {
      if (currentCategory) {
        categories.push({
          category: currentCategory,
          keyValuePairs: currentKeyValuePairs,
          summary: currentSummary || "",
        });
      }

      currentCategory = categoryMatch[1].trim();
      currentKeyValuePairs = [];
      currentSummary = null;
    } else if (trimmed.match(/\|/) && !trimmed.match(/^[-•*]/)) {
      const parts = trimmed.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        let key = parts[0]
          .replace(/^[-•*]\s*/, "")
          .replace(/^\*\*|\*\*$/g, "")
          .trim();
        let value = parts[1]
          .replace(/^[-•*]\s*/, "")
          .replace(/^\*\*|\*\*$/g, "")
          .replace(/^["']|["']$/g, "")
          .trim();
        let description =
          parts.length >= 3
            ? parts[2]
                .replace(/^[-•*]\s*/, "")
                .replace(/^\*\*|\*\*$/g, "")
                .replace(/^["']|["']$/g, "")
                .trim()
            : "";

        // Skip header rows but allow "Key | Value" for Document Overview
        // Also skip if it's clearly a table header row
        const isHeaderRow = 
          (key.toLowerCase() === "key" && value.toLowerCase() === "value") ||
          (key.toLowerCase() === "region" && value.toLowerCase().includes("transaction")) ||
          (key.toLowerCase() === "region" && value.toLowerCase().includes("total revenue")) ||
          (key.toLowerCase() === "region" && value.toLowerCase().includes("avg revenue"));

        if (
          key &&
          value &&
          !key.match(/^[-•*]/) &&
          !key.match(/^[|]/) &&
          !isHeaderRow
        ) {
          // For Regional Insights, store all parts as description
          if (
            currentCategory &&
            currentCategory.toLowerCase().includes("regional insights")
          ) {
            currentKeyValuePairs.push({
              key: key,
              value: value,
              description: parts.slice(2).join(" | ") || description,
            });
          } else {
            currentKeyValuePairs.push({
              key: key,
              value: value,
              description: description,
            });
          }
        }
      }
    } else if (trimmed.match(/^summary\s*:\s*/i)) {
      currentSummary = trimmed.replace(/^summary\s*:\s*/i, "").trim();
    } else if (trimmed.match(/^(key_findings|recommended_actions)\s*\|\s*/i)) {
      const match = trimmed.match(
        /^(key_findings|recommended_actions)\s*\|\s*(.+)/i
      );
      if (match) {
        const key = match[1];
        let valueStr = match[2].trim();
        valueStr = valueStr
          .replace(/^\*\*|\*\*$/g, "")
          .replace(/^["']|["']$/g, "");

        let value = valueStr;
        if (valueStr.includes("[") && valueStr.includes("]")) {
          const arrayMatch = valueStr.match(/\[(.*?)\]/);
          if (arrayMatch) {
            value = arrayMatch[1]
              .split(",")
              .map((v) =>
                v
                  .trim()
                  .replace(/^["']|["']$/g, "")
                  .replace(/^[-•*]\s*/, "")
                  .replace(/^\*\*|\*\*$/g, "")
                  .trim()
              )
              .filter((v) => v.length > 0);
          }
        } else if (valueStr.includes(",")) {
          value = valueStr
            .split(",")
            .map((v) =>
              v
                .trim()
                .replace(/^["']|["']$/g, "")
                .replace(/^[-•*]\s*/, "")
                .replace(/^\*\*|\*\*$/g, "")
                .trim()
            )
            .filter((v) => v.length > 0);
        } else {
          value = valueStr
            .replace(/^[-•*]\s*/, "")
            .replace(/^\*\*|\*\*$/g, "")
            .trim();
        }

        currentKeyValuePairs.push({
          key: key,
          value: Array.isArray(value) ? value : [value],
          description: "",
        });
      }
    } else if (trimmed.match(/^([a-z_]+)\s*:\s*(.+)$/i)) {
      const match = trimmed.match(/^([a-z_]+)\s*:\s*(.+)$/i);
      if (match && currentCategory) {
        let key = match[1]
          .replace(/^[-•*]\s*/, "")
          .replace(/^\*\*|\*\*$/g, "")
          .trim();
        let value = match[2]
          .replace(/^[-•*]\s*/, "")
          .replace(/^\*\*|\*\*$/g, "")
          .replace(/^["']|["']$/g, "")
          .trim();

        if (key && value && !key.match(/^[-•*]/)) {
          currentKeyValuePairs.push({
            key: key,
            value: value,
            description: "",
          });
        }
      }
    } else if (trimmed.match(/^\d+\.\s+[A-Z]/)) {
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch && currentCategory) {
        currentKeyValuePairs.push({
          key: `numbered_section_${numberedMatch[1]}`,
          value: numberedMatch[2],
          description: "numbered_section",
        });
      }
    } else if (trimmed.match(/^[-•*]\s+/)) {
      const bulletText = trimmed.replace(/^[-•*]\s+/, "").trim();
      if (bulletText && currentCategory) {
        // For "Patterns & Trends" section, store as bullet points
        if (currentCategory.toLowerCase().includes("patterns") || 
            currentCategory.toLowerCase().includes("trends")) {
          currentKeyValuePairs.push({
            key: "bullet_point",
            value: bulletText,
            description: "bullet",
          });
        } else {
          // For other sections, also store as bullet points
          currentKeyValuePairs.push({
            key: "bullet_point",
            value: bulletText,
            description: "bullet",
          });
        }
      }
    } else if (trimmed.match(/^[✅❌⚙️]/)) {
      const checkmarkText = trimmed.replace(/^[✅❌⚙️]\s*/, "").trim();
      if (checkmarkText && currentCategory) {
        const icon = trimmed.match(/^([✅❌⚙️])/)?.[1] || "";
        currentKeyValuePairs.push({
          key: "checkmark_item",
          value: checkmarkText,
          description: icon,
        });
      }
    } else if (
      trimmed.match(/^["']/) &&
      currentCategory &&
      currentCategory.toLowerCase().includes("summary")
    ) {
      const quotedText = trimmed.replace(/^["']|["']$/g, "").trim();
      if (quotedText) {
        currentSummary = quotedText;
      }
    } else if (
      currentCategory &&
      currentCategory.toLowerCase().includes("summary") &&
      trimmed.length > 20 &&
      !trimmed.match(/^\*\*/) &&
      !trimmed.match(/^["']/) &&
      !currentSummary
    ) {
      // For AI Summary, capture quoted text even if it spans multiple lines
      if (trimmed.match(/["']/)) {
        const quotedMatch = trimmed.match(/["']([^"']+)["']/);
        if (quotedMatch) {
          currentSummary = quotedMatch[1];
        } else {
          currentSummary = trimmed;
        }
      } else {
        currentSummary = trimmed;
      }
    } else if (
      currentCategory &&
      currentKeyValuePairs.length === 0 &&
      trimmed.length > 50 &&
      !trimmed.match(/^\*\*/) &&
      !trimmed.match(/^[-•*]/) &&
      !trimmed.match(/^[✅❌⚙️]/)
    ) {
      if (
        !trimmed.match(/\|/) &&
        !trimmed.match(/^[a-z_]+\s*:/i) &&
        !trimmed.match(/^\d+\./)
      ) {
        currentSummary =
          trimmed.length > 500 ? trimmed.substring(0, 497) + "..." : trimmed;
      }
    }
  });

  // Save last category
  if (currentCategory) {
    categories.push({
      category: currentCategory,
      keyValuePairs: currentKeyValuePairs,
      summary: currentSummary || "",
    });
  }
  
  // Debug: Log parsing results
  const categoryNames = categories.map(c => c.category.toLowerCase());
  const hasDocumentOverview = categoryNames.some(n => n.includes("document overview"));
  const hasKeyInsights = categoryNames.some(n => n.includes("key insights"));
  const hasRegionalInsights = categoryNames.some(n => n.includes("regional insights"));
  const hasDataQuality = categoryNames.some(n => n.includes("data quality"));
  const hasPatternsTrends = categoryNames.some(n => n.includes("patterns") || n.includes("trends"));
  const hasAISummary = categoryNames.some(n => n.includes("ai summary") || n.includes("summary"));
  
  console.log("Parsing Debug:", {
    totalCategories: categories.length,
    hasDocumentOverview,
    hasKeyInsights,
    hasRegionalInsights,
    hasDataQuality,
    hasPatternsTrends,
    hasAISummary,
    categories: categories.map(c => ({
      name: c.category,
      pairs: c.keyValuePairs?.length || 0,
      hasSummary: !!c.summary
    })),
    textLength: text.length,
    textPreview: text.substring(0, 500)
  });

  if (categories.length === 0) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 50);
    if (paragraphs.length > 0) {
      const mainParagraph = paragraphs
        .filter((p) => !p.match(/^\*\*/) && !p.match(/^Summary:/i))
        .sort((a, b) => b.length - a.length)[0];

      if (mainParagraph && mainParagraph.length > 100) {
        categories.push({
          category: "Key Insights",
          keyValuePairs: [],
          summary: mainParagraph.trim(),
        });
      }
    }
  }

  return { categories, metrics, description };
};
