//src/layout/DashboardLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";

import FlashNotification from "../components/FlashNotification.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
      <div className="app-shell__body">
        <Sidebar isOpen={sidebarOpen} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
      <FlashNotification />
    </div>
  );
}
