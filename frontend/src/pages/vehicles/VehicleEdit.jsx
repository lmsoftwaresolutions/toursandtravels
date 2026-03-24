import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Modal from "../../components/common/Modal";

export default function VehicleEdit() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    vehicle_type: "seating",
    seat_count: "",
  });

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, type = "error", onConfirm = null) => 
    setModal({ isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Load existing vehicle data
  useEffect(() => {
    api
      .get(`/vehicles/${vehicle_number}`)
      .then((res) => {
        setFormData({
          vehicle_number: res.data.vehicle_number,
          vehicle_type: res.data.vehicle_type || "seating",
          seat_count: res.data.seat_count ? String(res.data.seat_count) : "",
        });
        setLoading(false);
      })
      .catch(() => {
        showModal("Error", "Failed to load vehicle data");
        navigate("/vehicles");
      });
  }, [vehicle_number, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_number: formData.vehicle_number,
        vehicle_type: formData.vehicle_type || null,
        seat_count: formData.seat_count ? Number(formData.seat_count) : null,
      };
      await api.put(`/vehicles/${vehicle_number}`, payload);
      showModal("Success", "Vehicle updated successfully!", "success", () => navigate(`/vehicles/${formData.vehicle_number}`));
    } catch (err) {
      showModal("Error", err.response?.data?.detail || "Failed to update vehicle");
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading vehicle..." />;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Edit Vehicle</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">View and update vehicle details</p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Number</label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1 italic">
                Update the vehicle registration number (caution: affects related records)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Type</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                  required
                >
                  <option value="seating">Seating</option>
                  <option value="sleeper">Sleeper</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. of Seats</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.seat_count}
                  onChange={(e) => setFormData({ ...formData, seat_count: e.target.value })}
                  className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="e.g. 32"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/vehicles/${vehicle_number}`)}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98]"
            >
              Save Changes
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
