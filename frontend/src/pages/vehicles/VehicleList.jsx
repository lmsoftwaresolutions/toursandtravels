import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { authService } from "../../services/auth";
import Pagination from "../../components/common/Pagination";

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();
  const canWrite = !authService.hasLimitedAccess();

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, vehicles.length]);

  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Vehicles</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Manage all your vehicles</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/vehicles/efficiency")}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-sm"
          >
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Efficiency Report
          </button>
          <button
            onClick={() => navigate("/vehicles/add")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Vehicle
          </button>
        </div>
      </div>

      {/* ---------- SEARCH & ACTION BAR ---------- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search vehicle number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Total KM</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Trips Done</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="font-bold text-slate-400">No vehicles matching your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map(v => (
                  <tr key={v.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs ring-4 ring-blue-50/50">
                          VAN
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-800">{v.vehicle_number}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Vehicle</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-6 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-bold text-slate-700">{v.total_km.toLocaleString()} KM</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Total Distance</div>
                      </div>
                    </td>

                    <td className="p-6 hidden md:table-cell">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        {v.total_trips} Trips Completed
                      </div>
                    </td>

                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite ? (
                          <button
                            onClick={() => navigate(`/vehicles/${v.vehicle_number}/edit`)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                            title="Edit Vehicle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        ) : null}
                        <button
                          onClick={() => navigate(`/vehicles/${v.vehicle_number}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(`/trips?vehicle=${v.vehicle_number}`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="View Trips"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </button>
                        {canWrite ? (
                          <button
                            onClick={() => deleteVehicle(v.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Remove Vehicle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredVehicles.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
