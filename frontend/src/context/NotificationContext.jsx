import { createContext, useCallback, useContext, useState } from "react";

const NotificationContext = createContext(null);

let idCounter = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pushNotification = useCallback(
    (message, level = "info", timeout = 4000) => {
      const id = ++idCounter;
      setNotifications((prev) => [...prev, { id, message, level }]);
      if (timeout) {
        setTimeout(() => removeNotification(id), timeout);
      }
      return id;
    },
    [removeNotification]
  );

  const notifySuccess = useCallback((message) => pushNotification(message, "success"), [pushNotification]);
  const notifyError = useCallback((message) => pushNotification(message, "error"), [pushNotification]);
  const notifyWarning = useCallback((message) => pushNotification(message, "warning"), [pushNotification]);
  const notifyInfo = useCallback((message) => pushNotification(message, "info"), [pushNotification]);

  const value = {
    notifications,
    pushNotification,
    removeNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within a NotificationProvider");
  return ctx;
}
