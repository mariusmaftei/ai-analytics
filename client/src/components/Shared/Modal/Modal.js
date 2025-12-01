import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import styles from "./Modal.module.css";

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // danger, warning, info
  icon = faTriangleExclamation,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Icon */}
        <div className={`${styles.iconWrapper} ${styles[type]}`}>
          <FontAwesomeIcon icon={icon} className={styles.icon} />
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>{message}</p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {cancelText && (
            <button className={styles.cancelButton} onClick={onClose}>
              {cancelText}
            </button>
          )}
          <button
            className={`${styles.confirmButton} ${styles[type]}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

