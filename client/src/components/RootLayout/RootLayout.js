import React from "react";
import Header from "../Header/Header";
import Sidebar from "../Layout/Sidebar/Sidebar";
import ScrollToTop from "../ScrollToTop/ScrollToTop";
import { Outlet } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import styles from "./RootLayout.module.css";

export default function RootLayout() {
  const { isSidebarOpen } = useSession();

  // Hide footer on home page to make space for chat (currently not used)

  return (
    <div className={styles.layoutContainer}>
      <ScrollToTop />
      <Sidebar />
      <div
        className={`${styles.mainContent} ${
          isSidebarOpen ? styles.withSidebar : ""
        }`}
      >
        <Header />
        <div className={styles.pageContent}>
          <Outlet />
        </div>
        {/* Footer is hidden on home page */}
      </div>
    </div>
  );
}
