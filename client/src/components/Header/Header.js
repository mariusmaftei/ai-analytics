import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faHouse,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <span className={styles.logoText}>AI Analytics</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/home" className={styles.navLink}>
            <FontAwesomeIcon icon={faHouse} className={styles.navIcon} />
            Home
          </Link>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#pricing" className={styles.navLink}>
            Pricing
          </a>
          <Link to="/login" className={styles.navLink}>
            <FontAwesomeIcon
              icon={faRightToBracket}
              className={styles.navIcon}
            />
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
