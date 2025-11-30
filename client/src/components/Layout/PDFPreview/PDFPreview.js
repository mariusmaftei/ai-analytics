import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faFilePdf,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import styles from "./PDFPreview.module.css";

// Set up PDF.js worker - use local worker file from public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const PDFPreview = ({ file, totalPages, fileName = "document.pdf" }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      console.warn("PDFPreview: No file provided", { file, fileName, totalPages });
      setError("No PDF file provided");
      setLoading(false);
      return;
    }

    console.log("PDFPreview: File received", {
      isFile: file instanceof File,
      isString: typeof file === "string",
      fileName: file instanceof File ? file.name : "N/A",
      fileSize: file instanceof File ? file.size : "N/A",
    });

    // Create object URL from file if it's a File object
    if (file instanceof File) {
      try {
        const url = URL.createObjectURL(file);
        console.log("PDFPreview: Created object URL", url);
        setFileUrl(url);
        setLoading(true);
        setError(null);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error("PDFPreview: Error creating object URL", err);
        setError(`Failed to create file URL: ${err.message}`);
        setLoading(false);
      }
    } else if (typeof file === "string") {
      // If it's already a URL string
      console.log("PDFPreview: Using string URL", file);
      setFileUrl(file);
      setLoading(true);
      setError(null);
    } else {
      console.error("PDFPreview: Invalid file type", typeof file, file);
      setError(`Invalid file provided. Expected File object or URL string, got: ${typeof file}`);
      setLoading(false);
    }
  }, [file, fileName, totalPages]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log("PDFPreview: Document loaded successfully", { numPages, totalPages });
    setNumPages(numPages || totalPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error("PDFPreview: Document load error", error);
    setError(`Failed to load PDF document: ${error.message || "Unknown error"}`);
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || totalPages || 1, prev + 1));
  };

  const handlePageSelect = (e) => {
    const selectedPage = parseInt(e.target.value, 10);
    if (selectedPage >= 1 && selectedPage <= (numPages || totalPages || 1)) {
      setPageNumber(selectedPage);
    }
  };

  const maxPages = numPages || totalPages || 1;

  if (!fileUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faFilePdf} className={styles.emptyIcon} />
          <p>No PDF file provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FontAwesomeIcon icon={faFilePdf} />
        <h3>PDF Preview</h3>
        {maxPages > 0 && (
          <span className={styles.pageInfo}>
            {pageNumber} / {maxPages}
          </span>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <p style={{ fontSize: "12px", marginTop: "8px" }}>
            Please check the browser console for more details.
          </p>
        </div>
      )}

      {!error && (
        <>
          {numPages && (
            <div className={styles.controls}>
              <button
                className={styles.navButton}
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                title="Previous page"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className={styles.pageSelector}>
                <label htmlFor="page-select">Page:</label>
                <select
                  id="page-select"
                  value={pageNumber}
                  onChange={handlePageSelect}
                  className={styles.pageSelect}
                >
                  {Array.from({ length: maxPages }, (_, i) => i + 1).map(
                    (page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    )
                  )}
                </select>
                <span className={styles.pageCount}>of {maxPages}</span>
              </div>

              <button
                className={styles.navButton}
                onClick={goToNextPage}
                disabled={pageNumber >= maxPages}
                title="Next page"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          )}

          <div className={styles.pdfViewer}>
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className={styles.loading}>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Loading PDF document...</span>
                </div>
              }
              options={{
                cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
              }}
            >
              {numPages && (
                <Page
                  pageNumber={pageNumber}
                  className={styles.pdfPage}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={window.innerWidth > 768 ? 780 : window.innerWidth - 60}
                  scale={1.04}
                />
              )}
            </Document>
          </div>
        </>
      )}
    </div>
  );
};

export default PDFPreview;

