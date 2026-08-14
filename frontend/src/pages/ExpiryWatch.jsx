import { useEffect, useState } from "react";

import { reportsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function ExpiryWatch() {
  const [rows, setRows] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    reportsAPI
      .expiryWatch()
      .then(({ data }) => setRows(data))
      .catch(() => notifyError("Could not load expiry watch report."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Expiry Watch</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Batch/Lot</th>
            <th>Expiry Date</th>
            <th>Days Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.item_code}-${row.batch_lot}`}>
              <td>{row.item_name} ({row.item_code})</td>
              <td>{row.batch_lot}</td>
              <td>{row.expiry_date}</td>
              <td>{row.days_remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
