import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
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
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Fuel Records</h1>
          <p className="text-slate-500 font-medium mt-1">Track fuel fill-ups for each vehicle</p>
        </div>

        <button
          onClick={() => navigate("/fuel/add")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Add Fuel Entry
        </button>
      </div>

      {/* ---------- FILTERS ---------- */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-100/30 p-4 rounded-3xl border border-slate-100">
        <div className="relative group w-full md:w-64">
          <select
            value={selectedVehicle}
            onChange={e => setSelectedVehicle(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={searchByVehicle}
            className="px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            Search
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle & Vendor</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Quantity & Rate</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cost</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
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
