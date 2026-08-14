import { reportsAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

export default function Reports() {
  const { notifySuccess, notifyError } = useNotification();

  const downloadLowStockCsv = async () => {
    try {
      const { data } = await reportsAPI.lowStockCsv();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "low_stock_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      notifySuccess("Low-stock report downloaded.");
    } catch {
      notifyError("Could not export the report.");
    }
  };

  return (
    <div className="page">
      <h1>Reports</h1>
      <section className="panel">
        <h2>Low Stock / Reorder Report</h2>
        <button onClick={downloadLowStockCsv}>Download CSV</button>
      </section>
    </div>
  );
}
