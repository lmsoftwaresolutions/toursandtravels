import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function VehicleEdit() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    vehicle_number: "",
  });

  // Load existing vehicle data
  useEffect(() => {
    api
      .get(`/vehicles/${vehicle_number}`)
      .then((res) => {
        setFormData({
          vehicle_number: res.data.vehicle_number,
        });
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load vehicle");
        navigate("/vehicles");
      });
  }, [vehicle_number, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/vehicles/${vehicle_number}`, formData);
      alert("Vehicle updated successfully");
      navigate(`/vehicles/${vehicle_number}`);
    } catch (err) {
      alert("Failed to update vehicle");
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading vehicle..." />;
  }

  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Edit Vehicle
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              value={formData.vehicle_number}
              disabled
              className="border p-2 w-full rounded bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vehicle number cannot be changed
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => navigate(`/vehicles/${vehicle_number}`)}
              className="border px-6 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
