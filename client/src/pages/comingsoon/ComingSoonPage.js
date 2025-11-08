import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faRocket,
  faClock,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ComingSoonPage.module.css";

const ComingSoonPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which page they tried to access
  const getPageInfo = () => {
    const path = location.pathname.substring(1);
    const pageNames = {
      features: { title: "Features", icon: faRocket },
      pricing: { title: "Pricing", icon: faClock },
      login: { title: "Login", icon: faClock },
    };
    return pageNames[path] || { title: "This Feature", icon: faRocket };
  };

  const pageInfo = getPageInfo();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Icon */}
        <div className={styles.iconWrapper}>
          <FontAwesomeIcon icon={faRocket} className={styles.icon} />
        </div>

        {/* Main Title */}
        <h1 className={styles.title}>Coming Soon</h1>
        
        {/* Subtitle */}
        <p className={styles.subtitle}>
          <strong>{pageInfo.title}</strong> is currently under development
        </p>

        {/* Description */}
        <p className={styles.description}>
          We're working hard to bring you amazing features! This section will be available soon.
          <br />
          Stay tuned for updates.
        </p>

        {/* Features Preview */}
        <div className={styles.featuresPreview}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3 className={styles.featureTitle}>Powerful Analytics</h3>
            <p className={styles.featureText}>
              Advanced AI-powered analysis for your documents
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Real-time Insights</h3>
            <p className={styles.featureText}>
              Get instant feedback and visualizations
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔒</div>
            <h3 className={styles.featureTitle}>Secure & Private</h3>
            <p className={styles.featureText}>
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </div>

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

        {/* Progress Indicator */}
        <div className={styles.progressSection}>
          <p className={styles.progressLabel}>Development Progress</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "65%" }}></div>
          </div>
          <p className={styles.progressText}>65% Complete</p>
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

export default ComingSoonPage;

