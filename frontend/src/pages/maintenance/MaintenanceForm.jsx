import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const [formData, setFormData] = useState({
    vehicle_number: "",
    maintenance_type: type,
    description: "",
    amount: "",
    start_date: new Date().toISOString().split('T')[0]
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const typeLabels = {
    emi: "EMI",
    insurance: "Insurance",
    tax: "Tax"
  };

  useEffect(() => {
    fetchVehicles();
    if (id) {
      fetchMaintenance();
    }
  }, [id, type]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data);
      if (response.data.length > 0 && !formData.vehicle_number) {
        setFormData(prev => ({
          ...prev,
          vehicle_number: response.data[0].vehicle_number
        }));
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to load vehicles");
    }
  };

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/maintenance/${id}`);
      const data = response.data;
      setFormData({
        vehicle_number: data.vehicle_number,
        maintenance_type: data.maintenance_type,
        description: data.description,
        amount: data.amount,
        start_date: data.start_date.split('T')[0]
      });
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      setError("Failed to load record");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (id) {
        await api.put(`/maintenance/${id}`, formData);
      } else {
        await api.post("/maintenance", formData);
      }
      navigate(`/maintenance/${type}`);
    } catch (error) {
      console.error("Error saving maintenance:", error);
      setError(error.response?.data?.detail || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (mType) => {
    switch (mType) {
      case "emi":
        return {
          label: "EMI",
          description: "Equated Monthly Installment - Fixed amount per month"
        };
      case "insurance":
        return {
          label: "Insurance",
          description: "Annual insurance - Will be divided into 12 monthly payments"
        };
      case "tax":
        return {
          label: "Tax",
          description: "Quarterly tax - Valid for 3 months, divided into 3 monthly payments"
        };
      default:
        return { label: "", description: "" };
    }
  };

  const typeInfo = getTypeInfo(type);

  if (loading && id) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {id ? "Edit" : "Add"} {typeLabels[type]}
        </h1>
        <p className="text-gray-600 text-sm mt-2">{typeInfo.description}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
        {/* Vehicle Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Vehicle *</label>
          <select
            name="vehicle_number"
            value={formData.vehicle_number}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.vehicle_number}>
                {v.vehicle_number}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (₹) *
            {type === "insurance" && <span className="text-xs text-gray-500"> (Annual)</span>}
            {type === "tax" && <span className="text-xs text-gray-500"> (3 Months)</span>}
            {type === "emi" && <span className="text-xs text-gray-500"> (Per Month)</span>}
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-2">Start Date *</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Bank Name, Policy Number, etc."
            rows="3"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
          <strong>How it works:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {type === "emi" && (
              <li>EMI amount: {formData.amount ? `₹${parseFloat(formData.amount).toLocaleString()}` : "₹0"} per month will be added to vehicle cost</li>
            )}
            {type === "insurance" && (
              <li>Insurance amount: ₹{formData.amount ? (parseFloat(formData.amount) / 12).toLocaleString('en-IN', {maximumFractionDigits: 2}) : "0"} per month will be added to vehicle cost</li>
            )}
            {type === "tax" && (
              <li>Tax amount: ₹{formData.amount ? (parseFloat(formData.amount) / 3).toLocaleString('en-IN', {maximumFractionDigits: 2}) : "0"} per month for 3 months</li>
            )}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/maintenance/${type}`)}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
