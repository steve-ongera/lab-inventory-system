import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function CategoryBarChart({ data }) {
  if (!data?.length) return <p className="chart-empty">No category data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e1e6e8" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: "#5b6b70" }}
          axisLine={{ stroke: "#dde4e6" }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 12, fill: "#5b6b70" }} axisLine={{ stroke: "#dde4e6" }} />
        <Tooltip
          contentStyle={{ borderRadius: 6, border: "1px solid #dde4e6", fontSize: 13 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="received" name="Received" fill="#0f6e67" radius={[3, 3, 0, 0]} />
        <Bar dataKey="dispensed" name="Dispensed" fill="#a9720a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
