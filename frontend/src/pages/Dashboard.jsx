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
      <h1>Dashboard</h1>

      <div className="stat-grid">
        <StatCard label="Active Items" value={kpis.total_active_items} />
        <StatCard label="Low Stock" value={kpis.low_stock_items} tone="warning" />
        <StatCard label="Out of Stock" value={kpis.out_of_stock_items} tone="danger" />
        <StatCard label="Dispenses (30d)" value={kpis.recent_transactions_30_days} />
      </div>

      <div className="chart-grid">
        <section className="panel chart-panel chart-panel--wide">
          <h2>Stock Movement — Last 4 Months</h2>
          <TrendLineChart data={monthly_trend} />
        </section>

        <section className="panel chart-panel">
          <h2>Stock Status Distribution</h2>
          <StatusPieChart data={status_summary} />
        </section>
      </div>

      <section className="panel chart-panel">
        <h2>Received vs. Dispensed by Category</h2>
        <CategoryBarChart data={category_summary} />
      </section>

      <section className="panel">
        <h2>Reorder Watchlist</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Available</th>
              <th>Minimum</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reorder_watchlist.map((row) => (
              <tr key={row.item_code}>
                <td>{row.item_name} ({row.item_code})</td>
                <td>{row.available}</td>
                <td>{row.minimum}</td>
                <td><StockStatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Recent Dispensing</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {recent_dispensing.map((row) => (
              <tr key={row.dispense_id}>
                <td>{row.date}</td>
                <td>{row.item__item_name} ({row.item__item_code})</td>
                <td>{row.quantity_dispensed}</td>
                <td>{row.recipient_department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
