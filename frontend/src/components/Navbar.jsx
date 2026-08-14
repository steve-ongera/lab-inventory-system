import { useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import useNotification from "../hooks/useNotification";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { notifySuccess } = useNotification();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    notifySuccess("You have been signed out.");
    navigate("/login");
  };

  const initials = (user?.username || "?").slice(0, 2).toUpperCase();

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button
          className="navbar__menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list" aria-hidden="true"></i>
        </button>
        <span className="navbar__brand">Lab Inventory System</span>
      </div>

      <div className="navbar__right">
        <button className="navbar__icon-btn" aria-label="Notifications">
          <i className="bi bi-bell" aria-hidden="true"></i>
        </button>

        <div className="navbar__user" onClick={() => setMenuOpen((open) => !open)}>
          <span className="navbar__avatar">{initials}</span>
          <span className="navbar__username">{user?.username || "Guest"}</span>

          {menuOpen && (
            <div className="navbar__dropdown">
              <button onClick={() => navigate("/settings")}>
                <i className="bi bi-gear" aria-hidden="true"></i>
                Settings
              </button>
              <button onClick={handleLogout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}