import { useEffect, useState } from "react";

import { stockReceiptsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function StockReceipts() {
  const [receipts, setReceipts] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    stockReceiptsAPI
      .list()
      .then(({ data }) => setReceipts(data.results || data))
      .catch(() => notifyError("Could not load stock receipts."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Stock Receipts</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Receipt ID</th>
            <th>Date</th>
            <th>Item</th>
            <th>Batch/Lot</th>
            <th>Qty Received</th>
            <th>Received By</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr key={r.receipt_id}>
              <td>{r.receipt_id}</td>
              <td>{r.date}</td>
              <td>{r.item_name}</td>
              <td>{r.batch_lot}</td>
              <td>{r.quantity_received}</td>
              <td>{r.received_by_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
