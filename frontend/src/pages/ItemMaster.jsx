import { useEffect, useState } from "react";
import { itemsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function ItemMaster() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    itemsAPI
      .list()
      .then(({ data }) => {
        const itemList = data.results || data;
        setItems(itemList);
        setFilteredItems(itemList);
        // Extract unique categories
        const uniqueCategories = [...new Set(itemList.map(item => item.category_name).filter(Boolean))];
        setCategories(uniqueCategories);
      })
      .catch(() => notifyError("Could not load items."));
  }, [notifyError]);

  // Filter items when search or filters change
  useEffect(() => {
    let result = items;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        item.item_code?.toLowerCase().includes(term) ||
        item.item_name?.toLowerCase().includes(term) ||
        item.category_name?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(item => item.category_name === categoryFilter);
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter(item => item.is_active);
    } else if (statusFilter === "inactive") {
      result = result.filter(item => !item.is_active);
    }

    setFilteredItems(result);
  }, [searchTerm, categoryFilter, statusFilter, items]);

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-box-seam"></i>
        </div>
        <div>
          <h1>Item Master</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredItems.length} items {filteredItems.length !== items.length && `(filtered from ${items.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Add new item">
            <i className="bi bi-plus-lg" aria-hidden="true"></i>
            Add Item
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
              aria-label="Search items"
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
                <i className="bi bi-toggle-on" aria-hidden="true"></i>
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        {filteredItems.length === 0 && (
          <div className="filter-bar__empty">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            No items match your filters
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <i className="bi bi-hash" aria-hidden="true"></i>
                  Code
                </th>
                <th>
                  <i className="bi bi-tag" aria-hidden="true"></i>
                  Name
                </th>
                <th>
                  <i className="bi bi-tags" aria-hidden="true"></i>
                  Category
                </th>
                <th>
                  <i className="bi bi-rulers" aria-hidden="true"></i>
                  Unit
                </th>
                <th>
                  <i className="bi bi-flag" aria-hidden="true"></i>
                  Min. Stock
                </th>
                <th>
                  <i className="bi bi-circle" aria-hidden="true"></i>
                  Status
                </th>
                <th className="table-actions">
                  <i className="bi bi-three-dots" aria-hidden="true"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.item_code}>
                  <td className="data-value">{item.item_code}</td>
                  <td>
                    <span className="item-name">{item.item_name}</span>
                  </td>
                  <td>
                    <span className="category-badge">{item.category_name || "Uncategorized"}</span>
                  </td>
                  <td className="data-value">{item.unit_name || "N/A"}</td>
                  <td className="data-value">{item.minimum_stock_level}</td>
                  <td>
                    <span className={`status-badge status-badge--${item.is_active ? "active" : "inactive"}`}>
                      <span className="status-dot" aria-hidden="true"></span>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="action-btn" aria-label={`Edit ${item.item_name}`}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="action-btn action-btn--danger" aria-label={`Delete ${item.item_name}`}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && items.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No items match your filters. Try adjusting your search criteria.
          </div>
        )}
        {items.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-box" aria-hidden="true"></i>
            <p>No items found in inventory</p>
            <button className="btn btn--primary btn--sm">
              <i className="bi bi-plus-lg" aria-hidden="true"></i>
              Add your first item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}