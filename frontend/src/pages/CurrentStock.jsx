import { useEffect, useState } from "react";
import StockStatusBadge from "../components/StockStatusBadge.jsx";
import { currentStockAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function CurrentStock() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const { notifyError } = useNotification();

  useEffect(() => {
    currentStockAPI
      .list()
      .then(({ data }) => {
        const stockList = data.results || data;
        setRows(stockList);
        setFilteredRows(stockList);
        // Extract unique categories
        const uniqueCategories = [...new Set(stockList.map(item => item.category).filter(Boolean))];
        setCategories(uniqueCategories);
      })
      .catch(() => notifyError("Could not load current stock."));
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
          row.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(row => row.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(row => row.stock_status === statusFilter);
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
  }, [searchTerm, categoryFilter, statusFilter, sortConfig, rows]);

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
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-clipboard-data"></i>
        </div>
        <div>
          <h1>Current Stock</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredRows.length} items in stock{" "}
            {filteredRows.length !== rows.length &&
              `(filtered from ${rows.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Export stock data">
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
              placeholder="Search by code, name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search stock items"
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
              <label htmlFor="category-filter">
                <i className="bi bi-tags" aria-hidden="true"></i>
                Category
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">
                <i className="bi bi-circle" aria-hidden="true"></i>
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
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
                <th onClick={() => handleSort("category")} className="sortable">
                  <i className="bi bi-tags" aria-hidden="true"></i>
                  Category
                  {getSortIcon("category")}
                </th>
                <th onClick={() => handleSort("available_quantity")} className="sortable">
                  <i className="bi bi-boxes" aria-hidden="true"></i>
                  Available
                  {getSortIcon("available_quantity")}
                </th>
                <th onClick={() => handleSort("minimum_stock_level")} className="sortable">
                  <i className="bi bi-flag" aria-hidden="true"></i>
                  Minimum
                  {getSortIcon("minimum_stock_level")}
                </th>
                <th onClick={() => handleSort("stock_status")} className="sortable">
                  <i className="bi bi-circle" aria-hidden="true"></i>
                  Status
                  {getSortIcon("stock_status")}
                </th>
                <th onClick={() => handleSort("earliest_expiry")} className="sortable">
                  <i className="bi bi-calendar-exclamation" aria-hidden="true"></i>
                  Earliest Expiry
                  {getSortIcon("earliest_expiry")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.item_code}>
                  <td>
                    <span className="item-name">{row.item_name}</span>
                    <span className="item-code">{row.item_code}</span>
                  </td>
                  <td>
                    <span className="category-badge">{row.category || "Uncategorized"}</span>
                  </td>
                  <td className="data-value stock-qty">
                    <span className={`stock-qty__value stock-qty__value--${row.stock_status}`}>
                      {row.available_quantity}
                    </span>
                  </td>
                  <td className="data-value">{row.minimum_stock_level}</td>
                  <td><StockStatusBadge status={row.stock_status} /></td>
                  <td>
                    {row.earliest_expiry ? (
                      <span className={`expiry-date ${isExpiringSoon(row.earliest_expiry) ? 'expiry-date--warning' : ''}`}>
                        {isExpiringSoon(row.earliest_expiry) && (
                          <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
                        )}
                        {formatDate(row.earliest_expiry)}
                      </span>
                    ) : (
                      <span className="expiry-date expiry-date--none">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 && rows.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No items match your filters. Try adjusting your search criteria.
          </div>
        )}
        {rows.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-clipboard-data" aria-hidden="true"></i>
            <p>No stock items found</p>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {filteredRows.length > 0 && (
        <div className="stock-summary">
          <div className="stock-summary__item">
            <span className="stock-summary__label">
              <i className="bi bi-boxes" aria-hidden="true"></i>
              Total Items
            </span>
            <span className="stock-summary__value">{filteredRows.length}</span>
          </div>
          <div className="stock-summary__item">
            <span className="stock-summary__label">
              <i className="bi bi-box" aria-hidden="true"></i>
              Total Units
            </span>
            <span className="stock-summary__value">
              {filteredRows.reduce((sum, row) => sum + (row.available_quantity || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="stock-summary__item stock-summary__item--warning">
            <span className="stock-summary__label">
              <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
              Low Stock
            </span>
            <span className="stock-summary__value">
              {filteredRows.filter(row => row.stock_status === "low_stock").length}
            </span>
          </div>
          <div className="stock-summary__item stock-summary__item--danger">
            <span className="stock-summary__label">
              <i className="bi bi-x-circle" aria-hidden="true"></i>
              Out of Stock
            </span>
            <span className="stock-summary__value">
              {filteredRows.filter(row => row.stock_status === "out_of_stock").length}
            </span>
          </div>
          <div className="stock-summary__item">
            <span className="stock-summary__label">
              <i className="bi bi-calendar-exclamation" aria-hidden="true"></i>
              Expiring Soon (30d)
            </span>
            <span className="stock-summary__value">
              {filteredRows.filter(row => isExpiringSoon(row.earliest_expiry)).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}