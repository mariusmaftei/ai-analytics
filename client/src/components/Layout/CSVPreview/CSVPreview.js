import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTable, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import styles from "./CSVPreview.module.css";

const CSVPreview = ({ tables = [] }) => {
  const [expandedTables, setExpandedTables] = useState({});

  const toggleTable = (index) => {
    setExpandedTables((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!tables || tables.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faTable} className={styles.emptyIcon} />
          <p>No tables found in this document</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FontAwesomeIcon icon={faTable} />
        <h3>CSV Preview</h3>
        <span className={styles.count}>{tables.length} table{tables.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.tablesList}>
        {tables.map((table, tableIndex) => {
          const isExpanded = expandedTables[tableIndex];
          const tableData = table.data || [];
          const hasData = tableData.length > 0;

          return (
            <div key={tableIndex} className={styles.tableCard}>
              <div
                className={styles.tableHeader}
                onClick={() => toggleTable(tableIndex)}
              >
                <div className={styles.tableInfo}>
                  <span className={styles.tableTitle}>
                    Table {tableIndex + 1}
                  </span>
                  <span className={styles.tableMeta}>
                    Page {table.page || 'N/A'} • {table.rows || 0} rows • {table.columns || 0} columns
                  </span>
                </div>
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronUp : faChevronDown}
                  className={styles.expandIcon}
                />
              </div>

              {isExpanded && hasData && (
                <div className={styles.tableContent}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        {tableData[0] && (
                          <tr>
                            {tableData[0].map((header, colIndex) => (
                              <th key={colIndex} className={styles.tableHeaderCell}>
                                {header || `Column ${colIndex + 1}`}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {tableData.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex} className={styles.tableRow}>
                            {row.map((cell, colIndex) => (
                              <td key={colIndex} className={styles.tableCell}>
                                {cell || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CSVPreview;

