import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function MaintenanceList() {
  const navigate = useNavigate();
  const { type } = useParams();

  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const typeLabels = {
    emi: "EMI",
    insurance: "Insurance",
    tax: "Tax",
  };

  /* ---------------- FETCH VEHICLES ---------------- */
  useEffect(() => {
    fetchVehicles();
  }, []);

  /* ---------------- FETCH MAINTENANCE ---------------- */
  useEffect(() => {
    if (selectedVehicle) {
      fetchMaintenances();
    }
  }, [selectedVehicle, type]);

  const fetchVehicles = async () => {
    try {
      const res = await api.get("/vehicles/");
      setVehicles(res.data);

      if (res.data.length > 0) {
        setSelectedVehicle(res.data[0].vehicle_number);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/maintenance/vehicle/${selectedVehicle}/`,
        { params: { maintenance_type: type } }
      );
      setMaintenances(res.data);
    } catch (err) {
      console.error("Error fetching maintenances:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await api.delete(`/maintenance/${id}/`);
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting maintenance:", err);
    }
  };

  const getTypeDescription = (mType) => {
    switch (mType) {
      case "emi":
        return "Per Month";
      case "insurance":
        return "Annual (÷ 12 months)";
      case "tax":
        return "3 Months (÷ 3 months)";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 md:p-6">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {typeLabels[type]} Management
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {getTypeDescription(type)}
          </p>
        </div>

        <button
          onClick={() => navigate(`/maintenance/${type}/add`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          + Add {typeLabels[type]}
        </button>
      </div>

      {/* ---------- VEHICLE SELECT ---------- */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <label className="block text-sm font-medium mb-2">
          Select Vehicle
        </label>
        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            Loading...
          </div>
        ) : maintenances.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No {typeLabels[type].toLowerCase()} records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border-collapse">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium hidden md:table-cell">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {maintenances.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3">
                      ₹ {m.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      {m.description || "-"}
                    </td>
                    <td className="px-6 py-3">
                      {new Date(m.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          navigate(`/maintenance/${type}/edit/${m.id}`)
                        }
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
