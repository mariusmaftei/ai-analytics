import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import styles from "./ImageTextExtraction.module.css";

const ImageTextExtraction = ({
  data = {},
  rawText = "",
  contextMeta = null,
}) => {
  const [copied, setCopied] = useState(false);
  const sections = data?.sections || [];

  const toText = (value) => {
    if (value === null || value === undefined) return "";
    return typeof value === "string" ? value : String(value);
  };

  const trimText = (value) => toText(value).trim();

  const textBlocks = sections.filter(
    (section) =>
      section?.name?.toLowerCase().includes("text") ||
      section?.name?.toLowerCase().includes("ocr")
  );

  const getSectionText = (section) => {
    if (!section) return "";
    if (section.text) return trimText(section.text);
    if (section.items?.length) {
      return section.items
        .map((item) => {
          if (typeof item === "string") return trimText(item);
          return trimText(item.value || item.text || item.description || "");
        })
        .filter((value) => value.length > 0)
        .join("\n");
    }
    if (section.lines?.length) {
      return section.lines
        .map((line) => trimText(line))
        .filter((line) => line.length > 0)
        .join("\n");
    }
    return "";
  };

  const extractStructuredItems = () => {
    const items = [];

    sections.forEach((section) => {
      if (section.items?.length) {
        section.items.forEach((item) => {
          if (typeof item === "string") {
            const cleaned = trimText(item);
            if (cleaned) items.push(cleaned);
          } else if (item.value || item.text || item.description) {
            const cleaned = trimText(
              item.value || item.text || item.description
            );
            if (cleaned) items.push(cleaned);
          }
        });
      }
      if (section.lines?.length) {
        section.lines.forEach((line) => {
          const cleaned = trimText(line);
          if (cleaned) items.push(cleaned);
        });
      }
    });

    if (rawText && items.length === 0) {
      const lines = rawText
        .split("\n")
        .map((line) => trimText(line))
        .filter((line) => line.length > 0 && !line.match(/^\d+:\d+$/));
      if (lines.length > 1) {
        return lines;
      }
    }

    return items.filter((item) => item && item.length > 0);
  };

  const rawTextContent = trimText(
    rawText || textBlocks.map(getSectionText).join("\n\n")
  );
  const structuredItems = extractStructuredItems();
  const hasStructured =
    structuredItems.length > 0 && structuredItems.length < 50;

  const completeRawText = rawText?.trim() || "";

  const textLines = completeRawText
    ? completeRawText
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
    : rawTextContent
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);

  const metadataKeywords = [
    "text location",
    "text is located",
    "text located",
    "handwritten text",
    "font",
    "typeface",
    "numbers",
    "dates",
    "codes",
    "alignment",
    "position",
  ];

  const { pureTextLines, metadataLines } = textLines.reduce(
    (acc, line) => {
      const lower = line.toLowerCase();
      if (metadataKeywords.some((keyword) => lower.includes(keyword))) {
        acc.metadataLines.push(line);
      } else {
        acc.pureTextLines.push(line);
      }
      return acc;
    },
    { pureTextLines: [], metadataLines: [] }
  );

  const primaryTextLines = pureTextLines.length > 0 ? pureTextLines : textLines;

  const displayRawText = completeRawText || primaryTextLines.join("\n").trim();

  const wordCount = displayRawText
    ? displayRawText.split(/\s+/).filter(Boolean).length
    : 0;
  const summaryStats = [
    { label: "Detected lines", value: primaryTextLines.length || "—" },
    { label: "Words", value: wordCount || "—" },
    {
      label: "Text sections",
      value: textBlocks.length || sections.length || "—",
    },
  ];

  const normalizeConfidence = (value) => {
    if (value === null || value === undefined) return null;
    let numeric = value;
    if (typeof numeric === "string") {
      const match = numeric.match(/(\d+(\.\d+)?)/);
      numeric = match ? parseFloat(match[1]) : NaN;
    }
    if (typeof numeric !== "number" || Number.isNaN(numeric)) return null;
    if (numeric > 1) numeric = numeric / 100;
    return Math.max(0, Math.min(numeric, 1));
  };

  const deriveConfidenceScore = () => {
    const candidates = [
      data?.confidence,
      data?.confidenceScore,
      data?.confidence_score,
      data?.metrics?.confidence,
      sections.find((section) =>
        section?.name?.toLowerCase().includes("confidence")
      )?.text,
      rawText.match(/confidence(?: score)?[:\s-]+([\d.]+%?)/i)?.[1],
    ];

    for (const candidate of candidates) {
      const normalized = normalizeConfidence(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }
    return null;
  };

  const confidenceScore = deriveConfidenceScore();
  const confidencePercent =
    confidenceScore !== null ? Math.round(confidenceScore * 100) : null;

  const textRegions =
    (Array.isArray(data?.textRegions) && data.textRegions) ||
    (Array.isArray(data?.regions) && data.regions) ||
    [];

  const summaryMessage = primaryTextLines.length
    ? `${
        primaryTextLines.length === 1
          ? "Single text line detected"
          : `${primaryTextLines.length} text lines captured`
      }${wordCount ? ` • ${wordCount} words total` : ""}`
    : "Waiting for OCR output. Upload an image or re-run analysis.";

  const summaryMeta = (() => {
    const details = [];
    if (confidencePercent !== null) {
      details.push(
        confidencePercent >= 80
          ? "Confidence looks strong"
          : "Confidence lower—verify key values"
      );
    }
    if (textRegions.length) {
      details.push(
        `${textRegions.length} localized region${
          textRegions.length === 1 ? "" : "s"
        }`
      );
    }
    return details.join(" • ");
  })();

  const cleanedSource =
    hasStructured && structuredItems.length
      ? structuredItems
      : completeRawText
      ? completeRawText.split("\n").filter((line) => line.trim().length > 0)
      : primaryTextLines.length
      ? primaryTextLines
      : [displayRawText || rawTextContent];

  const sectionContextLines = sections
    .flatMap((section) => {
      const content = [];
      if (section?.text) content.push(section.text);
      if (Array.isArray(section?.items)) {
        section.items.forEach((item) => {
          if (typeof item === "string") {
            content.push(item);
          } else if (item) {
            content.push(item.value, item.text, item.description);
          }
        });
      }
      if (Array.isArray(section?.lines)) {
        content.push(...section.lines);
      }
      return content;
    })
    .map((value) => trimText(value))
    .filter(Boolean);

  const contextLines = [
    ...metadataLines,
    ...sectionContextLines,
    ...primaryTextLines,
  ];

  const extractContextDetail = (lines, patterns) => {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (patterns.some((pattern) => pattern.test(lower))) {
        return line;
      }
    }
    return null;
  };

  const positionDetail =
    contextMeta?.position ||
    extractContextDetail(contextLines, [
      /position/,
      /located/,
      /alignment/,
      /center/,
      /middle/,
      /left/,
      /right/,
      /top/,
      /bottom/,
    ]) ||
    (textRegions.length
      ? `${textRegions.length} detected region${
          textRegions.length === 1 ? "" : "s"
        }`
      : null);

  const fontDetail =
    contextMeta?.font_style ||
    extractContextDetail(contextLines, [
      /font/,
      /typeface/,
      /handwritten/,
      /serif/,
      /sans/,
      /bold/,
      /italic/,
      /uppercase/,
      /lowercase/,
      /script/,
    ]);

  const sourceDetail =
    contextMeta?.source_surface ||
    extractContextDetail(contextLines, [
      /paper/,
      /cardboard/,
      /document/,
      /screen/,
      /monitor/,
      /phone/,
      /laptop/,
      /label/,
      /sign/,
      /sticker/,
      /package/,
      /box/,
      /poster/,
      /banner/,
      /menu/,
      /receipt/,
      /whiteboard/,
      /chalkboard/,
      /wall/,
      /door/,
      /pavement/,
      /floor/,
      /ground/,
    ]);

  const clarityDetail =
    contextMeta?.text_clarity ||
    extractContextDetail(contextLines, [
      /clarity/,
      /legible/,
      /readable/,
      /visible/,
      /blurry/,
      /sharp/,
      /contrast/,
      /lighting/,
    ]);

  const contextCards = [
    { label: "Text Position", value: positionDetail },
    { label: "Font & Style", value: fontDetail },
    { label: "Source Surface", value: sourceDetail },
    { label: "Text Clarity", value: clarityDetail },
  ];

  const formatReadable = (value = "") =>
    value
      .replace(/([a-zA-Z])\.([A-Za-z])/g, "$1. $2")
      .replace(/([a-zA-Z]),([A-Za-z])/g, "$1, $2")
      .replace(/\s{2,}/g, " ")
      .trim();

  const seenSegments = new Set();
  const cleanedSegments = cleanedSource.reduce((acc, entry) => {
    let segment =
      typeof entry === "object"
        ? {
            label: entry.key || entry.label || entry.name,
            value: entry.value || entry.text || entry.description || "",
          }
        : { value: entry };

    if (typeof entry === "string") {
      const match = entry.match(/^([^:]{2,80}):\s*(.+)$/);
      if (match) {
        segment = { label: match[1].trim(), value: match[2].trim() };
      }
    }

    const formattedValue = formatReadable(toText(segment.value || ""));
    const formattedLabel = segment.label
      ? formatReadable(toText(segment.label))
      : null;
    const fingerprint = `${formattedLabel || ""}:${formattedValue}`
      .replace(/[^a-z0-9]+/gi, "")
      .toLowerCase();

    if (!formattedValue || seenSegments.has(fingerprint)) {
      return acc;
    }

    seenSegments.add(fingerprint);
    acc.push({
      label: formattedLabel,
      value: formattedValue,
    });
    return acc;
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayRawText || rawTextContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  if (!rawTextContent.trim()) {
    return <div className={styles.emptyState}>No text detected yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.summaryBanner}>
        <div className={styles.summaryText}>
          <p className={styles.summaryTitle}>Text Extraction Overview</p>
          <p className={styles.summaryDescription}>{summaryMessage}</p>
          {summaryMeta && <p className={styles.summaryMeta}>{summaryMeta}</p>}
        </div>
        <div className={styles.summaryStats}>
          {summaryStats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {confidencePercent !== null && (
        <div className={styles.confidenceCard}>
          <div className={styles.confidenceHeader}>
            <span>OCR Confidence</span>
            <span>{confidencePercent}%</span>
          </div>
          <div className={styles.confidenceTrack}>
            <div
              className={styles.confidenceFill}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      )}

      <div className={styles.contentGrid}>
        <section className={`${styles.card} ${styles.rawCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Section A — Raw OCR Output</p>
              <h4>Exact text snapshot</h4>
            </div>
            <button
              className={styles.copyButton}
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              <span>{copied ? "Copied!" : "Copy text"}</span>
            </button>
          </div>
          <div className={styles.rawContent}>
            <pre className={styles.rawTextContent}>
              {completeRawText || rawText || displayRawText || rawTextContent}
            </pre>
          </div>
        </section>

        {metadataLines.length > 0 && (
          <section className={`${styles.card} ${styles.metadataCard}`}>
            <div className={styles.sectionHeaderSimple}>
              <div>
                <p className={styles.sectionLabel}>OCR Notes</p>
                <h4>Detector context</h4>
              </div>
            </div>
            <ul className={styles.metadataList}>
              {metadataLines.map((line, idx) => (
                <li key={`${line}-${idx}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${styles.card} ${styles.cleanedCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>
                Section B — Cleaned / Structured Text
              </p>
              <h4>Formatted for review</h4>
            </div>
            {!hasStructured && (
              <span className={styles.sectionHint}>Auto-cleaned view</span>
            )}
          </div>
          <div className={styles.cleanedContent}>
            {cleanedSegments.map((segment, idx) => (
              <div
                key={`${segment.label || segment.value}-${idx}`}
                className={styles.cleanedItem}
              >
                {segment.label && <strong>{segment.label}</strong>}
                <p>{segment.value || segment.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`${styles.card} ${styles.contextCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>
              Section C — Text Context Insights
            </p>
            <h4>Where and how the text appears</h4>
          </div>
        </div>
        <div className={styles.contextGrid}>
          {contextCards.map((card) => (
            <div key={card.label} className={styles.contextCardItem}>
              <span>{card.label}</span>
              <strong>{card.value || "Not specified"}</strong>
            </div>
          ))}
        </div>
      </section>

      {textRegions.length > 0 && (
        <section className={styles.regionsCard}>
          <div className={styles.sectionHeaderSimple}>
            <div>
              <p className={styles.sectionLabel}>Detected Text Regions</p>
              <h4>Bounding areas supplied by OCR</h4>
            </div>
            <span className={styles.sectionHint}>
              Visual cue for where each block was read
            </span>
          </div>
          <div className={styles.regionsGrid}>
            {textRegions.map((region, idx) => {
              const regionConfidence = normalizeConfidence(
                region?.confidence || region?.score
              );
              return (
                <div key={idx} className={styles.regionCard}>
                  <div className={styles.regionPreview}>
                    {region?.thumbnail ? (
                      <img
                        src={region.thumbnail}
                        alt={region?.label || `Text region ${idx + 1}`}
                      />
                    ) : (
                      <div className={styles.regionPlaceholder}>
                        Region {idx + 1}
                      </div>
                    )}
                    {regionConfidence !== null && (
                      <span className={styles.regionBadge}>
                        {Math.round(regionConfidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={styles.regionMeta}>
                    <strong>{region?.label || `Region ${idx + 1}`}</strong>
                    {region?.text && <p>{trimText(region.text)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ImageTextExtraction;
