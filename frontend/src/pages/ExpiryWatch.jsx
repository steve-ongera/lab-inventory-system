import { useEffect, useState } from "react";
import { reportsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function ExpiryWatch() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "days_remaining", direction: "asc" });
  const { notifyError } = useNotification();

  useEffect(() => {
    reportsAPI
      .expiryWatch()
      .then(({ data }) => {
        const expiryList = data.results || data;
        setRows(expiryList);
        setFilteredRows(expiryList);
      })
      .catch(() => notifyError("Could not load expiry watch report."));
  }, [notifyError]);

  // Filter and search
  useEffect(() => {
    let result = rows;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (row) =>
          row.item_code?.toLowerCase().includes(term) ||
          row.item_name?.toLowerCase().includes(term) ||
          row.batch_lot?.toLowerCase().includes(term)
      );
    }

    // Expiry filter
    if (expiryFilter !== "all") {
      const now = new Date();
      result = result.filter((row) => {
        const expiry = new Date(row.expiry_date);
        const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        if (expiryFilter === "expired") return daysRemaining < 0;
        if (expiryFilter === "30") return daysRemaining >= 0 && daysRemaining <= 30;
        if (expiryFilter === "60") return daysRemaining >= 31 && daysRemaining <= 60;
        if (expiryFilter === "90") return daysRemaining >= 61 && daysRemaining <= 90;
        return true;
      });
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

    setFilteredRows(result);
  }, [searchTerm, expiryFilter, sortConfig, rows]);

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

  const getExpiryStatus = (daysRemaining) => {
    if (daysRemaining < 0) return { label: "Expired", className: "expiry-status--expired" };
    if (daysRemaining <= 7) return { label: "Critical", className: "expiry-status--critical" };
    if (daysRemaining <= 30) return { label: "Warning", className: "expiry-status--warning" };
    if (daysRemaining <= 60) return { label: "Soon", className: "expiry-status--soon" };
    return { label: "OK", className: "expiry-status--ok" };
  };

  const getDaysDisplay = (days) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-calendar-exclamation"></i>
        </div>
        <div>
          <h1>Expiry Watch</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredRows.length} expiry items{" "}
            {filteredRows.length !== rows.length &&
              `(filtered from ${rows.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Export expiry report">
            <i className="bi bi-download" aria-hidden="true"></i>
            Export
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
              placeholder="Search by item, code, or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search expiry items"
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
              <label htmlFor="expiry-filter">
                <i className="bi bi-clock" aria-hidden="true"></i>
                Expiry Status
              </label>
              <select
                id="expiry-filter"
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
              >
                <option value="all">All Items</option>
                <option value="expired">Expired</option>
                <option value="30">Expiring ≤ 30 days</option>
                <option value="60">Expiring 31–60 days</option>
                <option value="90">Expiring 61–90 days</option>
              </select>
            </div>
          </div>
        </div>
        {filteredRows.length === 0 && rows.length > 0 && (
          <div className="filter-bar__empty">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            No expiry items match your filters
          </div>
        )}
      </div>

      {/* Expiry Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table data-table--sortable">
            <thead>
              <tr>
                <th onClick={() => handleSort("item_name")} className="sortable">
                  <i className="bi bi-box" aria-hidden="true"></i>
                  Item
                  {getSortIcon("item_name")}
                </th>
                <th onClick={() => handleSort("batch_lot")} className="sortable">
                  <i className="bi bi-upc-scan" aria-hidden="true"></i>
                  Batch/Lot
                  {getSortIcon("batch_lot")}
                </th>
                <th onClick={() => handleSort("expiry_date")} className="sortable">
                  <i className="bi bi-calendar" aria-hidden="true"></i>
                  Expiry Date
                  {getSortIcon("expiry_date")}
                </th>
                <th onClick={() => handleSort("days_remaining")} className="sortable">
                  <i className="bi bi-hourglass-split" aria-hidden="true"></i>
                  Days Remaining
                  {getSortIcon("days_remaining")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const status = getExpiryStatus(row.days_remaining);
                return (
                  <tr key={`${row.item_code}-${row.batch_lot}`} className={status.className}>
                    <td>
                      <span className="item-name">{row.item_name}</span>
                      <span className="item-code">{row.item_code}</span>
                    </td>
                    <td>
                      <span className="batch-badge">{row.batch_lot || "N/A"}</span>
                    </td>
                    <td className="data-value">{formatDate(row.expiry_date)}</td>
                    <td>
                      <span className={`expiry-days ${status.className}`}>
                        <span className="expiry-days__status" aria-hidden="true">
                          {status.label}
                        </span>
                        <span className="expiry-days__value">
                          {getDaysDisplay(row.days_remaining)}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 && rows.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No expiry items match your filters. Try adjusting your search criteria.
          </div>
        )}
        {rows.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-calendar-check" aria-hidden="true"></i>
            <p>No expiry data available</p>
            <p className="empty-state__sub">All items are either non-expiry or not tracked yet</p>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {filteredRows.length > 0 && (
        <div className="expiry-summary">
          <div className="expiry-summary__item">
            <span className="expiry-summary__label">
              <i className="bi bi-boxes" aria-hidden="true"></i>
              Total Items
            </span>
            <span className="expiry-summary__value">{filteredRows.length}</span>
          </div>
          <div className="expiry-summary__item expiry-summary__item--danger">
            <span className="expiry-summary__label">
              <i className="bi bi-x-circle" aria-hidden="true"></i>
              Expired
            </span>
            <span className="expiry-summary__value">
              {filteredRows.filter(row => row.days_remaining < 0).length}
            </span>
          </div>
          <div className="expiry-summary__item expiry-summary__item--critical">
            <span className="expiry-summary__label">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
              Critical (≤ 7 days)
            </span>
            <span className="expiry-summary__value">
              {filteredRows.filter(row => row.days_remaining >= 0 && row.days_remaining <= 7).length}
            </span>
          </div>
          <div className="expiry-summary__item expiry-summary__item--warning">
            <span className="expiry-summary__label">
              <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
              Warning (≤ 30 days)
            </span>
            <span className="expiry-summary__value">
              {filteredRows.filter(row => row.days_remaining >= 8 && row.days_remaining <= 30).length}
            </span>
          </div>
          <div className="expiry-summary__item expiry-summary__item--soon">
            <span className="expiry-summary__label">
              <i className="bi bi-clock" aria-hidden="true"></i>
              Soon (≤ 60 days)
            </span>
            <span className="expiry-summary__value">
              {filteredRows.filter(row => row.days_remaining >= 31 && row.days_remaining <= 60).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}