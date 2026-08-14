import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function TrendLineChart({ data }) {
  if (!data?.length) return <p className="chart-empty">No trend data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e6e8" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5b6b70" }} axisLine={{ stroke: "#dde4e6" }} />
        <YAxis tick={{ fontSize: 12, fill: "#5b6b70" }} axisLine={{ stroke: "#dde4e6" }} />
        <Tooltip
          contentStyle={{ borderRadius: 6, border: "1px solid #dde4e6", fontSize: 13 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="received"
          name="Received"
          stroke="#0f6e67"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="dispensed"
          name="Dispensed"
          stroke="#a9720a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
