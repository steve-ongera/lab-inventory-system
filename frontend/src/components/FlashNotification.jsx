import useNotification from "../hooks/useNotification";

export default function FlashNotification() {
  const { notifications, removeNotification } = useNotification();

  if (!notifications.length) return null;

  return (
    <div className="flash-container">
      {notifications.map((n) => (
        <div key={n.id} className={`flash-toast flash-toast--${n.level}`}>
          <span>{n.message}</span>
          <button
            className="flash-toast__close"
            onClick={() => removeNotification(n.id)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
