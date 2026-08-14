import { useEffect, useState } from "react";

import { dispensingAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function DispensingLog() {
  const [dispenses, setDispenses] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    dispensingAPI
      .list()
      .then(({ data }) => setDispenses(data.results || data))
      .catch(() => notifyError("Could not load dispensing log."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Dispensing Log</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Dispense ID</th>
            <th>Date</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Department</th>
            <th>Dispensed By</th>
          </tr>
        </thead>
        <tbody>
          {dispenses.map((d) => (
            <tr key={d.dispense_id}>
              <td>{d.dispense_id}</td>
              <td>{d.date}</td>
              <td>{d.item_name}</td>
              <td>{d.quantity_dispensed}</td>
              <td>{d.recipient_department}</td>
              <td>{d.dispensed_by_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
