import { useEffect, useState } from "react";

import CategoryBarChart from "../components/CategoryBarChart.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusPieChart from "../components/StatusPieChart.jsx";
import StockStatusBadge from "../components/StockStatusBadge.jsx";
import TrendLineChart from "../components/TrendLineChart.jsx";
import { dashboardAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { notifyError } = useNotification();

  useEffect(() => {
    dashboardAPI
      .get()
      .then(({ data }) => setData(data))
      .catch(() => notifyError("Could not load dashboard data."));
  }, [notifyError]);

  if (!data) return <p className="page-loading">Loading dashboard…</p>;

  const { kpis, reorder_watchlist, recent_dispensing, monthly_trend, category_summary, status_summary } = data;

  return (
    <div className="page">
      {/* Page header with icon */}
      <div className="page-header">
        <div className="page-header__icon" aria-hidden="true">
          <i className="bi bi-speedometer2"></i>
        </div>
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Real-time inventory overview and key metrics</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-grid">
        <StatCard 
          label="Active Items" 
          value={kpis.total_active_items} 
          icon="bi-box"
        />
        <StatCard 
          label="Low Stock" 
          value={kpis.low_stock_items} 
          tone="warning" 
          icon="bi-exclamation-triangle"
        />
        <StatCard 
          label="Out of Stock" 
          value={kpis.out_of_stock_items} 
          tone="danger" 
          icon="bi-x-circle"
        />
        <StatCard 
          label="Dispenses (30d)" 
          value={kpis.recent_transactions_30_days} 
          icon="bi-activity"
        />
      </div>

      {/* Charts Grid */}
      <div className="chart-grid">
        <section className="panel chart-panel chart-panel--wide">
          <div className="panel-header">
            <div className="panel-header__icon" aria-hidden="true">
              <i className="bi bi-graph-up-arrow"></i>
            </div>
            <h2>Stock Movement — Last 4 Months</h2>
          </div>
          <TrendLineChart data={monthly_trend} />
        </section>

        <section className="panel chart-panel">
          <div className="panel-header">
            <div className="panel-header__icon" aria-hidden="true">
              <i className="bi bi-pie-chart"></i>
            </div>
            <h2>Stock Status Distribution</h2>
          </div>
          <StatusPieChart data={status_summary} />
        </section>
      </div>

      {/* Category Chart */}
      <section className="panel chart-panel">
        <div className="panel-header">
          <div className="panel-header__icon" aria-hidden="true">
            <i className="bi bi-bar-chart"></i>
          </div>
          <h2>Received vs. Dispensed by Category</h2>
        </div>
        <CategoryBarChart data={category_summary} />
      </section>

      {/* Reorder Watchlist */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-header__icon" aria-hidden="true">
            <i className="bi bi-list-check"></i>
          </div>
          <h2>Reorder Watchlist</h2>
          <span className="panel-badge">
            <i className="bi bi-bell" aria-hidden="true"></i>
            {reorder_watchlist.length} items need attention
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <i className="bi bi-tag" aria-hidden="true"></i>
                  Item
                </th>
                <th>
                  <i className="bi bi-box-seam" aria-hidden="true"></i>
                  Available
                </th>
                <th>
                  <i className="bi bi-flag" aria-hidden="true"></i>
                  Minimum
                </th>
                <th>
                  <i className="bi bi-circle" aria-hidden="true"></i>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {reorder_watchlist.map((row) => (
                <tr key={row.item_code}>
                  <td>
                    <span className="item-name">{row.item_name}</span>
                    <span className="item-code">{row.item_code}</span>
                  </td>
                  <td className="data-value">{row.available}</td>
                  <td className="data-value">{row.minimum}</td>
                  <td><StockStatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reorder_watchlist.length === 0 && (
          <p className="empty-state">
            <i className="bi bi-check-circle" aria-hidden="true"></i>
            All items are adequately stocked
          </p>
        )}
      </section>

      {/* Recent Dispensing */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-header__icon" aria-hidden="true">
            <i className="bi bi-clock-history"></i>
          </div>
          <h2>Recent Dispensing</h2>
          <span className="panel-badge panel-badge--secondary">
            <i className="bi bi-arrow-right" aria-hidden="true"></i>
            Last {recent_dispensing.length} transactions
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <i className="bi bi-calendar" aria-hidden="true"></i>
                  Date
                </th>
                <th>
                  <i className="bi bi-box" aria-hidden="true"></i>
                  Item
                </th>
                <th>
                  <i className="bi bi-hash" aria-hidden="true"></i>
                  Qty
                </th>
                <th>
                  <i className="bi bi-building" aria-hidden="true"></i>
                  Department
                </th>
              </tr>
            </thead>
            <tbody>
              {recent_dispensing.map((row) => (
                <tr key={row.dispense_id}>
                  <td className="data-value">{row.date}</td>
                  <td>
                    <span className="item-name">{row.item__item_name}</span>
                    <span className="item-code">{row.item__item_code}</span>
                  </td>
                  <td className="data-value">{row.quantity_dispensed}</td>
                  <td>
                    <span className="department-badge">{row.recipient_department}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recent_dispensing.length === 0 && (
          <p className="empty-state">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            No dispensing records found
          </p>
        )}
      </section>
    </div>
  );
}