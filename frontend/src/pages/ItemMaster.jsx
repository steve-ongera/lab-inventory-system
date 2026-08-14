import { useEffect, useState } from "react";

import { itemsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function ItemMaster() {
  const [items, setItems] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    itemsAPI
      .list()
      .then(({ data }) => setItems(data.results || data))
      .catch(() => notifyError("Could not load items."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Item Master</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Min. Stock</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item_code}>
              <td>{item.item_code}</td>
              <td>{item.item_name}</td>
              <td>{item.category_name}</td>
              <td>{item.unit_name}</td>
              <td>{item.minimum_stock_level}</td>
              <td>{item.is_active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
