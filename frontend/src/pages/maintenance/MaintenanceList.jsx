import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";

const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "emi", label: "EMI" },
  { key: "insurance", label: "Insurance" },
  { key: "tax", label: "Tax" },
];

const TYPE_LABELS = {
  emi: "EMI",
  insurance: "Insurance",
  tax: "Tax",
};

export default function MaintenanceList() {
  const navigate = useNavigate();
  const { type } = useParams();

  const activeType = TYPE_TABS.some((t) => t.key === type) ? type : "all";

  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [addType, setAddType] = useState(activeType === "all" ? "emi" : activeType);

  useEffect(() => {
    if (activeType !== "all") {
      setAddType(activeType);
    }
  }, [activeType]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/vehicles");
        setVehicles(res.data || []);
        if ((res.data || []).length > 0) {
          setSelectedVehicle(res.data[0].vehicle_number);
        }
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    fetchMaintenances();
  }, [selectedVehicle, activeType]);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const params = activeType === "all" ? {} : { maintenance_type: activeType };
      const res = await api.get(`/maintenance/vehicle/${selectedVehicle}`, { params });
      setMaintenances(res.data || []);
    } catch (err) {
      console.error("Error fetching maintenances:", err);
      setMaintenances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/maintenance/${id}`);
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting maintenance:", err);
    }
  };

  const sortedRows = useMemo(() => {
    return [...maintenances].sort((a, b) => String(b.start_date || "").localeCompare(String(a.start_date || "")));
  }, [maintenances]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Maintenance Records</h1>
          <p className="text-slate-500 font-medium mt-1">Track EMI, insurance, tax, and other vehicle costs</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeType === "all" && (
            <div className="relative group">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none shadow-sm"
              >
                <option value="emi">EMI</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate(`/maintenance/${addType}/add`)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Record
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-black transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print
          </button>
        </div>
      </div>

      {/* ---------- TABS ---------- */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/maintenance/${tab.key}`)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeType === tab.key
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------- VEHICLE SELECT ---------- */}
      <div className="glass-card p-6 rounded-3xl border border-slate-100">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Select Vehicle</label>
        <div className="relative group w-full md:w-96">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-20 text-center animate-pulse">
            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-4" />
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading records...</div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Date / Expiry</th>
                  <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRows.length === 0 ? (
                  <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No records found</td></tr>
                ) : (
                  sortedRows.map((m) => {
                    const rowType = String(m.maintenance_type || "").toLowerCase();
                    return (
                      <tr key={m.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-6">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
                            {TYPE_LABELS[rowType] || rowType || "-"}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Added: {formatDateDDMMYYYY(m.created_at)}</div>
                        </td>
                        <td className="p-6 text-base font-black text-slate-800 tracking-tighter">
                          ₹{Number(m.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-6 text-sm text-slate-500 font-medium max-w-xs truncate">
                          {m.description || "No description provided"}
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700">{formatDateDDMMYYYY(m.start_date)}</span>
                            {m.end_date && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">Expires: {formatDateDDMMYYYY(m.end_date)}</span>}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/maintenance/${rowType || "emi"}/edit/${m.id}`)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
