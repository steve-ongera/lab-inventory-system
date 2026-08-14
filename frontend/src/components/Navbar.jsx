import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import useNotification from "../hooks/useNotification";

export default function Navbar({ onToggleSidebar, isDark, onThemeToggle }) {
  const { user, logout } = useAuth();
  const { notifySuccess } = useNotification();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    notifySuccess("You have been signed out.");
    navigate("/login");
  };

  const initials = (user?.username || "?").slice(0, 2).toUpperCase();

  // Close search on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
      // Ctrl+K or Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className={`navbar ${isDark ? "navbar--dark" : ""}`}>
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

      <div className="navbar__center">
        <div className="navbar__search">
          <i className="bi bi-search" aria-hidden="true"></i>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            aria-label="Search inventory"
          />
          <span className="navbar__search-shortcut">
            ⌘K
          </span>
          
          {/* Search Results Dropdown */}
          {searchOpen && searchQuery && (
            <div className="navbar__search-results navbar__search-results--open">
              <div className="navbar__search-results-item">
                <i className="bi bi-box" aria-hidden="true"></i>
                <div className="navbar__search-results-item__content">
                  <div className="navbar__search-results-item__title">Sample Item</div>
                  <div className="navbar__search-results-item__subtitle">Category: Lab Supplies</div>
                </div>
                <span className="navbar__search-results-item__badge">Item</span>
              </div>
              <div className="navbar__search-results-item">
                <i className="bi bi-receipt" aria-hidden="true"></i>
                <div className="navbar__search-results-item__content">
                  <div className="navbar__search-results-item__title">REC-2024-001</div>
                  <div className="navbar__search-results-item__subtitle">Stock Receipt</div>
                </div>
                <span className="navbar__search-results-item__badge">Receipt</span>
              </div>
              <div className="navbar__search-results-empty">
                <i className="bi bi-inbox" aria-hidden="true"></i>
                No results found
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="navbar__right">
        <button className="navbar__icon-btn" aria-label="Messages">
          <i className="bi bi-envelope" aria-hidden="true"></i>
          <span className="navbar__badge">3</span>
        </button>

        <button className="navbar__icon-btn" aria-label="Notifications">
          <i className="bi bi-bell" aria-hidden="true"></i>
          <span className="navbar__badge">5</span>
        </button>

        <button 
          className="navbar__theme-btn" 
          onClick={onThemeToggle}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          <i className={`bi ${isDark ? "bi-sun" : "bi-moon"}`} aria-hidden="true"></i>
        </button>

        <div className="navbar__user" onClick={() => setMenuOpen((open) => !open)}>
          <span className="navbar__avatar">{initials}</span>
          <span className="navbar__username">{user?.username || "Guest"}</span>

          {menuOpen && (
            <div className="navbar__dropdown">
              <div className="navbar__dropdown-header">
                <div className="navbar__dropdown-user">{user?.full_name || user?.username || "Guest"}</div>
                <div className="navbar__dropdown-email">{user?.email || "user@example.com"}</div>
              </div>
              <button onClick={() => navigate("/profile")}>
                <i className="bi bi-person" aria-hidden="true"></i>
                Profile
              </button>
              <button onClick={() => navigate("/settings")}>
                <i className="bi bi-gear" aria-hidden="true"></i>
                Settings
              </button>
              <div className="navbar__dropdown-divider"></div>
              <button className="navbar__dropdown-danger" onClick={handleLogout}>
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