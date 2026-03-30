import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Modal from "../../components/common/Modal";

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

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, type = "error", onConfirm = null) => 
    setModal({ isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

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
      const data = res.data || [];
      setVehicles(data);

      if (data.length > 0 && !formData.vehicle_number) {
        setFormData((prev) => ({
          ...prev,
          vehicle_number: data[0].vehicle_number,
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
        description: data.description || "",
        amount: data.amount || "",
        start_date: data.start_date ? data.start_date.split("T")[0] : "",
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
      showModal("Success", "Maintenance record saved!", "success", () => navigate(`/maintenance/${normalizedType}`));
    } catch (err) {
      showModal("Error", err.response?.data?.detail || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="p-10 text-center font-black animate-pulse">LOADING MAINTENANCE PROTOCOL...</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            {id ? "Edit Maintenance" : "Add Maintenance"}
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">
            Maintenance Type: {typeLabels[normalizedType]}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-in zoom-in duration-300">
          <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
        </div>
      )}

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.1.48.01.59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Vehicle</label>
              <select
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">Select Targeted Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_number} value={v.vehicle_number}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  placeholder="0.00"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Add maintenance notes..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/maintenance/${normalizedType}`)}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-blue-900/20 active:scale-[0.98]"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
      {/* MODAL */}
      <Modal 
        isOpen={modal.isOpen} 
        onClose={modal.onConfirm ? modal.onConfirm : closeModal} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
    </div>
  );
}
