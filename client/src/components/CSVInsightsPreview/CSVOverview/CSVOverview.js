import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faDollarSign,
  faChartLine,
  faGlobe,
  faDatabase,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./CSVOverview.module.css";

const CSVOverview = ({ data, rawText }) => {
  console.log("CSVOverview received data:", data);
  console.log("CSVOverview rawText:", rawText);
  
  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No overview data available</p>
        </div>
      </div>
    );
  }

  const extractKPIs = () => {
    const kpis = {
      totalTransactions: null,
      totalRevenue: null,
      avgRevenue: null,
      topRegion: null,
    };

    if (!data || !data.sections) {
      console.log("No sections found in data");
      return kpis;
    }

    console.log("Extracting KPIs from sections:", data.sections);

    data.sections.forEach((section) => {
      const sectionName = section.name?.toLowerCase() || "";
      
      if (section.tables && section.tables.length > 0) {
        section.tables.forEach((table) => {
          if (table.rows) {
            table.rows.forEach((row) => {
              if (row.length >= 2) {
                const key = (row[0] || "").toLowerCase();
                const value = row[1] || row[2] || "";

                if (key.includes("total transactions") || key.includes("rows") && !kpis.totalTransactions) {
                  kpis.totalTransactions = value;
                }
                if (key.includes("total revenue") && !kpis.totalRevenue) {
                  kpis.totalRevenue = value;
                }
                if ((key.includes("avg revenue") || key.includes("average revenue") || key.includes("average revenue per transaction")) && !kpis.avgRevenue) {
                  kpis.avgRevenue = value;
                }
                if ((key.includes("most frequent region") || key.includes("top region")) && !kpis.topRegion) {
                  kpis.topRegion = value;
                }
              }
            });
          }
        });
      }

      if (section.content) {
        section.content.forEach((item) => {
          if (item.type === 'keyValue' && item.key && item.value) {
            const key = item.key.toLowerCase();
            const value = item.value;
            
            if ((key.includes("total transactions") || key.includes("rows")) && !kpis.totalTransactions) {
              kpis.totalTransactions = value;
            }
            if (key.includes("total revenue") && !kpis.totalRevenue) {
              kpis.totalRevenue = value;
            }
            if ((key.includes("avg revenue") || key.includes("average revenue") || key.includes("average revenue per transaction")) && !kpis.avgRevenue) {
              kpis.avgRevenue = value;
            }
            if ((key.includes("most frequent region") || key.includes("top region")) && !kpis.topRegion) {
              kpis.topRegion = value.split('(')[0].trim();
            }
          } else {
            const text = item.text || "";
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes("total transactions") && !kpis.totalTransactions) {
              const match = text.match(/total\s+transactions[:\-]?\s*(\d+[\d,]*)/i);
              if (match) {
                kpis.totalTransactions = match[1];
              } else {
                const numMatch = text.match(/(\d+[\d,]*)\s*transactions?/i);
                if (numMatch) kpis.totalTransactions = numMatch[1];
              }
            }
            
            if (lowerText.includes("total revenue") && !kpis.totalRevenue) {
              const match = text.match(/total\s+revenue[:\-]?\s*\$?([\d,]+\.?\d*)/i);
              if (match) {
                kpis.totalRevenue = match[1];
              }
            }
            
            if ((lowerText.includes("avg revenue") || lowerText.includes("average revenue") || lowerText.includes("average revenue per transaction") || lowerText.includes("revenue per transaction")) && !kpis.avgRevenue) {
              let match = text.match(/average\s+revenue\s+per\s+transaction[:\-]?\s*\$?([\d,]+\.?\d*)/i);
              if (match) {
                kpis.avgRevenue = match[1];
              } else {
                match = text.match(/(?:avg|average)\s+revenue[:\-]?\s*\$?([\d,]+\.?\d*)/i);
                if (match) {
                  kpis.avgRevenue = match[1];
                } else {
                  const altMatch = text.match(/revenue\s+per\s+transaction[:\-]?\s*\$?([\d,]+\.?\d*)/i);
                  if (altMatch) kpis.avgRevenue = altMatch[1];
                }
              }
            }
            
            if ((lowerText.includes("most frequent region") || lowerText.includes("top region")) && !kpis.topRegion) {
              const match = text.match(/(?:most\s+frequent|top)\s+region[:\-]?\s*([^(\n]+)/i);
              if (match) {
                kpis.topRegion = match[1].trim().split('(')[0].trim();
              }
            }
          }
        });
      }
    });

    if (rawText && (!kpis.totalTransactions || !kpis.totalRevenue)) {
      const text = rawText.toLowerCase();
      
      if (!kpis.totalTransactions) {
        const match = rawText.match(/total\s+transactions[:\-]?\s*(\d+[\d,]*)/i);
        if (match) kpis.totalTransactions = match[1];
      }
      
      if (!kpis.totalRevenue) {
        const match = rawText.match(/total\s+revenue[:\-]?\s*\$?([\d,]+\.?\d*)/i);
        if (match) kpis.totalRevenue = match[1];
      }
      
      if (!kpis.avgRevenue) {
        let match = rawText.match(/average\s+revenue\s+per\s+transaction[:\-]?\s*\$?([\d,]+\.?\d*)/i);
        if (match) {
          kpis.avgRevenue = match[1];
        } else {
          match = rawText.match(/(?:avg|average)\s+revenue[:\-]?\s*\$?([\d,]+\.?\d*)/i);
          if (match) {
            kpis.avgRevenue = match[1];
          } else {
            const altMatch = rawText.match(/revenue\s+per\s+transaction[:\-]?\s*\$?([\d,]+\.?\d*)/i);
            if (altMatch) kpis.avgRevenue = altMatch[1];
          }
        }
      }
      
      if (!kpis.topRegion) {
        const match = rawText.match(/(?:most\s+frequent|top)\s+region[:\-]?\s*([^(\n]+)/i);
        if (match) {
          kpis.topRegion = match[1].trim().split('(')[0].trim();
        }
      }
    }

    console.log("Extracted KPIs:", kpis);
    return kpis;
  };

  const extractChartData = () => {
    const charts = {
      revenueByRegion: [],
      topProducts: [],
    };

    if (data.sections) {
      data.sections.forEach((section) => {
        const sectionName = section.name?.toLowerCase() || "";
        
        if (sectionName.includes("regional") && section.tables) {
          section.tables.forEach((table) => {
            if (table.headers && table.headers.length >= 2) {
              const regionIndex = table.headers.findIndex(h => 
                h.toLowerCase().includes("region")
              );
              let revenueIndex = table.headers.findIndex(h => 
                h.toLowerCase().includes("total revenue")
              );
              if (revenueIndex < 0) {
                revenueIndex = table.headers.findIndex(h => 
                  h.toLowerCase().includes("revenue")
                );
              }

              if (regionIndex >= 0 && revenueIndex >= 0 && table.rows) {
                table.rows.forEach((row) => {
                  if (row[regionIndex] && row[revenueIndex]) {
                    const revenueStr = row[revenueIndex].toString();
                    const revenue = parseFloat(revenueStr.replace(/[^0-9.]/g, "")) || 0;
                    if (revenue > 0) {
                      charts.revenueByRegion.push({
                        region: row[regionIndex],
                        revenue: revenue,
                      });
                    }
                  }
                });
              }
            }
          });
        }

        if (sectionName.includes("product") && section.tables) {
          section.tables.forEach((table) => {
            if (table.headers && table.rows) {
              const productIndex = table.headers.findIndex(h => 
                h.toLowerCase().includes("product")
              );
              const revenueIndex = table.headers.findIndex(h => 
                h.toLowerCase().includes("revenue")
              );

              if (productIndex >= 0 && revenueIndex >= 0) {
                table.rows.slice(0, 5).forEach((row) => {
                  if (row[productIndex] && row[revenueIndex]) {
                    charts.topProducts.push({
                      product: row[productIndex],
                      revenue: parseFloat(row[revenueIndex].replace(/[^0-9.]/g, "")) || 0,
                    });
                  }
                });
              }
            }
          });
        }
      });
    }

    return charts;
  };

  const kpis = extractKPIs();
  const chartData = extractChartData();

  const formatCurrency = (value) => {
    if (!value || value === "N/A") return "N/A";
    const str = value.toString();
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) {
      if (str.includes("$")) return str;
      return value;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (value) => {
    if (!value) return "N/A";
    const num = parseFloat(value.toString().replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US").format(num);
  };

  const totalRevenueByRegion = chartData.revenueByRegion.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const maxProductRevenue = chartData.topProducts.length > 0
    ? Math.max(...chartData.topProducts.map(p => p.revenue))
    : 0;

  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/✅/g, '')
      .replace(/❌/g, '')
      .replace(/⚙️/g, '')
      .replace(/\|/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatKeyValue = (text) => {
    if (!text) return text;
    const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      return (
        <>
          <strong>{colonMatch[1].trim()}:</strong> {colonMatch[2].trim()}
        </>
      );
    }
    return text;
  };

  const renderKeyInsights = () => {
    console.log('[CSVOverview] All sections:', data.sections?.map(s => ({ name: s.name, contentCount: s.content?.length })));
    
    const documentOverview = data.sections?.find(s => 
      s.name?.toLowerCase().includes("document overview")
    );
    
    const keyInsights = data.sections?.find(s => {
      const name = s.name?.toLowerCase() || '';
      return name === "key insights" || 
             name.includes("key insights") || 
             name.includes("summary insights") ||
             (name.includes("insights") && !name.includes("overview"));
    });

    const highlights = data.sections?.find(s => {
      const name = s.name?.toLowerCase() || '';
      return name === "patterns and trends" ||
             name === "patterns & trends" ||
             name.includes("patterns and trends") ||
             name.includes("patterns & trends") ||
             (name.includes("patterns") && name.includes("trends")) ||
             name.includes("highlights");
    });

    console.log('[CSVOverview] Found sections:', {
      documentOverview: documentOverview ? { name: documentOverview.name, contentCount: documentOverview.content?.length } : null,
      keyInsights: keyInsights ? { name: keyInsights.name, contentCount: keyInsights.content?.length } : null,
      highlights: highlights ? { name: highlights.name, contentCount: highlights.content?.length } : null,
    });

    if (!documentOverview && !keyInsights && !highlights && !data.introText) {
      return null;
    }

    const renderContentItems = (content) => {
      if (!content || content.length === 0) {
        console.log('[CSVOverview] No content items to render');
        return null;
      }
      console.log('[CSVOverview] Rendering', content.length, 'content items:', content);
      const items = content.map((item, idx) => {
        if (item.type === 'keyValue' && item.key && item.value) {
          return (
            <li key={idx} className={styles.insightItem}>
              <span className={styles.bulletPoint}>•</span>
              <span>
                <strong>{item.key}:</strong> {item.value}
              </span>
            </li>
          );
        } else if (item.type === 'bullet' && item.text) {
          return (
            <li key={idx} className={styles.insightItem}>
              <span className={styles.bulletPoint}>•</span>
              <span>{item.text}</span>
            </li>
          );
        } else if (item.type === 'subsection' && item.text) {
          const parts = item.text.split(':');
          if (parts.length >= 2 && parts[1].trim()) {
            return (
              <li key={idx} className={styles.insightItem}>
                <span className={styles.bulletPoint}>•</span>
                <span>
                  <strong>{parts[0].trim()}:</strong> {parts.slice(1).join(':').trim()}
                </span>
              </li>
            );
          } else {
            return (
              <li key={idx} className={styles.insightItem}>
                <span className={styles.bulletPoint}>•</span>
                <span><strong>{item.text}</strong></span>
              </li>
            );
          }
        } else if (item.type === 'text' && item.text) {
          if (item.text.includes(':')) {
            const parts = item.text.split(':');
            if (parts.length >= 2 && parts[1].trim()) {
              return (
                <li key={idx} className={styles.insightItem}>
                  <span className={styles.bulletPoint}>•</span>
                  <span>
                    <strong>{parts[0].trim()}:</strong> {parts.slice(1).join(':').trim()}
                  </span>
                </li>
              );
            }
          }
          if (item.text.trim().length > 0) {
            return (
              <li key={idx} className={styles.insightItem}>
                <span className={styles.bulletPoint}>•</span>
                <span>{item.text}</span>
              </li>
            );
          }
        }
        return null;
      }).filter(item => item !== null);
      
      if (items.length === 0) {
        console.log('[CSVOverview] No valid items after filtering');
        return null;
      }
      
      return items;
    };

    return (
      <div className={styles.keyInsightsSection}>
        {documentOverview && (
          <div className={styles.insightCard}>
            <h3 className={styles.insightCardTitle}>Document Overview</h3>
            {documentOverview.content && documentOverview.content.length > 0 ? (
              <ul className={styles.insightsList}>
                {renderContentItems(documentOverview.content)}
              </ul>
            ) : (
              <p className={styles.summaryText}>No overview data available</p>
            )}
          </div>
        )}

        {keyInsights && (
          <div className={styles.insightCard}>
            <h3 className={styles.insightCardTitle}>Summary Insights</h3>
            {keyInsights.content && keyInsights.content.length > 0 ? (
              <ul className={styles.insightsList}>
                {renderContentItems(keyInsights.content)}
              </ul>
            ) : (
              <p className={styles.summaryText}>No insights data available</p>
            )}
          </div>
        )}

        {highlights && (
          <div className={styles.insightCard}>
            <h3 className={styles.insightCardTitle}>Quick Highlights</h3>
            {highlights.content && highlights.content.length > 0 ? (
              <ul className={styles.insightsList}>
                {renderContentItems(highlights.content)}
              </ul>
            ) : (
              <p className={styles.summaryText}>No highlights data available</p>
            )}
          </div>
        )}

        {!documentOverview && !keyInsights && !highlights && data.introText && (
          <div className={styles.insightCard}>
            <h3 className={styles.insightCardTitle}>Key Insights</h3>
            <p className={styles.summaryText}>{data.introText}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faDatabase} />
        </div>
        <div>
          <h2 className={styles.title}>Overview</h2>
          <p className={styles.subtitle}>Executive Summary</p>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <FontAwesomeIcon icon={faShoppingCart} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Total Transactions</div>
            <div className={styles.kpiValue}>
              {formatNumber(kpis.totalTransactions)}
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Total Revenue</div>
            <div className={styles.kpiValue}>
              {formatCurrency(kpis.totalRevenue)}
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Avg Revenue</div>
            <div className={styles.kpiValue}>
              {formatCurrency(kpis.avgRevenue)}
            </div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <FontAwesomeIcon icon={faGlobe} />
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiLabel}>Top Region</div>
            <div className={styles.kpiValue}>
              {kpis.topRegion || "N/A"}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {chartData.revenueByRegion.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Revenue by Region</h3>
            <div className={styles.pieChart}>
              {chartData.revenueByRegion.map((item, idx) => {
                const percentage = totalRevenueByRegion > 0
                  ? (item.revenue / totalRevenueByRegion) * 100
                  : 0;
                return (
                  <div key={idx} className={styles.pieSegment}>
                    <div className={styles.pieSegmentBar}>
                      <div
                        className={styles.pieSegmentFill}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className={styles.pieSegmentLabel}>
                      <span className={styles.pieSegmentName}>{item.region}</span>
                      <span className={styles.pieSegmentValue}>
                        {formatCurrency(item.revenue)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chartData.topProducts.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Top Products</h3>
            <div className={styles.barChart}>
              {chartData.topProducts.map((item, idx) => {
                const percentage = maxProductRevenue > 0
                  ? (item.revenue / maxProductRevenue) * 100
                  : 0;
                return (
                  <div key={idx} className={styles.barItem}>
                    <div className={styles.barLabel}>{item.product}</div>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${percentage}%` }}
                      />
                      <span className={styles.barValue}>
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {renderKeyInsights()}
    </div>
  );
};

export default CSVOverview;


