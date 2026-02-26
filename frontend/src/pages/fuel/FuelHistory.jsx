import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function FuelHistory() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [fuelData, setFuelData] = useState([]);

  /* ---------- LOAD VEHICLES ---------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  /* ---------- LOAD ALL FUEL ON PAGE LOAD ---------- */
  useEffect(() => {
    loadAllFuel();
  }, []);

  const loadAllFuel = async () => {
    const res = await api.get("/fuel");
    setFuelData(res.data);
  };

  /* ---------- SEARCH BY VEHICLE ---------- */
  const searchByVehicle = async () => {
    if (!selectedVehicle) {
      loadAllFuel();
      return;
    }
    const res = await api.get(`/fuel/vehicle/${selectedVehicle}`);
    setFuelData(res.data);
  };

  /* ---------- RESET ---------- */
  const reset = () => {
    setSelectedVehicle("");
    loadAllFuel();
  };

  /* ---------- DELETE ---------- */
  const deleteFuel = async (id) => {
    if (!window.confirm("Delete this fuel entry?")) return;

    await api.delete(`/fuel/${id}`);
    loadAllFuel();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Fuel History</h1>

        <button
          onClick={() => navigate("/fuel/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Fuel
        </button>
      </div>

      {/* FILTER */}
      <div className="flex gap-2 mb-4">
        <select
          value={selectedVehicle}
          onChange={e => setSelectedVehicle(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <button
          onClick={searchByVehicle}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>

        <button
          onClick={reset}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Vehicle</th>
              <th className="p-2 text-left">Fuel Type</th>
              <th className="p-2 text-left">Quantity (L)</th>
              <th className="p-2 text-left">Rate</th>
              <th className="p-2 text-left">Total Cost</th>
              <th className="p-2 text-left">Vendor</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {fuelData.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No fuel records found
                </td>
              </tr>
            ) : (
              fuelData.map(f => (
                <tr key={f.id} className="border-t">
                  {/* ✅ CORRECT FIELD NAMES */}
                  <td className="p-2">{formatDateDDMMYYYY(f.filled_date)}</td>
                  <td className="p-2">{f.vehicle_number}</td>
                  <td className="p-2 capitalize">{f.fuel_type}</td>
                  <td className="p-2">{f.quantity}</td>
                  <td className="p-2">₹ {f.rate_per_litre}</td>
                  <td className="p-2">₹ {f.total_cost}</td>
                  <td className="p-2">{f.vendor || "-"}</td>

                  {/* ACTIONS */}
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => navigate(`/fuel/edit/${f.id}`)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteFuel(f.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
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
