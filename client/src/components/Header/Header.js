import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons";
import softindexLogo from "../../assets/Images/logo/softindex-green-logo.png";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img 
            src={softindexLogo} 
            alt="Softindex Logo" 
            className={styles.logoImage}
          />
          <span className={styles.logoText}>Softindex Agent</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/home" className={styles.navLink}>
            <FontAwesomeIcon icon={faHouse} className={styles.navIcon} />
            Home
          </Link>
          <Link to="/features" className={styles.navLink}>
            Features
          </Link>
          <Link to="/pricing" className={styles.navLink}>
            Pricing
          </Link>
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
