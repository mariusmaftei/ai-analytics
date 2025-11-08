import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faTriangleExclamation,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./NotFoundPage.module.css";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Error Icon */}
        <div className={styles.iconWrapper}>
          <FontAwesomeIcon icon={faTriangleExclamation} className={styles.icon} />
        </div>

        {/* 404 Text */}
        <h1 className={styles.errorCode}>404</h1>
        
        {/* Error Message */}
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
          <br />
          Let's get you back on track!
        </p>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={() => navigate("/home")}
          >
            <FontAwesomeIcon icon={faHouse} />
            <span>Go to Home</span>
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Go Back</span>
          </button>
        </div>

        {/* Helpful Links */}
        <div className={styles.helpfulLinks}>
          <p className={styles.linksTitle}>Quick Links:</p>
          <div className={styles.linksList}>
            <button onClick={() => navigate("/home")} className={styles.link}>
              Home
            </button>
            <span className={styles.separator}>•</span>
            <button onClick={() => navigate("/session")} className={styles.link}>
              Sessions
            </button>
            <span className={styles.separator}>•</span>
            <button onClick={() => navigate("/login")} className={styles.link}>
              Login
            </button>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className={styles.bgDecoration}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
        <div className={styles.circle3}></div>
      </div>
    </div>
  );
};

export default NotFoundPage;

