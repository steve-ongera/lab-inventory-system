import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "bi-bar-chart-line", end: true },
  { to: "/items", label: "Item Master", icon: "bi-flask" },
  { to: "/stock-receipts", label: "Stock Receipts", icon: "bi-box-arrow-in-down" },
  { to: "/dispensing-log", label: "Dispensing Log", icon: "bi-box-arrow-up" },
  { to: "/current-stock", label: "Current Stock", icon: "bi-boxes" },
  { to: "/expiry-watch", label: "Expiry Watch", icon: "bi-hourglass-split" },
  { to: "/reports", label: "Reports", icon: "bi-file-earmark-text" },
  { to: "/users", label: "Users", icon: "bi-people" },
  { to: "/settings", label: "Settings", icon: "bi-gear" },
];

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--collapsed"}`}>
      {/* Sidebar Header with Logo */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <img src="/logo.png" alt="LMIS Logo" />
        </div>
        <div className="sidebar__brand">
          <span className="sidebar__brand-name">LMIS</span>
          <span className="sidebar__brand-sub">Lab Inventory System</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
          >
            <span className="sidebar__icon">
              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
            </span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__footer-divider"></div>
        <div className="sidebar__footer-content">
          <span className="sidebar__footer-version">
            <i className="bi bi-tag" aria-hidden="true"></i>
            LMIS v2.1
          </span>
          <span className="sidebar__footer-copy">
            <i className="bi bi-circle" aria-hidden="true"></i>
            {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </aside>
  );
}