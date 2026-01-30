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
    tax: "Tax"
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      fetchMaintenances();
    }
  }, [selectedVehicle, type]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data);
      if (response.data.length > 0) {
        setSelectedVehicle(response.data[0].vehicle_number);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/maintenance/vehicle/${selectedVehicle}`, {
        params: {
          maintenance_type: type
        }
      });
      setMaintenances(response.data);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/maintenance/${id}`);
      setMaintenances(maintenances.filter(m => m.id !== id));
    } catch (error) {
      console.error("Error deleting maintenance:", error);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{typeLabels[type]} Management</h1>
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

      {/* Vehicle Selector */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <label className="block text-sm font-medium mb-2">Select Vehicle</label>
        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          {vehicles.map(v => (
            <option key={v.id} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : maintenances.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No {typeLabels[type].toLowerCase()} records found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Start Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Created</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenances.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">₹ {m.amount.toLocaleString()}</td>
                  <td className="px-6 py-3">{m.description || "-"}</td>
                  <td className="px-6 py-3">
                    {new Date(m.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/maintenance/${type}/edit/${m.id}`)}
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
        )}
      </div>
    </div>
  );
}
