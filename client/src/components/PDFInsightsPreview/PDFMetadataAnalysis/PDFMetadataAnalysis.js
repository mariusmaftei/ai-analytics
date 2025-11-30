import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faFileAlt,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./PDFMetadataAnalysis.module.css";

const PDFMetadataAnalysis = ({ data, rawText, analysisData }) => {
  const formatDate = (dateString) => {
    if (!dateString || dateString === "Unknown" || dateString === "") {
      return "N/A";
    }
    try {
      // PDF dates are often in format: D:20230311120000+00'00'
      if (dateString.startsWith("D:")) {
        dateString = dateString.substring(2);
      }
      // Try to parse ISO format or PDF format
      if (dateString.length >= 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const getTechnicalMetadata = () => {
    const metadata = analysisData?.metadata || {};
    const fileData = analysisData?.fileData || {};

    return [
      {
        property: "Title",
        value: metadata.title || fileData.fileName || "N/A",
      },
      {
        property: "Author",
        value: metadata.author || "N/A",
      },
      {
        property: "Created",
        value: formatDate(metadata.createdDate || metadata.creation_date),
      },
      {
        property: "Modified",
        value: formatDate(metadata.modificationDate || metadata.modification_date || metadata.modDate),
      },
      {
        property: "Producer",
        value: metadata.producer || metadata.creator || "N/A",
      },
      {
        property: "PDF Version",
        value: metadata.pdfVersion || metadata.pdf_version || "N/A",
      },
      {
        property: "Page Size",
        value: metadata.pageSize || metadata.page_size || "N/A",
      },
    ];
  };

  const getEmbeddedMetadata = () => {
    const metadata = analysisData?.metadata || {};
    const embedded = {
      keywords: metadata.keywords || "",
      subject: metadata.subject || "",
      creator: metadata.creator || "",
      producer: metadata.producer || "",
    };

    return embedded;
  };

  const technicalMetadata = getTechnicalMetadata();
  const embeddedMetadata = getEmbeddedMetadata();

  const hasEmbeddedData =
    embeddedMetadata.keywords ||
    embeddedMetadata.subject ||
    embeddedMetadata.creator ||
    embeddedMetadata.producer;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faInfoCircle} />
        </div>
        <div>
          <h2 className={styles.title}>Metadata Analysis</h2>
          <p className={styles.subtitle}>Document properties & information</p>
        </div>
      </div>

      {/* Section A: Technical Metadata */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faFileAlt} className={styles.sectionIcon} />
          Technical Metadata
        </h3>
        <div className={styles.metadataTable}>
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {technicalMetadata.map((item, idx) => (
                <tr key={idx}>
                  <td className={styles.propertyCell}>{item.property}</td>
                  <td className={styles.valueCell}>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: Embedded Metadata */}
      {hasEmbeddedData && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faTags} className={styles.sectionIcon} />
            Embedded Metadata
          </h3>
          <div className={styles.embeddedMetadata}>
            {embeddedMetadata.keywords && (
              <div className={styles.embeddedItem}>
                <div className={styles.embeddedLabel}>Keywords</div>
                <div className={styles.embeddedValue}>
                  {embeddedMetadata.keywords}
                </div>
              </div>
            )}
            {embeddedMetadata.subject && (
              <div className={styles.embeddedItem}>
                <div className={styles.embeddedLabel}>Subject</div>
                <div className={styles.embeddedValue}>
                  {embeddedMetadata.subject}
                </div>
              </div>
            )}
            {embeddedMetadata.creator && (
              <div className={styles.embeddedItem}>
                <div className={styles.embeddedLabel}>Creator</div>
                <div className={styles.embeddedValue}>
                  {embeddedMetadata.creator}
                </div>
              </div>
            )}
            {embeddedMetadata.producer && (
              <div className={styles.embeddedItem}>
                <div className={styles.embeddedLabel}>Producer</div>
                <div className={styles.embeddedValue}>
                  {embeddedMetadata.producer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasEmbeddedData && technicalMetadata.length === 0 && (
        <div className={styles.emptyState}>
          <p>No metadata available</p>
        </div>
      )}
    </div>
  );
};

export default PDFMetadataAnalysis;
