import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function VehicleEdit() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    vehicle_number: "",
  });

  // Load existing vehicle data
  useEffect(() => {
    api
      .get(`/vehicles/${vehicle_number}`)
      .then((res) => {
        setFormData({
          vehicle_number: res.data.vehicle_number,
        });
        setLoading(false);
      })
      .catch(() => {
        alert("Failed to load vehicle");
        navigate("/vehicles");
      });
  }, [vehicle_number, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/vehicles/${vehicle_number}`, formData);
      alert("Vehicle updated successfully");
      navigate(`/vehicles/${vehicle_number}`);
    } catch {
      alert("Failed to update vehicle");
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
                disabled
                className="w-full h-14 px-6 bg-slate-100 border border-slate-200 rounded-2xl text-xl font-black text-slate-400 cursor-not-allowed opacity-60"
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1 italic">
                Vehicle number cannot be changed here
              </p>
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
    </div>
  );
}
