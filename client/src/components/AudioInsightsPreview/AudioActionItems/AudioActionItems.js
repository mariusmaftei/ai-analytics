import React, { useMemo, useState } from "react";
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
import { errorLog } from "../../../utils/debugLogger";
import { validateParsedData } from "../../../utils/audioParsingHelpers";
import { parseAudioAnalysisData } from "../../../utils/audioJsonParser";
import { ACTION_ITEMS_SCHEMA } from "../../../utils/audioJsonSchemas";
import {
  ACTION_ITEM_FULL_PATTERN,
  ACTION_ITEM_SIMPLE_PATTERN,
  DECISION_WITH_OPTIONAL_TIMESTAMP_PATTERN,
  DECISION_SIMPLE_PATTERN,
  DEADLINE_WITH_TIMESTAMP_PATTERN,
  DEADLINE_PATTERN,
  createSectionPattern,
} from "../../../utils/audioRegexPatterns";
import EmptyState from "../../Shared/EmptyState/EmptyState";
import ParsingError from "../../Shared/ParsingError/ParsingError";
import RawDataViewer from "../../Shared/RawDataViewer/RawDataViewer";
import styles from "./AudioActionItems.module.css";

// Helper function to parse lines from a section
const parseLines = (
  text,
  fullPattern,
  simplePattern,
  parseFull,
  parseSimple
) => {
  const lines = text.split(/\n/).filter((line) => line.trim().length > 0);

  const results = [];
  lines.forEach((line) => {
    const fullMatch = line.match(fullPattern);
    if (fullMatch) {
      results.push(parseFull(fullMatch));
    } else {
      const simpleMatch = line.match(simplePattern);
      if (simpleMatch && !simpleMatch[1]?.includes("SECTION:")) {
        results.push(parseSimple(simpleMatch));
      }
    }
  });
  return results;
};

// Helper to normalize "—" to null
const normalizeValue = (value) =>
  value?.trim() === "—" ? null : value?.trim();

const AudioActionItems = ({ rawText }) => {
  const [parsingError, setParsingError] = useState(null);

  const parsedData = useMemo(() => {
    setParsingError(null);

    try {
      const text = rawText || "";

      // Try JSON parsing first (new architecture)
      const jsonResult = parseAudioAnalysisData(
        text,
        ACTION_ITEMS_SCHEMA,
        null, // Will use text parser as fallback
        "AudioActionItems"
      );

      // If JSON parsing succeeded, transform to expected format
      if (jsonResult.data && jsonResult.format === 'json') {
        const jsonData = jsonResult.data;
        
        // Transform JSON format to component's expected format
        const transformed = {
          actionItems: (jsonData.actionItems || []).map(item => ({
            task: item.task,
            assignedTo: item.assignedTo || null,
            deadline: item.deadline || null,
            priority: item.priority || "Medium",
            timestamp: item.timestamp || null,
            notes: item.notes || null,
          })),
          decisions: (jsonData.decisions || []).map(decision => ({
            decision: decision.decision,
            timestamp: decision.timestamp || null,
          })),
          deadlines: (jsonData.deadlines || []).map(deadline => ({
            description: deadline.deadline,
            date: deadline.date || null,
            timestamp: deadline.timestamp || null,
          })),
        };

        return transformed;
      }

      // Fallback to text parsing (existing logic)
      const result = {
        actionItems: [],
        decisions: [],
        deadlines: [],
      };

      // Parse Action Items from rawText
      const actionItemsMatch = text.match(
        createSectionPattern("Action\\s+Items")
      );
      if (actionItemsMatch) {
        const actionItemsText = actionItemsMatch[1];
        result.actionItems = parseLines(
          actionItemsText,
          ACTION_ITEM_FULL_PATTERN,
          ACTION_ITEM_SIMPLE_PATTERN,
          (match) => ({
            task: match[1].trim(),
            assignedTo: normalizeValue(match[2]),
            deadline: normalizeValue(match[3]),
            priority: match[4].trim(),
            timestamp: normalizeValue(match[5]),
            notes: match[6].trim(),
          }),
          (match) => ({
            task: match[1].trim(),
            assignedTo: null,
            deadline: null,
            priority: "Medium",
            timestamp: null,
            notes: match[2].trim(),
          })
        );
      }

      // Parse Decisions Made from rawText
      const decisionsMatch = text.match(
        createSectionPattern("Decisions\\s+Made")
      );
      if (decisionsMatch) {
        const decisionsText = decisionsMatch[1];
        result.decisions = parseLines(
          decisionsText,
          DECISION_WITH_OPTIONAL_TIMESTAMP_PATTERN,
          DECISION_SIMPLE_PATTERN,
          (match) => ({
            decision: match[1].trim(),
            timestamp: normalizeValue(match[2]),
          }),
          (match) => ({
            decision: match[1].trim(),
            timestamp: null,
          })
        );
      }

      // Parse Deadlines Mentioned from rawText
      const deadlinesMatch = text.match(
        createSectionPattern("Deadlines\\s+Mentioned")
      );
      if (deadlinesMatch) {
        const deadlinesText = deadlinesMatch[1];
        result.deadlines = parseLines(
          deadlinesText,
          DEADLINE_WITH_TIMESTAMP_PATTERN,
          DEADLINE_PATTERN,
          (match) => ({
            description: match[1].trim(),
            date: match[2].trim(),
            timestamp: normalizeValue(match[3]),
          }),
          (match) => ({
            description: match[1].trim(),
            date: match[2].trim(),
            timestamp: null,
          })
        );
      }

      // Validate parsed data
      const isValid = validateParsedData(
        result,
        {
          actionItems: "array",
          decisions: "array",
          deadlines: "array",
        },
        "AudioActionItems"
      );

      if (!isValid) {
        throw new Error("Parsed data validation failed - invalid structure");
      }

      return result;
    } catch (error) {
      errorLog("AudioActionItems", "Parsing error:", error);
      setParsingError(error);
      return {
        actionItems: [],
        decisions: [],
        deadlines: [],
      };
    }
  }, [rawText]);

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

  // Show parsing error if occurred
  if (parsingError) {
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
        <RawDataViewer rawText={rawText} title="Raw AI Response (JSON parsing failed)" />
        <ParsingError
          message="Failed to parse action items data. The analysis may be in an unexpected format."
        />
      </div>
    );
  }

  // Check if all data is empty
  const hasData =
    parsedData.actionItems.length > 0 ||
    parsedData.decisions.length > 0 ||
    parsedData.deadlines.length > 0;

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

      {!hasData && (
        <EmptyState
          icon={faTasks}
          title="No Action Items Found"
          message="No action items, decisions, or deadlines were extracted from this audio analysis."
        />
      )}

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
    </div>
  );
};

export default AudioActionItems;
