import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTasks,
  faUser,
  faClock,
  faExclamationCircle,
  faComment,
  faGavel,
  faCalendarAlt,
  faListCheck,
  faTable,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./AudioActionItems.module.css";

const AudioActionItems = ({ data, rawText, analysisData }) => {
  const parsedData = useMemo(() => {
    const result = {
      actionItems: [],
      decisions: [],
      deadlines: [],
      followUps: [],
    };

    const text = rawText || "";
    const sections = data?.sections || [];

    console.log("[AudioActionItems] Raw sections:", sections);
    console.log("[AudioActionItems] Raw text length:", text.length);
    if (text) {
      console.log(
        "[AudioActionItems] Raw text preview:",
        text.substring(0, 500)
      );
    }

    // Parse Action Items from rawText
    const actionItemsMatch = text.match(
      /SECTION:\s*Action\s+Items\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (actionItemsMatch) {
      const actionItemsText = actionItemsMatch[1];
      console.log(
        "[AudioActionItems] Found Action Items:",
        actionItemsText.substring(0, 500)
      );

      const lines = actionItemsText
        .split(/\n/)
        .filter((line) => line.trim().length > 0);
      lines.forEach((line) => {
        // Parse format: "Task Name: Assigned To: Deadline: Priority: Timestamp: Notes"
        const taskMatch = line.match(
          /^([^:]+?):\s*([^:]+?):\s*([^:]+?):\s*(High|Medium|Low|—):\s*(\d{1,2}:\d{2}|—):\s*(.+)$/i
        );
        if (taskMatch) {
          result.actionItems.push({
            task: taskMatch[1].trim(),
            assignedTo:
              taskMatch[2].trim() === "—" ? null : taskMatch[2].trim(),
            deadline: taskMatch[3].trim() === "—" ? null : taskMatch[3].trim(),
            priority: taskMatch[4].trim(),
            timestamp: taskMatch[5].trim() === "—" ? null : taskMatch[5].trim(),
            notes: taskMatch[6].trim(),
          });
        } else {
          // Try simpler format without all fields
          const simpleTaskMatch = line.match(/^([^:]+?):\s*(.+)$/);
          if (simpleTaskMatch && !simpleTaskMatch[1].includes("SECTION:")) {
            result.actionItems.push({
              task: simpleTaskMatch[1].trim(),
              assignedTo: null,
              deadline: null,
              priority: "Medium",
              timestamp: null,
              notes: simpleTaskMatch[2].trim(),
            });
          }
        }
      });
    }

    // Parse Decisions Made from rawText
    const decisionsMatch = text.match(
      /SECTION:\s*Decisions\s+Made\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (decisionsMatch) {
      const decisionsText = decisionsMatch[1];
      console.log(
        "[AudioActionItems] Found Decisions:",
        decisionsText.substring(0, 500)
      );

      const lines = decisionsText
        .split(/\n/)
        .filter((line) => line.trim().length > 0);
      lines.forEach((line) => {
        // Parse format: "Decision Description: Timestamp"
        const decisionMatch = line.match(/^([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i);
        if (decisionMatch) {
          result.decisions.push({
            decision: decisionMatch[1].trim(),
            timestamp:
              decisionMatch[2].trim() === "—" ? null : decisionMatch[2].trim(),
          });
        } else {
          // Try format without timestamp
          const simpleDecisionMatch = line.match(/^[-•*]?\s*(.+)$/);
          if (
            simpleDecisionMatch &&
            !simpleDecisionMatch[1].includes("SECTION:")
          ) {
            result.decisions.push({
              decision: simpleDecisionMatch[1].trim(),
              timestamp: null,
            });
          }
        }
      });
    }

    // Parse Deadlines Mentioned from rawText
    const deadlinesMatch = text.match(
      /SECTION:\s*Deadlines\s+Mentioned\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (deadlinesMatch) {
      const deadlinesText = deadlinesMatch[1];
      console.log(
        "[AudioActionItems] Found Deadlines:",
        deadlinesText.substring(0, 500)
      );

      const lines = deadlinesText
        .split(/\n/)
        .filter((line) => line.trim().length > 0);
      lines.forEach((line) => {
        // Parse format: "Deadline Description: Date: Timestamp"
        const deadlineMatch = line.match(
          /^([^:]+?):\s*([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i
        );
        if (deadlineMatch) {
          result.deadlines.push({
            description: deadlineMatch[1].trim(),
            date: deadlineMatch[2].trim(),
            timestamp:
              deadlineMatch[3].trim() === "—" ? null : deadlineMatch[3].trim(),
          });
        } else {
          // Try format without timestamp
          const simpleDeadlineMatch = line.match(/^([^:]+?):\s*(.+)$/);
          if (
            simpleDeadlineMatch &&
            !simpleDeadlineMatch[1].includes("SECTION:")
          ) {
            result.deadlines.push({
              description: simpleDeadlineMatch[1].trim(),
              date: simpleDeadlineMatch[2].trim(),
              timestamp: null,
            });
          }
        }
      });
    }

    // Parse Follow-up Items from rawText
    const followUpsMatch = text.match(
      /SECTION:\s*Follow-up\s+Items\s*[:\n]*([\s\S]*?)(?=SECTION:|$)/i
    );
    if (followUpsMatch) {
      const followUpsText = followUpsMatch[1];
      console.log(
        "[AudioActionItems] Found Follow-ups:",
        followUpsText.substring(0, 500)
      );

      const lines = followUpsText
        .split(/\n/)
        .filter((line) => line.trim().length > 0);
      lines.forEach((line) => {
        // Parse format: "Follow-up Description: Timestamp"
        const followUpMatch = line.match(/^([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i);
        if (followUpMatch) {
          result.followUps.push({
            description: followUpMatch[1].trim(),
            timestamp:
              followUpMatch[2].trim() === "—" ? null : followUpMatch[2].trim(),
          });
        } else {
          // Try format without timestamp
          const simpleFollowUpMatch = line.match(/^[-•*]?\s*(.+)$/);
          if (
            simpleFollowUpMatch &&
            !simpleFollowUpMatch[1].includes("SECTION:")
          ) {
            result.followUps.push({
              description: simpleFollowUpMatch[1].trim(),
              timestamp: null,
            });
          }
        }
      });
    }

    console.log("[AudioActionItems] Parsed data:", result);
    return result;
  }, [data, rawText]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const priorities = parsedData.actionItems.reduce((acc, item) => {
      const priority = item.priority || "Medium";
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    return {
      tasksCount: parsedData.actionItems.length,
      decisionsCount: parsedData.decisions.length,
      deadlinesCount: parsedData.deadlines.length,
      priorities: priorities,
    };
  }, [parsedData]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#ef4444"; // Red
      case "medium":
        return "#f59e0b"; // Orange
      case "low":
        return "#22c55e"; // Green
      default:
        return "#6b7280"; // Gray
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return faExclamationCircle;
      case "medium":
        return faCircle;
      case "low":
        return faCircle;
      default:
        return faCircle;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FontAwesomeIcon icon={faTasks} />
        </div>
        <div>
          <h2 className={styles.title}>Action Items</h2>
          <p className={styles.subtitle}>Tasks, decisions, and deadlines</p>
        </div>
      </div>

      {/* Summary Box */}
      {(summary.tasksCount > 0 ||
        summary.decisionsCount > 0 ||
        summary.deadlinesCount > 0) && (
        <div className={styles.summaryBox}>
          <div className={styles.summaryHeader}>
            <FontAwesomeIcon
              icon={faListCheck}
              className={styles.summaryIcon}
            />
            <h3 className={styles.summaryTitle}>Action Summary</h3>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Tasks Identified:</span>
              <span className={styles.summaryValue}>{summary.tasksCount}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Decisions Made:</span>
              <span className={styles.summaryValue}>
                {summary.decisionsCount}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Deadlines Detected:</span>
              <span className={styles.summaryValue}>
                {summary.deadlinesCount}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                Recommended Priorities:
              </span>
              <span className={styles.summaryValue}>
                {Object.entries(summary.priorities)
                  .map(([priority, count]) => `${priority} (${count})`)
                  .join(", ") || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Task List - Cards View */}
      {parsedData.actionItems.length > 0 && (
        <div className={styles.taskListSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faTasks} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Task List</h3>
          </div>
          <div className={styles.taskCardsGrid}>
            {parsedData.actionItems.map((item, index) => (
              <div key={index} className={styles.taskCard}>
                <div className={styles.taskCardHeader}>
                  <FontAwesomeIcon
                    icon={getPriorityIcon(item.priority)}
                    className={styles.taskPriorityIcon}
                    style={{ color: getPriorityColor(item.priority) }}
                  />
                  <h4 className={styles.taskName}>{item.task}</h4>
                </div>
                <div className={styles.taskCardBody}>
                  {item.assignedTo && (
                    <div className={styles.taskDetail}>
                      <FontAwesomeIcon
                        icon={faUser}
                        className={styles.taskDetailIcon}
                      />
                      <span className={styles.taskDetailLabel}>
                        Assigned to:
                      </span>
                      <span className={styles.taskDetailValue}>
                        {item.assignedTo}
                      </span>
                    </div>
                  )}
                  {item.deadline && (
                    <div className={styles.taskDetail}>
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        className={styles.taskDetailIcon}
                      />
                      <span className={styles.taskDetailLabel}>Deadline:</span>
                      <span className={styles.taskDetailValue}>
                        {item.deadline}
                      </span>
                    </div>
                  )}
                  {item.priority && item.priority !== "—" && (
                    <div className={styles.taskDetail}>
                      <FontAwesomeIcon
                        icon={faExclamationCircle}
                        className={styles.taskDetailIcon}
                      />
                      <span className={styles.taskDetailLabel}>Priority:</span>
                      <span
                        className={styles.taskDetailValue}
                        style={{ color: getPriorityColor(item.priority) }}
                      >
                        {item.priority}
                      </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className={styles.taskDetail}>
                      <FontAwesomeIcon
                        icon={faComment}
                        className={styles.taskDetailIcon}
                      />
                      <span className={styles.taskDetailLabel}>Notes:</span>
                      <span className={styles.taskDetailValue}>
                        {item.notes}
                      </span>
                    </div>
                  )}
                  {item.timestamp && (
                    <div className={styles.taskDetail}>
                      <FontAwesomeIcon
                        icon={faClock}
                        className={styles.taskDetailIcon}
                      />
                      <span className={styles.taskDetailLabel}>Timestamp:</span>
                      <span className={styles.taskDetailValue}>
                        {item.timestamp}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task List - Table View */}
      {parsedData.actionItems.length > 0 && (
        <div className={styles.taskTableSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faTable} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Task Table</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.taskTable}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.actionItems.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.taskCell}>{item.task}</td>
                    <td className={styles.assignedCell}>
                      {item.assignedTo || "—"}
                    </td>
                    <td className={styles.deadlineCell}>
                      {item.deadline || "—"}
                    </td>
                    <td className={styles.priorityCell}>
                      <span
                        className={styles.priorityBadge}
                        style={{
                          backgroundColor: getPriorityColor(item.priority),
                        }}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className={styles.timestampCell}>
                      {item.timestamp || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decisions Panel */}
      {parsedData.decisions.length > 0 && (
        <div className={styles.decisionsSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon icon={faGavel} className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Key Decisions</h3>
          </div>
          <div className={styles.decisionsCard}>
            <ul className={styles.decisionsList}>
              {parsedData.decisions.map((decision, index) => (
                <li key={index} className={styles.decisionItem}>
                  <span className={styles.decisionText}>
                    {decision.decision}
                  </span>
                  {decision.timestamp && (
                    <span className={styles.decisionTimestamp}>
                      {decision.timestamp}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Deadlines Timeline */}
      {parsedData.deadlines.length > 0 && (
        <div className={styles.deadlinesSection}>
          <div className={styles.sectionHeader}>
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className={styles.sectionIcon}
            />
            <h3 className={styles.sectionTitle}>Deadlines Timeline</h3>
          </div>
          <div className={styles.timelineContainer}>
            <div className={styles.timeline}>
              {parsedData.deadlines.map((deadline, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineDate}>{deadline.date}</div>
                    <div className={styles.timelineDescription}>
                      {deadline.description}
                    </div>
                    {deadline.timestamp && (
                      <div className={styles.timelineTimestamp}>
                        {deadline.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fallback: Show raw sections if available */}
      {parsedData.actionItems.length === 0 &&
        parsedData.decisions.length === 0 &&
        data?.sections &&
        data.sections.length > 0 && (
          <div className={styles.sections}>
            {data.sections.map((section, index) => (
              <div key={index} className={styles.section}>
                <h3 className={styles.sectionTitle}>{section.name}</h3>
                <div className={styles.content}>
                  {section.content?.map((item, itemIndex) => {
                    if (item.type === "bullet") {
                      return (
                        <div key={itemIndex} className={styles.actionItem}>
                          <FontAwesomeIcon icon={faTasks} />
                          {item.text}
                        </div>
                      );
                    } else if (item.type === "keyValue") {
                      return (
                        <div key={itemIndex} className={styles.keyValue}>
                          <span className={styles.key}>{item.key}:</span>
                          <span className={styles.value}>{item.value}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div key={itemIndex} className={styles.text}>
                          {item.text}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Fallback: Show raw text */}
      {parsedData.actionItems.length === 0 &&
        parsedData.decisions.length === 0 &&
        !data?.sections &&
        rawText && <div className={styles.rawText}>{rawText}</div>}
    </div>
  );
};

export default AudioActionItems;
