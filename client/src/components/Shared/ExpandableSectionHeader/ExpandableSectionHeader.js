import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import styles from "./ExpandableSectionHeader.module.css";

const ExpandableSectionHeader = ({ isExpanded, onToggle, icon, title, accentColor = "#f97316" }) => {
  return (
    <div
      className={styles.header}
      onClick={onToggle}
      style={{ cursor: "pointer", "--accent-color": accentColor }}
    >
      <FontAwesomeIcon
        icon={isExpanded ? faChevronUp : faChevronDown}
        className={styles.expandIcon}
      />
      {icon && <FontAwesomeIcon icon={icon} className={styles.typeIcon} />}
      <h4 className={styles.title}>{title}</h4>
    </div>
  );
};

export default ExpandableSectionHeader;

