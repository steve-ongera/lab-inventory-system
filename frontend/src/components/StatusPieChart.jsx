import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  OK: "#2f7d4f",
  "Low Stock": "#a9720a",
  "Out of Stock": "#a83a3a",
};

export default function StatusPieChart({ data }) {
  const rows = (data || []).filter((row) => row.count > 0);

  if (!rows.length) return <p className="chart-empty">No status data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {rows.map((row) => (
            <Cell key={row.status} fill={COLORS[row.status] || "#5b6b70"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 6, border: "1px solid #dde4e6", fontSize: 13 }}
          formatter={(value, name) => [`${value} item(s)`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
