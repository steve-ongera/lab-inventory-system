import { useEffect, useState } from "react";

import StockStatusBadge from "../components/StockStatusBadge.jsx";
import { currentStockAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function CurrentStock() {
  const [rows, setRows] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    currentStockAPI
      .list()
      .then(({ data }) => setRows(data))
      .catch(() => notifyError("Could not load current stock."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Current Stock</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Available</th>
            <th>Minimum</th>
            <th>Status</th>
            <th>Earliest Expiry</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.item_code}>
              <td>{row.item_name} ({row.item_code})</td>
              <td>{row.category}</td>
              <td>{row.available_quantity}</td>
              <td>{row.minimum_stock_level}</td>
              <td><StockStatusBadge status={row.stock_status} /></td>
              <td>{row.earliest_expiry || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
