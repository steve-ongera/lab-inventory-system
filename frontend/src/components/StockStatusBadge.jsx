const TONE_BY_STATUS = {
  OK: "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
};

export default function StockStatusBadge({ status }) {
  const tone = TONE_BY_STATUS[status] || "default";
  return <span className={`badge badge--${tone}`}>{status}</span>;
}
