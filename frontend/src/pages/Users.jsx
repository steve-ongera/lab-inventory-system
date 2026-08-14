import { useEffect, useState } from "react";
import { usersAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function Users() {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roles, setRoles] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const { notifyError } = useNotification();

  useEffect(() => {
    usersAPI
      .list()
      .then(({ data }) => {
        const userList = data.results || data;
        setStaff(userList);
        setFilteredStaff(userList);
        // Extract unique roles
        const uniqueRoles = [...new Set(userList.map(user => user.role).filter(Boolean))];
        setRoles(uniqueRoles);
      })
      .catch(() => notifyError("Could not load users."));
  }, [notifyError]);

  // Filter and search
  useEffect(() => {
    let result = staff;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (user) =>
          user.staff_id?.toLowerCase().includes(term) ||
          user.full_name?.toLowerCase().includes(term) ||
          user.department?.toLowerCase().includes(term) ||
          user.role?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter(user => user.is_active);
    } else if (statusFilter === "inactive") {
      result = result.filter(user => !user.is_active);
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] || "";
        let bVal = b[sortConfig.key] || "";
        if (typeof aVal === "boolean") {
          return sortConfig.direction === "asc" 
            ? (aVal === bVal ? 0 : aVal ? 1 : -1)
            : (aVal === bVal ? 0 : aVal ? -1 : 1);
        }
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

    setFilteredStaff(result);
  }, [searchTerm, roleFilter, statusFilter, sortConfig, staff]);

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

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      'admin': 'role-badge--admin',
      'manager': 'role-badge--manager',
      'pharmacist': 'role-badge--pharmacist',
      'technician': 'role-badge--technician',
      'nurse': 'role-badge--nurse',
      'doctor': 'role-badge--doctor',
    };
    return roleMap[role?.toLowerCase()] || 'role-badge--default';
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-people"></i>
        </div>
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">
            <i className="bi bi-database" aria-hidden="true"></i>
            {filteredStaff.length} users{" "}
            {filteredStaff.length !== staff.length &&
              `(filtered from ${staff.length})`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" aria-label="Add new user">
            <i className="bi bi-person-plus" aria-hidden="true"></i>
            Add User
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
              placeholder="Search by ID, name, role, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search users"
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
              <label htmlFor="role-filter">
                <i className="bi bi-person-badge" aria-hidden="true"></i>
                Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
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
      </div>

      {/* Users Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table data-table--sortable">
            <thead>
              <tr>
                <th onClick={() => handleSort("staff_id")} className="sortable">
                  <i className="bi bi-person-vcard" aria-hidden="true"></i>
                  Staff ID
                  {getSortIcon("staff_id")}
                </th>
                <th onClick={() => handleSort("full_name")} className="sortable">
                  <i className="bi bi-person" aria-hidden="true"></i>
                  Name
                  {getSortIcon("full_name")}
                </th>
                <th onClick={() => handleSort("role")} className="sortable">
                  <i className="bi bi-person-badge" aria-hidden="true"></i>
                  Role
                  {getSortIcon("role")}
                </th>
                <th onClick={() => handleSort("department")} className="sortable">
                  <i className="bi bi-building" aria-hidden="true"></i>
                  Department
                  {getSortIcon("department")}
                </th>
                <th onClick={() => handleSort("is_active")} className="sortable">
                  <i className="bi bi-circle" aria-hidden="true"></i>
                  Status
                  {getSortIcon("is_active")}
                </th>
                <th className="table-actions">
                  <i className="bi bi-three-dots" aria-hidden="true"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((user) => (
                <tr key={user.staff_id}>
                  <td className="data-value">
                    <span className="staff-id">{user.staff_id}</span>
                  </td>
                  <td>
                    <div className="user-info">
                      <span className="user-avatar" aria-hidden="true">
                        {getInitials(user.full_name)}
                      </span>
                      <span className="user-name">{user.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {user.role || "N/A"}
                    </span>
                  </td>
                  <td>
                    <span className="department-badge">{user.department || "N/A"}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${user.is_active ? "active" : "inactive"}`}>
                      <span className="status-dot" aria-hidden="true"></span>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="action-btn" aria-label={`Edit ${user.full_name}`}>
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      className={`action-btn ${user.is_active ? 'action-btn--danger' : 'action-btn--success'}`} 
                      aria-label={user.is_active ? `Deactivate ${user.full_name}` : `Activate ${user.full_name}`}
                    >
                      <i className={`bi ${user.is_active ? 'bi-person-x' : 'bi-person-check'}`}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStaff.length === 0 && staff.length > 0 && (
          <div className="empty-state">
            <i className="bi bi-search" aria-hidden="true"></i>
            No users match your filters. Try adjusting your search criteria.
          </div>
        )}
        {staff.length === 0 && (
          <div className="empty-state empty-state--large">
            <i className="bi bi-people" aria-hidden="true"></i>
            <p>No users found</p>
            <button className="btn btn--primary btn--sm">
              <i className="bi bi-person-plus" aria-hidden="true"></i>
              Add your first user
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {filteredStaff.length > 0 && (
        <div className="user-summary">
          <div className="user-summary__item">
            <span className="user-summary__label">
              <i className="bi bi-people" aria-hidden="true"></i>
              Total Users
            </span>
            <span className="user-summary__value">{filteredStaff.length}</span>
          </div>
          <div className="user-summary__item user-summary__item--active">
            <span className="user-summary__label">
              <i className="bi bi-person-check" aria-hidden="true"></i>
              Active
            </span>
            <span className="user-summary__value">
              {filteredStaff.filter(user => user.is_active).length}
            </span>
          </div>
          <div className="user-summary__item user-summary__item--inactive">
            <span className="user-summary__label">
              <i className="bi bi-person-x" aria-hidden="true"></i>
              Inactive
            </span>
            <span className="user-summary__value">
              {filteredStaff.filter(user => !user.is_active).length}
            </span>
          </div>
          <div className="user-summary__item">
            <span className="user-summary__label">
              <i className="bi bi-person-badge" aria-hidden="true"></i>
              Unique Roles
            </span>
            <span className="user-summary__value">
              {new Set(filteredStaff.map(user => user.role).filter(Boolean)).size}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}