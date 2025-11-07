import React, { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("aiAnalyticsSessions");
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("aiAnalyticsSessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: "New Analysis",
      createdAt: new Date().toISOString(),
      files: [],
      lastActivity: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const addFileToSession = (sessionId, fileData) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          const updatedFiles = [...session.files, fileData];
          const updatedTitle =
            session.files.length === 0
              ? fileData.fileName
              : `${session.title} +${updatedFiles.length}`;
          return {
            ...session,
            files: updatedFiles,
            title: updatedTitle,
            lastActivity: new Date().toISOString(),
          };
        }
        return session;
      })
    );
  };

  const deleteSession = (sessionId) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  const updateSessionTitle = (sessionId, newTitle) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, title: newTitle } : session
      )
    );
  };

  const getCurrentSession = () => {
    return sessions.find((session) => session.id === currentSessionId);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const value = {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    addFileToSession,
    deleteSession,
    updateSessionTitle,
    getCurrentSession,
    isSidebarOpen,
    toggleSidebar,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

