import { useEffect, useState } from "react";
import { dispensingAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function DispensingLog() {
  const [dispenses, setDispenses] = useState([]);
  const [filteredDispenses, setFilteredDispenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const { notifyError } = useNotification();

  useEffect(() => {
    dispensingAPI
      .list()
      .then(({ data }) => {
        const dispenseList = data.results || data;
        setDispenses(dispenseList);
        setFilteredDispenses(dispenseList);
      })
      .catch(() => notifyError("Could not load dispensing log."));
  }, [notifyError]);

  // Filter and search
  useEffect(() => {
    let result = dispenses;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.dispense_id?.toLowerCase().includes(term) ||
          d.item_name?.toLowerCase().includes(term) ||
          d.recipient_department?.toLowerCase().includes(term) ||
          d.dispensed_by_name?.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
        const todayStart = filterDate.getTime();
        result = result.filter((d) => new Date(d.date).getTime() >= todayStart);
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      } else if (dateFilter === "quarter") {
        filterDate.setMonth(now.getMonth() - 3);
      }
      result = result.filter((d) => new Date(d.date) >= filterDate);
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    setFilteredDispenses(result);
  }, [searchTerm, dateFilter, sortConfig, dispenses]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-chevron-expand"></i>;
    return sortConfig.direction === "asc" 
      ? <i className="bi bi-chevron-up"></i>
      : <i className="bi bi-chevron-down"></i>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-box-arrow-right"></i>
        </div>
        <div>
          <h1>Dispensing Log</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredDispenses.length} dispenses{" "}
            {filteredDispenses.length !== dispenses.length &&
              `(filtered from ${dispenses.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Record new dispense">
            <i className="bi bi-plus-lg" aria-hidden="true"></i>
            New Dispense
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar panel">
        <div className="filter-bar__row">
          <div className="filter-bar__search">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="text"
              placeholder="Search by ID, item, department, or dispenser..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search dispenses"
            />
            {searchTerm && (
              <button
                className="filter-bar__clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
          <div className="filter-bar__filters">
            <div className="filter-group">
              <label htmlFor="date-filter">
                <i className="bi bi-calendar" aria-hidden="true"></i>
                Date Range
              </label>
              <select
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dispenses Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table data-table--sortable">
            <thead>
              <tr>
                <th onClick={() => handleSort("dispense_id")} className="sortable">
                  <i className="bi bi-receipt" aria-hidden="true"></i>
                  Dispense ID
                  {getSortIcon("dispense_id")}
                </th>
                <th onClick={() => handleSort("date")} className="sortable">
                  <i className="bi bi-calendar" aria-hidden="true"></i>
                  Date
                  {getSortIcon("date")}
                </th>
                <th onClick={() => handleSort("item_name")} className="sortable">
                  <i className="bi bi-box" aria-hidden="true"></i>
                  Item
                  {getSortIcon("item_name")}
                </th>
                <th onClick={() => handleSort("quantity_dispensed")} className="sortable">
                  <i className="bi bi-hash" aria-hidden="true"></i>
                  Qty
                  {getSortIcon("quantity_dispensed")}
                </th>
                <th onClick={() => handleSort("recipient_department")} className="sortable">
                  <i className="bi bi-building" aria-hidden="true"></i>
                  Department
                  {getSortIcon("recipient_department")}
                </th>
                <th onClick={() => handleSort("dispensed_by_name")} className="sortable">
                  <i className="bi bi-person" aria-hidden="true"></i>
                  Dispensed By
                  {getSortIcon("dispensed_by_name")}
                </th>
                <th className="table-actions">
                  <i className="bi bi-three-dots" aria-hidden="true"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDispenses.map((d) => (
                <tr key={d.dispense_id}>
                  <td className="data-value">
                    <span className="dispense-id">{d.dispense_id}</span>
                  </td>
                  <td className="data-value">{formatDate(d.date)}</td>
                  <td>
                    <span className="item-name">{d.item_name}</span>
                  </td>
                  <td className="data-value dispense-qty">
                    <i className="bi bi-arrow-up-circle" aria-hidden="true"></i>
                    {d.quantity_dispensed}
                  </td>
                  <td>
                    <span className="department-badge">{d.recipient_department}</span>
                  </td>
                  <td>
                    <span className="dispenser-name">
                      <i className="bi bi-person-circle" aria-hidden="true"></i>
                      {d.dispensed_by_name}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="action-btn" aria-label={`View dispense ${d.dispense_id}`}>
                      <i className="bi bi-eye"></i>
                    </button>
                    <button className="action-btn action-btn--danger" aria-label={`Delete dispense ${d.dispense_id}`}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDispenses.length === 0 && dispenses.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No dispenses match your filters. Try adjusting your search criteria.
          </div>
        )}
        {dispenses.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
            <p>No dispensing records found</p>
            <button className="btn btn--primary btn--sm">
              <i className="bi bi-plus-lg" aria-hidden="true"></i>
              Record your first dispense
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {filteredDispenses.length > 0 && (
        <div className="dispense-summary">
          <div className="dispense-summary__item">
            <span className="dispense-summary__label">
              <i className="bi bi-receipt" aria-hidden="true"></i>
              Total Dispenses
            </span>
            <span className="dispense-summary__value">{filteredDispenses.length}</span>
          </div>
          <div className="dispense-summary__item">
            <span className="dispense-summary__label">
              <i className="bi bi-boxes" aria-hidden="true"></i>
              Total Items Dispensed
            </span>
            <span className="dispense-summary__value">
              {filteredDispenses.reduce((sum, d) => sum + (d.quantity_dispensed || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="dispense-summary__item">
            <span className="dispense-summary__label">
              <i className="bi bi-building" aria-hidden="true"></i>
              Departments Served
            </span>
            <span className="dispense-summary__value">
              {new Set(filteredDispenses.map((d) => d.recipient_department).filter(Boolean)).size}
            </span>
          </div>
          <div className="dispense-summary__item">
            <span className="dispense-summary__label">
              <i className="bi bi-person" aria-hidden="true"></i>
              Unique Dispensers
            </span>
            <span className="dispense-summary__value">
              {new Set(filteredDispenses.map((d) => d.dispensed_by_name).filter(Boolean)).size}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
