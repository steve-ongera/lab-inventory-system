import { useEffect, useState } from "react";

import { usersAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function Users() {
  const [staff, setStaff] = useState([]);
  const { notifyError } = useNotification();

  useEffect(() => {
    usersAPI
      .list()
      .then(({ data }) => setStaff(data.results || data))
      .catch(() => notifyError("Could not load users."));
  }, [notifyError]);

  return (
    <div className="page">
      <h1>Users</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Staff ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Department</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.staff_id}>
              <td>{s.staff_id}</td>
              <td>{s.full_name}</td>
              <td>{s.role}</td>
              <td>{s.department}</td>
              <td>{s.is_active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
