import { createContext, useContext, useEffect, useState } from "react";

import { authAPI, tokenStorage } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A JWT-only backend has no "current user" endpoint wired up yet;
    // if a token exists we optimistically treat the session as active.
    const token = tokenStorage.getAccess();
    if (token) {
      const cachedUser = localStorage.getItem("lab_user");
      if (cachedUser) setUser(JSON.parse(cachedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await authAPI.login(username, password);
    tokenStorage.set(data.access, data.refresh);
    const loggedInUser = { username };
    setUser(loggedInUser);
    localStorage.setItem("lab_user", JSON.stringify(loggedInUser));
    return loggedInUser;
  };

  const logout = () => {
    tokenStorage.clear();
    localStorage.removeItem("lab_user");
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}
