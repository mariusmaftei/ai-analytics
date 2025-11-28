import React, { useMemo } from "react";
import styles from "./ImageDocumentAnalysis.module.css";

const parseJsonFromRaw = (rawText = "") => {
  if (!rawText || typeof rawText !== "string") return null;
  const trimmed = rawText.trim();
  const looksLikeJson =
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("```");
  if (!looksLikeJson) {
    return null;
  }
  try {
    let jsonText = trimmed;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/```json?/gi, "")
        .replace(/```/g, "")
        .trim();
    }
    return JSON.parse(jsonText);
  } catch (err) {
    return null;
  }
};

const normalizeItems = (section) =>
  section?.items?.map((item, idx) => ({
    id: item.id || `${section.name}-${idx}`,
    label: item.label || item.key || null,
    value: item.value || item.text || item.description || "",
  })) || [];

const extractValue = (section, keywords = [], fallback = "") => {
  if (!section) return fallback;
  const normalized = normalizeItems(section);
  const match =
    normalized.find((item) => {
      const label = (item.label || "").toLowerCase();
      return keywords.some((keyword) => label.includes(keyword));
    }) || normalized[0];
  return match?.value || section.text || fallback;
};

const parseKeyFields = (section) => {
  if (!section) return [];
  const rows = normalizeItems(section).filter(
    (item) => item.value.trim().length
  );

  if (rows.length) return rows;

  return (
    section.text
      ?.split("\n")
      .map((line, idx) => {
        const [label, ...rest] = line.split(/[:\-–]/);
        if (!rest.length) return null;
        return {
          id: `${section.name}-text-${idx}`,
          label: label.trim(),
          value: rest.join(":").trim(),
        };
      })
      .filter(Boolean) || []
  );
};

const parseList = (section) => {
  if (!section) return [];
  const items = normalizeItems(section).filter(
    (item) => item.value.trim().length
  );

  if (items.length) return items;

  return (
    section.text
      ?.split("\n")
      .map((line, idx) => ({
        id: `${section.name}-line-${idx}`,
        value: line.replace(/^[-•]\s*/, "").trim(),
      }))
      .filter((line) => line.value.length) || []
  );
};

