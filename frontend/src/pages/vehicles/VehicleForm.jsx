import { useState } from "react";
import api from "../../services/api";
import Modal from "../../components/common/Modal";

export default function VehicleForm() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("seating");
  const [seatCount, setSeatCount] = useState("");

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const showModal = (title, message, type = "error") => setModal({ isOpen: true, title, message, type });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedVehicleNumber = vehicleNumber.trim().toUpperCase().replace(/[\s-]/g, "");
    const isVehicleNumberValid = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(normalizedVehicleNumber);
    const seatsValue = Number(seatCount);
    const isSeatCountValid = Number.isInteger(seatsValue) && seatsValue > 0;

    if (!normalizedVehicleNumber) {
      showModal("Validation Error", "Vehicle number is required.");
      return;
    }

    if (!isVehicleNumberValid) {
      showModal("Validation Error", "Vehicle number must follow format like MH12AB1234.");
      return;
    }

    if (!isSeatCountValid) {
      showModal("Validation Error", "Seat count must be a whole number greater than 0.");
      return;
    }

    try {
      await api.post("/vehicles", {
        vehicle_number: normalizedVehicleNumber,
        vehicle_type: vehicleType || null,
        seat_count: seatsValue,
      });
      showModal("Success", "Vehicle added successfully!", "success");
      setVehicleNumber("");
      setVehicleType("seating");
      setSeatCount("");
    } catch {
      showModal("Error", "Vehicle registration failed. It may already exist.");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Add Vehicle</h1>
        <p className="text-slate-500 font-medium">Add a new vehicle to your records</p>
      </div>

      {/* ---------- FORM CARD ---------- */}
      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 max-w-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Number</label>
            <div className="relative">
              <input
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                placeholder="Example: MH12AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                required
                minLength={4}
                maxLength={20}
                inputMode="text"
              />
              <svg className="absolute left-4 top-1/2 w-6 h-6 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-1 italic">Use the vehicle registration number</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Type</label>
              <select
                className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
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
                className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="e.g. 32"
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 h-14 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95"
            >
              Save Vehicle
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-8 h-14 bg-white text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-2xl px-8 flex items-center gap-4 text-slate-300">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Vehicle Details</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {/* MODAL */}
      <Modal 
        isOpen={modal.isOpen} 
        onClose={closeModal} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
    </div>
  );
}
