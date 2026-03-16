import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.png";

const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "emi", label: "EMI" },
  { key: "insurance", label: "Insurance" },
  { key: "tax", label: "Tax" },
];

const TYPE_LABELS = {
  emi: "EMI",
  insurance: "Insurance",
  tax: "Tax",
};

export default function MaintenanceList() {
  const navigate = useNavigate();
  const { type } = useParams();

  const activeType = TYPE_TABS.some((t) => t.key === type) ? type : "all";

  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [addType, setAddType] = useState(activeType === "all" ? "emi" : activeType);

  useEffect(() => {
    if (activeType !== "all") {
      setAddType(activeType);
    }
  }, [activeType]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/vehicles");
        setVehicles(res.data || []);
        if ((res.data || []).length > 0) {
          setSelectedVehicle(res.data[0].vehicle_number);
        }
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    fetchMaintenances();
  }, [selectedVehicle, activeType]);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const params = activeType === "all" ? {} : { maintenance_type: activeType };
      const res = await api.get(`/maintenance/vehicle/${selectedVehicle}`, { params });
      setMaintenances(res.data || []);
    } catch (err) {
      console.error("Error fetching maintenances:", err);
      setMaintenances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/maintenance/${id}`);
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting maintenance:", err);
    }
  };

  const sortedRows = useMemo(() => {
    return [...maintenances].sort((a, b) => String(b.start_date || "").localeCompare(String(a.start_date || "")));
  }, [maintenances]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="bg-white p-3 rounded shadow">
        <img src={NathkrupaLogo} alt="Nath Krupa Travels" className="h-10 w-auto" />
      </div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Maintenance</h1>
        <div className="flex gap-2 items-center">
          {activeType === "all" && (
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value)}
              className="border px-3 py-2 rounded"
            >
              <option value="emi">EMI</option>
              <option value="insurance">Insurance</option>
              <option value="tax">Tax</option>
            </select>
          )}
          <button
            onClick={() => navigate(`/maintenance/${addType}/add`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            + Add Maintenance
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded"
          >
            Print
          </button>
        </div>
      </div>

      <div className="border-b">
        <div className="flex gap-4">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => navigate(`/maintenance/${tab.key}`)}
              className={`px-2 pb-2 text-xl ${
                activeType === tab.key
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <label className="block text-sm font-medium mb-2">Select Vehicle</label>
        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border rounded"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : sortedRows.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No maintenance records found</div>
        ) : (
          <table className="min-w-[900px] w-full border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((m) => {
                const rowType = String(m.maintenance_type || "").toLowerCase();
                return (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{TYPE_LABELS[rowType] || rowType || "-"}</td>
                    <td className="px-4 py-3">INR {Number(m.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">{m.description || "-"}</td>
                    <td className="px-4 py-3">{formatDateDDMMYYYY(m.start_date)}</td>
                    <td className="px-4 py-3">{m.end_date ? formatDateDDMMYYYY(m.end_date) : "-"}</td>
                    <td className="px-4 py-3">{formatDateDDMMYYYY(m.created_at)}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button
                        onClick={() => navigate(`/maintenance/${rowType || "emi"}/edit/${m.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
