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
  const [showPassword, setShowPassword] = useState(false);

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
        {/* Logo */}
        <div className="login-logo">
          <img src="/logo.png" alt="Lab Inventory System Logo" />
        </div>

        {/* Brand name */}
        <h1>Lab Inventory System</h1>

        {/* Username field */}
        <label>
          <span className="label-with-icon">
            <i className="bi bi-person" aria-hidden="true"></i>
            Username
          </span>
          <div className="input-wrapper">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>
        </label>

        {/* Password field with toggle */}
        <label>
          <span className="label-with-icon">
            <i className="bi bi-lock" aria-hidden="true"></i>
            Password
          </span>
          <div className="input-wrapper input-wrapper--password">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
            </button>
          </div>
        </label>

        {/* Submit button */}
        <button type="submit" disabled={submitting} className="login-submit">
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Signing in...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
              Sign in
            </>
          )}
        </button>

        {/* Footer hint */}
        <p className="login-hint">
          <i className="bi bi-info-circle" aria-hidden="true"></i>
          Demo: any username / password
        </p>
      </form>
    </div>
  );
}