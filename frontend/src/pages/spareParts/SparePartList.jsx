import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function SparePartList() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [spareParts, setSpareParts] = useState([]);

  /* ---------------- LOAD VEHICLES ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  /* ---------------- LOAD ALL SPARE PARTS ---------------- */
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const res = await api.get("/spare-parts");
    setSpareParts(res.data);
  };

  /* ---------------- SEARCH BY VEHICLE ---------------- */
  const search = async () => {
    if (!selectedVehicle) {
      loadAll();
      return;
    }
    const res = await api.get(`/spare-parts/vehicle/${selectedVehicle}`);
    setSpareParts(res.data);
  };

  /* ---------------- RESET ---------------- */
  const reset = () => {
    setSelectedVehicle("");
    loadAll();
  };

  /* ---------------- DELETE ---------------- */
  const remove = async (id) => {
    if (!window.confirm("Delete this spare part?")) return;
    await api.delete(`/spare-parts/${id}`);
    loadAll();
  };

  return (
    <div className="p-4 md:p-6">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4">
        <h1 className="text-2xl font-bold">Spare Parts</h1>
        <button
          onClick={() => navigate("/spare-parts/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Spare Part
        </button>
      </div>

      {/* ---------- FILTER BAR ---------- */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <select
          value={selectedVehicle}
          onChange={e => setSelectedVehicle(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        >
          <option value="">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <button
          onClick={search}
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

      {/* ---------- TABLE ---------- */}
      <div className="bg-white rounded shadow">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Vehicle</th>
                <th className="p-2 text-left">Part</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Cost</th>
                <th className="p-2 text-left hidden md:table-cell">Vendor</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {spareParts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    No spare parts found
                  </td>
                </tr>
              ) : (
                spareParts.map(sp => (
                  <tr key={sp.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">
                      {formatDateDDMMYYYY(sp.replaced_date)}
                    </td>
                    <td className="p-2">
                      {sp.vehicle_number}
                    </td>
                    <td className="p-2">
                      {sp.part_name}
                    </td>
                    <td className="p-2">
                      {sp.quantity}
                    </td>
                    <td className="p-2">
                      ₹ {sp.cost}
                    </td>
                    <td className="p-2 hidden md:table-cell">
                      {sp.vendor || "-"}
                    </td>
                    <td className="p-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/spare-parts/${sp.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/spare-parts/edit/${sp.id}`)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(sp.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm"
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

    </div>
  );
}
