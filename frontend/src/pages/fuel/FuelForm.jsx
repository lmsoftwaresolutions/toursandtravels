import { useEffect, useState } from "react";
import api from "../../services/api";

export default function FuelForm() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    vehicle_number: "",
    fuel_type: "diesel",
    quantity: "",
    rate_per_litre: "",
    filled_date: ""
  });

  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    await api.post("/fuel", {
      ...form,
      quantity: Number(form.quantity),
      rate_per_litre: Number(form.rate_per_litre)
    });
    alert("Fuel entry added");
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Add Fuel Entry</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Add fuel details for a vehicle</p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-1.1-.9-2-2-2-.36 0-.7.1-1 .23zM9 10H6V5h3v5z"/></svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle</label>
              <select 
                name="vehicle_number" 
                onChange={handleChange} 
                required 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                value={form.vehicle_number}
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_number} value={v.vehicle_number}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fuel Type</label>
              <select 
                name="fuel_type" 
                onChange={handleChange} 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                value={form.fuel_type}
              >
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity (Litres)</label>
              <input 
                name="quantity" 
                placeholder="0.00" 
                type="number"
                step="0.01"
                min="0"
                onChange={handleChange} 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300" 
                required 
                value={form.quantity}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rate (Rs. / Litre)</label>
              <input 
                name="rate_per_litre" 
                placeholder="0.00" 
                type="number"
                step="0.01"
                min="0"
                onChange={handleChange} 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300" 
                required 
                value={form.rate_per_litre}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fill Date</label>
              <input 
                name="filled_date" 
                type="date"
                onChange={handleChange} 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" 
                required 
                value={form.filled_date}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full h-16 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-blue-900/20 active:scale-[0.98]"
            >
              Save Fuel Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

