import { useEffect, useState } from "react";

import { categoriesAPI, suppliersAPI, unitsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    Promise.all([categoriesAPI.list(), unitsAPI.list(), suppliersAPI.list()])
      .then(([c, u, s]) => {
        setCategories(c.data.results || c.data);
        setUnits(u.data.results || u.data);
        setSuppliers(s.data.results || s.data);
      })
      .catch(() => notifyError("Could not load settings."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="panel">
        <h2>Categories</h2>
        <ul>{categories.map((c) => <li key={c.id}>{c.name}</li>)}</ul>
      </section>

      <section className="panel">
        <h2>Units</h2>
        <ul>{units.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
      </section>

      <section className="panel">
        <h2>Suppliers</h2>
        <ul>{suppliers.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
      </section>
    </div>
  );
}
