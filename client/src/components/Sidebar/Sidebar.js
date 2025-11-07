import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faMessage,
  faTrash,
  faPenToSquare,
  faCheck,
  faXmark,
  faBars,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "../../context/SessionContext";
import styles from "./Sidebar.module.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    updateSessionTitle,
    isSidebarOpen,
    toggleSidebar,
  } = useSession();

  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const handleNewSession = () => {
    const newSessionId = createNewSession();
    setCurrentSessionId(newSessionId);
    navigate("/home");
  };

  const handleSessionClick = (sessionId) => {
    setCurrentSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.files.length > 0) {
      // Navigate to analysis page with the last file
      const lastFile = session.files[session.files.length - 1];
      navigate("/analysis", { state: lastFile });
    } else {
      navigate("/home");
    }
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this session?")) {
      deleteSession(sessionId);
    }
  };

  const handleEditSession = (e, sessionId, currentTitle) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = (sessionId) => {
    if (editTitle.trim()) {
      updateSessionTitle(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return "Today";
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const dateLabel = formatDate(session.lastActivity);
    if (!acc[dateLabel]) {
      acc[dateLabel] = [];
    }
    acc[dateLabel].push(session);
    return acc;
  }, {});

  return (
    <>
      {/* Toggle Button for Mobile/Collapsed State */}
      <button
        className={`${styles.toggleButton} ${
          isSidebarOpen ? styles.open : ""
        }`}
        onClick={toggleSidebar}
        title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        <FontAwesomeIcon
          icon={isSidebarOpen ? faChevronLeft : faChevronRight}
        />
      </button>

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ""}`}
      >
        <div className={styles.sidebarContent}>
          {/* New Session Button */}
          <button className={styles.newSessionButton} onClick={handleNewSession}>
            <FontAwesomeIcon icon={faPlus} />
            <span>New Analysis</span>
          </button>

          {/* Sessions List */}
          <div className={styles.sessionsList}>
            {sessions.length === 0 ? (
              <div className={styles.emptyState}>
                <FontAwesomeIcon icon={faMessage} className={styles.emptyIcon} />
                <p>No sessions yet</p>
                <p className={styles.emptySubtext}>
                  Upload a file to start analyzing
                </p>
              </div>
            ) : (
              Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
                <div key={dateLabel} className={styles.sessionGroup}>
                  <h3 className={styles.dateLabel}>{dateLabel}</h3>
                  {dateSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`${styles.sessionItem} ${
                        currentSessionId === session.id ? styles.active : ""
                      }`}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      {editingSessionId === session.id ? (
                        <div className={styles.editMode}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={styles.editInput}
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit(session.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className={styles.editActions}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(session.id);
                              }}
                              className={styles.saveButton}
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className={styles.cancelButton}
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.sessionInfo}>
                            <FontAwesomeIcon
                              icon={faMessage}
                              className={styles.sessionIcon}
                            />
                            <span className={styles.sessionTitle}>
                              {session.title}
                            </span>
                          </div>
                          <div className={styles.sessionActions}>
                            <button
                              onClick={(e) =>
                                handleEditSession(e, session.id, session.title)
                              }
                              className={styles.actionButton}
                              title="Rename"
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className={styles.actionButton}
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={toggleSidebar}></div>
      )}
    </>
  );
};

export default Sidebar;

