import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { authService } from "../../services/auth";
import Pagination from "../../components/common/Pagination";

export default function DriverList() {
  const [drivers, setDrivers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    api.get("/drivers").then((res) => setDrivers(res.data));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [drivers.length]);

  const paginatedDrivers = drivers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDeleteDriver = async (driverId, driverName) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete driver "${driverName}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/drivers/${driverId}`);
      setDrivers((prev) => prev.filter((driver) => driver.id !== driverId));
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to delete driver");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Drivers</h1>
          <p className="text-slate-500 font-medium mt-1">View and manage all drivers</p>
        </div>

        <button
          onClick={() => navigate("/drivers/add")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Add Driver
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden min-h-[400px]">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Driver Name</th>
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {drivers.length === 0 ? (
              <tr><td className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]" colSpan="3">No drivers added yet</td></tr>
            ) : (
              paginatedDrivers.map((d) => (
                <tr key={d.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      </div>
                      <span className="text-base font-black text-slate-800 tracking-tight">{d.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100">
                      Active
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/drivers/${d.id}`)}
                        className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                      >
                        Profile
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteDriver(d.id, d.name)}
                          className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={drivers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
