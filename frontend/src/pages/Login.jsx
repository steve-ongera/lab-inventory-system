import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import useNotification from "../hooks/useNotification";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const { notifyError, notifySuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      notifySuccess("Welcome back!");
      navigate("/");
    } catch (err) {
      notifyError("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Lab Inventory System</h1>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
