import React from "react";
import styles from "./ImagePreview.module.css";

const ImagePreview = ({ imageUrl, metadata, alt = "Uploaded image" }) => {
  if (!imageUrl) {
    return (
      <div className={styles.container}>
        <p className={styles.noImage}>No image to display</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt={alt}
          className={styles.image}
        />
      </div>
      {metadata && (
        <div className={styles.metadata}>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Dimensions:</span>
            <span className={styles.value}>
              {metadata.width} × {metadata.height} px
            </span>
          </div>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Format:</span>
            <span className={styles.value}>{metadata.format}</span>
          </div>
          {metadata.file_size && (
            <div className={styles.metadataItem}>
              <span className={styles.label}>Size:</span>
              <span className={styles.value}>
                {(metadata.file_size / 1024).toFixed(2)} KB
              </span>
            </div>
          )}
          {metadata.aspect_ratio && (
            <div className={styles.metadataItem}>
              <span className={styles.label}>Aspect Ratio:</span>
              <span className={styles.value}>{metadata.aspect_ratio}:1</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImagePreview;

