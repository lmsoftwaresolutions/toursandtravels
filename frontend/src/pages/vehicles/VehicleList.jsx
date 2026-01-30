import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  /* ---------- LOAD VEHICLES ---------- */
  const loadVehicles = () => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  /* ---------- SOFT DELETE ---------- */
  const deleteVehicle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    await api.delete(`/vehicles/${id}`);
    loadVehicles();
  };

  /* ---------- FILTER ---------- */
  const filteredVehicles = vehicles.filter(v =>
    v.vehicle_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">

      {/* ---------- HEADER ---------- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicles</h1>

        <div className="space-x-2">
          <button
            onClick={() => navigate("/vehicles/efficiency")}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            📊 Efficiency Report
          </button>
          <button
            onClick={() => navigate("/vehicles/add")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* ---------- SEARCH ---------- */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search vehicle number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Vehicle Number</th>
              <th className="p-3 text-left">Total KM</th>
              <th className="p-3 text-left">Trips</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No vehicles found
                </td>
              </tr>
            ) : (
              filteredVehicles.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{v.vehicle_number}</td>
                  <td className="p-3">{v.total_km}</td>
                  <td className="p-3">{v.total_trips}</td>

                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => navigate(`/vehicles/${v.vehicle_number}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      View
                    </button>

                    <button
                      onClick={() => navigate(`/trips?vehicle=${v.vehicle_number}`)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      Trips
                    </button>

                    <button
                      onClick={() => deleteVehicle(v.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
