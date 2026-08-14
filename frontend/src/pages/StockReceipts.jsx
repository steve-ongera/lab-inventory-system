import { useEffect, useState } from "react";
import { stockReceiptsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function StockReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const { notifyError } = useNotification();

  useEffect(() => {
    stockReceiptsAPI
      .list()
      .then(({ data }) => {
        const receiptList = data.results || data;
        setReceipts(receiptList);
        setFilteredReceipts(receiptList);
      })
      .catch(() => notifyError("Could not load stock receipts."));
  }, [notifyError]);

  // Filter and search
  useEffect(() => {
    let result = receipts;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.receipt_id?.toLowerCase().includes(term) ||
          r.item_name?.toLowerCase().includes(term) ||
          r.batch_lot?.toLowerCase().includes(term) ||
          r.received_by_name?.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      if (dateFilter === "today") {
        // Keep today's date
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      } else if (dateFilter === "quarter") {
        filterDate.setMonth(now.getMonth() - 3);
      }
      result = result.filter((r) => new Date(r.date) >= filterDate);
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

    setFilteredReceipts(result);
  }, [searchTerm, dateFilter, sortConfig, receipts]);

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
          <i className="bi bi-archive"></i>
        </div>
        <div>
          <h1>Stock Receipts</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredReceipts.length} receipts{" "}
            {filteredReceipts.length !== receipts.length &&
              `(filtered from ${receipts.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Record new receipt">
            <i className="bi bi-plus-lg" aria-hidden="true"></i>
            New Receipt
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
              placeholder="Search by ID, item, batch, or receiver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search receipts"
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

      {/* Receipts Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table data-table--sortable">
            <thead>
              <tr>
                <th onClick={() => handleSort("receipt_id")} className="sortable">
                  <i className="bi bi-receipt" aria-hidden="true"></i>
                  Receipt ID
                  {getSortIcon("receipt_id")}
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
                <th onClick={() => handleSort("batch_lot")} className="sortable">
                  <i className="bi bi-upc-scan" aria-hidden="true"></i>
                  Batch/Lot
                  {getSortIcon("batch_lot")}
                </th>
                <th onClick={() => handleSort("quantity_received")} className="sortable">
                  <i className="bi bi-hash" aria-hidden="true"></i>
                  Qty Received
                  {getSortIcon("quantity_received")}
                </th>
                <th onClick={() => handleSort("received_by_name")} className="sortable">
                  <i className="bi bi-person" aria-hidden="true"></i>
                  Received By
                  {getSortIcon("received_by_name")}
                </th>
                <th className="table-actions">
                  <i className="bi bi-three-dots" aria-hidden="true"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r) => (
                <tr key={r.receipt_id}>
                  <td className="data-value">
                    <span className="receipt-id">{r.receipt_id}</span>
                  </td>
                  <td className="data-value">{formatDate(r.date)}</td>
                  <td>
                    <span className="item-name">{r.item_name}</span>
                  </td>
                  <td>
                    <span className="batch-badge">{r.batch_lot || "N/A"}</span>
                  </td>
                  <td className="data-value receipt-qty">
                    <i className="bi bi-arrow-down-circle" aria-hidden="true"></i>
                    {r.quantity_received}
                  </td>
                  <td>
                    <span className="receiver-name">
                      <i className="bi bi-person-circle" aria-hidden="true"></i>
                      {r.received_by_name}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="action-btn" aria-label={`View receipt ${r.receipt_id}`}>
                      <i className="bi bi-eye"></i>
                    </button>
                    <button className="action-btn action-btn--danger" aria-label={`Delete receipt ${r.receipt_id}`}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredReceipts.length === 0 && receipts.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No receipts match your filters. Try adjusting your search criteria.
          </div>
        )}
        {receipts.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-archive" aria-hidden="true"></i>
            <p>No stock receipts recorded</p>
            <button className="btn btn--primary btn--sm">
              <i className="bi bi-plus-lg" aria-hidden="true"></i>
              Record your first receipt
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {filteredReceipts.length > 0 && (
        <div className="receipt-summary">
          <div className="receipt-summary__item">
            <span className="receipt-summary__label">
              <i className="bi bi-receipt" aria-hidden="true"></i>
              Total Receipts
            </span>
            <span className="receipt-summary__value">{filteredReceipts.length}</span>
          </div>
          <div className="receipt-summary__item">
            <span className="receipt-summary__label">
              <i className="bi bi-boxes" aria-hidden="true"></i>
              Total Items Received
            </span>
            <span className="receipt-summary__value">
              {filteredReceipts.reduce((sum, r) => sum + (r.quantity_received || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="receipt-summary__item">
            <span className="receipt-summary__label">
              <i className="bi bi-person" aria-hidden="true"></i>
              Unique Receivers
            </span>
            <span className="receipt-summary__value">
              {new Set(filteredReceipts.map((r) => r.received_by_name).filter(Boolean)).size}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}