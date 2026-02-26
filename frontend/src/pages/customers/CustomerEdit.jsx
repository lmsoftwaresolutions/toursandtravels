import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function CustomerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/customers/${id}`)
      .then(res => setName(res.data.name))
      .catch(() => setError("Failed to load customer"));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }

    try {
      setLoading(true);

      // ✅ FIX: trailing slash added
      await api.put(`/customers/${id}`, { name: name.trim() });

      navigate(`/customers/${id}`);
    } catch (err) {
      console.error(err);
      setError("Customer name already exists or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Customer</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow w-96 space-y-3"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input
            className="border p-2 rounded w-full"
            placeholder="Customer Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Update"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/customers/${id}`)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
