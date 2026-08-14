// src/layout/DashboardLayout.jsx
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import FlashNotification from "../components/FlashNotification.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile when switching to mobile view
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((open) => !open);
  };

  // Close sidebar when clicking backdrop on mobile
  const handleBackdropClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="app-shell__body">
        {/* Backdrop for mobile overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="app-shell__backdrop" 
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
        )}
        <Sidebar isOpen={sidebarOpen} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
      <FlashNotification />
    </div>
  );
}