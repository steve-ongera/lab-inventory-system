import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import DashboardLayout from "./layout/DashboardLayout.jsx";
import CurrentStock from "./pages/CurrentStock.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DispensingLog from "./pages/DispensingLog.jsx";
import ExpiryWatch from "./pages/ExpiryWatch.jsx";
import ItemMaster from "./pages/ItemMaster.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import StockReceipts from "./pages/StockReceipts.jsx";
import Users from "./pages/Users.jsx";
import useAuth from "./hooks/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="page-loading">Loading…</p>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="items" element={<ItemMaster />} />
        <Route path="stock-receipts" element={<StockReceipts />} />
        <Route path="dispensing-log" element={<DispensingLog />} />
        <Route path="current-stock" element={<CurrentStock />} />
        <Route path="expiry-watch" element={<ExpiryWatch />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
