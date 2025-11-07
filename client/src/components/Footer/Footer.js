import React from "react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.title}>🤖 AI Analytics</h3>
            <p className={styles.description}>
              Empowering businesses with AI-powered insights and analytics.
            </p>
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Product</h4>
            <ul className={styles.links}>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <a href="#docs">Documentation</a>
              </li>
            </ul>
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Company</h4>
            <ul className={styles.links}>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#blog">Blog</a>
              </li>
              <li>
                <a href="#careers">Careers</a>
              </li>
            </ul>
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Connect</h4>
            <ul className={styles.links}>
              <li>
                <a href="#twitter">Twitter</a>
              </li>
              <li>
                <a href="#linkedin">LinkedIn</a>
              </li>
              <li>
                <a href="#github">GitHub</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © 2025 AI Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