const ImageDocumentAnalysis = ({ data = {}, rawText = "" }) => {
  const structuredJson = useMemo(() => parseJsonFromRaw(rawText), [rawText]);
  const sections = data?.sections || [];

  const findSection = (keywords = []) =>
    sections.find((section) => {
      const name = section?.name?.toLowerCase() || "";
      return keywords.some((keyword) => name.includes(keyword));
    });

  const summarySection = findSection(["summary", "overview", "context"]);
  const metadataSection = findSection(["metadata", "document info", "details"]);
  const structureSection = findSection(["structure", "layout", "sections"]);
  const fieldsSection = findSection(["field", "key value", "extracted"]);
  const qualitySection = findSection([
    "completeness",
    "quality",
    "readability",
  ]);
  const recommendationSection = findSection([
    "recommendation",
    "cleanup",
    "next step",
  ]);
  const notesSection = findSection(["notes", "comments", "additional"]);

  const summaryText =
    structuredJson?.summary ||
    summarySection?.text ||
    extractValue(summarySection, ["summary"], "") ||
    "The model has not provided a document summary for this image.";

  const metadataEntries = structuredJson?.metadata
    ? Object.entries(structuredJson.metadata).map(([label, value]) => ({
        id: `metadata-${label}`,
        label,
        value,
      }))
    : [];

  const documentMetrics = [
    {
      label: "Document Type",
      value:
        structuredJson?.metadata?.["Document Type"] ||
        structuredJson?.metadata?.documentType ||
        extractValue(metadataSection, ["document type", "type"]) ||
        extractValue(structureSection, ["document type"]),
    },
    {
      label: "Pages",
      value:
        structuredJson?.metadata?.Pages ||
        structuredJson?.metadata?.pages ||
        extractValue(metadataSection, ["page count", "pages"]) ||
        extractValue(summarySection, ["pages"]),
    },
    {
      label: "Language",
      value:
        structuredJson?.metadata?.Language ||
        structuredJson?.metadata?.language ||
        extractValue(metadataSection, ["language"]) ||
        extractValue(summarySection, ["language"]),
    },
    {
      label: "Confidence",
      value:
        structuredJson?.metadata?.Confidence ||
        structuredJson?.metadata?.confidence ||
        extractValue(qualitySection, ["confidence"]) ||
        extractValue(qualitySection, ["score"]),
    },
  ].filter(
    (metric) =>
      metric.value &&
      metric.value !== summaryText &&
      metric.value.toString().trim().length
  );

  const keyFields = useMemo(() => {
    if (structuredJson?.fields?.length) {
      return structuredJson.fields.map((field, idx) => ({
        id: `structured-field-${idx}`,
        label: field.label || field.key || `Field ${idx + 1}`,
        value: field.value || field.text || "",
      }));
    }
    return parseKeyFields(fieldsSection);
  }, [structuredJson, fieldsSection]);

  const structureItems = useMemo(() => {
    if (structuredJson?.structure?.length) {
      return structuredJson.structure.map((line, idx) => ({
        id: `structured-structure-${idx}`,
        value: line,
      }));
    }
    return parseList(structureSection);
  }, [structuredJson, structureSection]);

  const qualityItems = useMemo(() => {
    if (structuredJson?.quality?.length) {
      return structuredJson.quality.map((line, idx) => ({
        id: `structured-quality-${idx}`,
        label: null,
        value: line,
      }));
    }
    return parseList(qualitySection);
  }, [structuredJson, qualitySection]);

  const recommendationItems = useMemo(() => {
    if (structuredJson?.recommendations?.length) {
      return structuredJson.recommendations.map((line, idx) => ({
        id: `structured-rec-${idx}`,
        value: line,
      }));
    }
    return parseList(recommendationSection);
  }, [structuredJson, recommendationSection]);

  const additionalNotes = structuredJson?.notes?.length
    ? structuredJson.notes.join("\n")
    : notesSection?.text || "";

  const hasStructured =
    summaryText ||
    keyFields.length ||
    structureItems.length ||
    qualityItems.length ||
    recommendationItems.length ||
    documentMetrics.length;

  if (!hasStructured && !rawText.trim()) {
    return (
      <div className={styles.emptyState}>
        No document analysis available yet.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Document Intelligence</p>
          <h3>Document Analysis</h3>
        </div>
        <p>Structure, extracted fields, and quality checks</p>
      </header>

      <section className={styles.summaryBanner}>
        <div className={styles.summaryTextBlock}>
          <span>Document Summary</span>
          <p>{summaryText}</p>
        </div>
        {documentMetrics.length > 0 && (
          <div className={styles.metricsGrid}>
            {documentMetrics.map((metric) => (
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
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Key Fields</h4>
              <span>Recognized form fields and values</span>
            </div>
            {keyFields.length ? (
              <div className={styles.tableWrapper}>
                <table>
                  <tbody>
                    {keyFields.map((field) => (
                      <tr key={field.id}>
                        <td>{field.label || "Field"}</td>
                        <td>{field.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.placeholderText}>
                The model did not extract explicit field/value pairs.
              </p>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Structure Overview</h4>
              <span>Sections, hierarchy, and layout cues</span>
            </div>
            {structureItems.length ? (
              <ul className={styles.list}>
                {structureItems.map((item) => (
                  <li key={item.id}>{item.value}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholderText}>
                Layout details were not provided for this document.
              </p>
            )}
          </div>
        </div>

        <div className={styles.secondaryColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Quality & Completeness</h4>
              <span>Legibility, capture issues, and confidence</span>
            </div>
            {qualityItems.length ? (
              <ul className={styles.list}>
                {qualityItems.map((item) => (
                  <li key={item.id}>{item.value}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholderText}>
                No quality or completeness notes were reported.
              </p>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h4>Next Steps</h4>
              <span>Recommendations and follow-up actions</span>
            </div>
            {recommendationItems.length ? (
              <ul className={styles.list}>
                {recommendationItems.map((item) => (
                  <li key={item.id}>{item.value}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholderText}>
                The model did not provide follow-up guidance.
              </p>
            )}
          </div>
        </div>
      </section>

      {(notesSection || additionalNotes) && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h4>{notesSection?.name || "Additional Notes"}</h4>
            <span>Additional context</span>
          </div>
          <p className={styles.sectionText}>
            {additionalNotes || notesSection?.text}
          </p>
        </section>
      )}

      {!hasStructured && rawText.trim() && (
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

export default ImageDocumentAnalysis;
