import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/items", label: "Item Master", icon: "🧪" },
  { to: "/stock-receipts", label: "Stock Receipts", icon: "📥" },
  { to: "/dispensing-log", label: "Dispensing Log", icon: "📤" },
  { to: "/current-stock", label: "Current Stock", icon: "📦" },
  { to: "/expiry-watch", label: "Expiry Watch", icon: "⏳" },
  { to: "/reports", label: "Reports", icon: "📄" },
  { to: "/users", label: "Users", icon: "👥" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--collapsed"}`}>
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
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
