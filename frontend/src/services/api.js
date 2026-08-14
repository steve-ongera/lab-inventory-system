import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const ACCESS_TOKEN_KEY = "lab_access_token";
const REFRESH_TOKEN_KEY = "lab_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh the access token once on a 401, then retry the original request
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        tokenStorage.set(data.access, refreshToken);
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
export const authAPI = {
  login: (username, password) => api.post("/auth/login/", { username, password }),
  refresh: (refresh) => api.post("/auth/refresh/", { refresh }),
};

/* ------------------------------------------------------------------ */
/* Item Master                                                        */
/* ------------------------------------------------------------------ */
export const itemsAPI = {
  list: (params) => api.get("/items/", { params }),
  get: (itemCode) => api.get(`/items/${itemCode}/`),
  create: (payload) => api.post("/items/", payload),
  update: (itemCode, payload) => api.patch(`/items/${itemCode}/`, payload),
  delete: (itemCode) => api.delete(`/items/${itemCode}/`),
  deactivate: (itemCode) => api.post(`/items/${itemCode}/deactivate/`),
};

/* ------------------------------------------------------------------ */
/* Stock Receipts                                                     */
/* ------------------------------------------------------------------ */
export const stockReceiptsAPI = {
  list: (params) => api.get("/stock-receipts/", { params }),
  get: (id) => api.get(`/stock-receipts/${id}/`),
  create: (payload) => api.post("/stock-receipts/", payload),
  update: (id, payload) => api.patch(`/stock-receipts/${id}/`, payload),
  delete: (id) => api.delete(`/stock-receipts/${id}/`),
};

/* ------------------------------------------------------------------ */
/* Dispensing Log                                                     */
/* ------------------------------------------------------------------ */
export const dispensingAPI = {
  list: (params) => api.get("/dispensing-log/", { params }),
  get: (id) => api.get(`/dispensing-log/${id}/`),
  create: (payload) => api.post("/dispensing-log/", payload),
  update: (id, payload) => api.patch(`/dispensing-log/${id}/`, payload),
  delete: (id) => api.delete(`/dispensing-log/${id}/`),
};

/* ------------------------------------------------------------------ */
/* Current Stock (computed, read-only)                                */
/* ------------------------------------------------------------------ */
export const currentStockAPI = {
  list: (params) => api.get("/current-stock/", { params }),
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
export const dashboardAPI = {
  get: () => api.get("/dashboard/"),
};

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */
export const reportsAPI = {
  lowStock: (params) => api.get("/reports/low-stock/", { params }),
  lowStockCsv: () =>
    api.get("/reports/low-stock/", { params: { format: "csv" }, responseType: "blob" }),
  expiryWatch: (params) => api.get("/reports/expiry-watch/", { params }),
};

/* ------------------------------------------------------------------ */
/* Users / staff                                                      */
/* ------------------------------------------------------------------ */
export const usersAPI = {
  list: (params) => api.get("/users/", { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (payload) => api.post("/users/", payload),
  update: (id, payload) => api.patch(`/users/${id}/`, payload),
  delete: (id) => api.delete(`/users/${id}/`),
};

/* ------------------------------------------------------------------ */
/* Notifications (flash notifications)                                */
/* ------------------------------------------------------------------ */
export const notificationsAPI = {
  list: (params) => api.get("/notifications/", { params }),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
};

/* ------------------------------------------------------------------ */
/* Settings: categories, units, suppliers                             */
/* ------------------------------------------------------------------ */
export const categoriesAPI = {
  list: () => api.get("/settings/categories/"),
  create: (payload) => api.post("/settings/categories/", payload),
  update: (id, payload) => api.patch(`/settings/categories/${id}/`, payload),
  delete: (id) => api.delete(`/settings/categories/${id}/`),
};

export const unitsAPI = {
  list: () => api.get("/settings/units/"),
  create: (payload) => api.post("/settings/units/", payload),
  update: (id, payload) => api.patch(`/settings/units/${id}/`, payload),
  delete: (id) => api.delete(`/settings/units/${id}/`),
};

export const suppliersAPI = {
  list: () => api.get("/settings/suppliers/"),
  create: (payload) => api.post("/settings/suppliers/", payload),
  update: (id, payload) => api.patch(`/settings/suppliers/${id}/`, payload),
  delete: (id) => api.delete(`/settings/suppliers/${id}/`),
};

export default api;
