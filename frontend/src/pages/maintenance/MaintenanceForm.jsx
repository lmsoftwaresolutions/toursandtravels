import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const normalizedType = ["emi", "insurance", "tax"].includes(type) ? type : "emi";

  const [formData, setFormData] = useState({
    vehicle_number: "",
    maintenance_type: normalizedType,
    description: "",
    amount: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const typeLabels = {
    emi: "EMI",
    insurance: "Insurance",
    tax: "Tax",
  };

  /* -------- keep type in sync -------- */
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      maintenance_type: normalizedType,
    }));
  }, [normalizedType]);

  useEffect(() => {
    fetchVehicles();
    if (id) fetchMaintenance();
  }, [id]);

  /* -------- fetch vehicles -------- */
  const fetchVehicles = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data);

      if (res.data.length > 0 && !formData.vehicle_number) {
        setFormData((prev) => ({
          ...prev,
          vehicle_number: res.data[0].vehicle_number,
        }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load vehicles");
    }
  };

  /* -------- fetch maintenance -------- */
  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/maintenance/${id}`);
      const data = res.data;

      setFormData({
        vehicle_number: data.vehicle_number,
        maintenance_type: data.maintenance_type,
        description: data.description,
        amount: data.amount,
        start_date: data.start_date.split("T")[0],
        end_date: data.end_date ? data.end_date.split("T")[0] : "",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load record");
    } finally {
      setLoading(false);
    }
  };

  /* -------- handlers -------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        end_date: formData.end_date || null,
      };
      if (id) {
        await api.put(`/maintenance/${id}`, payload);
      } else {
        await api.post("/maintenance", payload);
      }
      navigate(`/maintenance/${normalizedType}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="p-4 md:p-6">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-2xl mx-auto">

        {/* ---------- HEADER ---------- */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {id ? "Edit" : "Add"} {typeLabels[normalizedType]}
        </h1>

        {/* ---------- ERROR ---------- */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* ---------- FORM ---------- */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 md:p-6 rounded shadow space-y-4"
        >
          {/* Vehicle */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Vehicle *
            </label>
            <select
              name="vehicle_number"
              value={formData.vehicle_number}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicle_number}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date *
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/maintenance/${normalizedType}`)}
              className="bg-gray-300 px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
