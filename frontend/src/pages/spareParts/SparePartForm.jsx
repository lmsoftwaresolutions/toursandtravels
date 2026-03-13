import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function SparePartForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // 👈 detect edit mode

  const [vehicles, setVehicles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorCategory, _setVendorCategory] = useState("spare_parts"); // Track selected category
  const [form, setForm] = useState({
    vehicle_number: "",
    part_name: "",
    cost: "",
    quantity: 1,
    vendor: "",
    replaced_date: ""
  });

  /* ---------- LOAD VEHICLES ---------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  /* ---------- LOAD VENDORS BY CATEGORY ---------- */
  useEffect(() => {
    if (vendorCategory) {
      api
        .get("/vendors", { params: { category: vendorCategory } })
        .then(res => setVendors(res.data));
    }
  }, [vendorCategory]);

  /* ---------- LOAD EXISTING DATA (EDIT MODE) ---------- */
  useEffect(() => {
    if (id) {
      api.get(`/spare-parts/${id}`).then(res => {
        setForm({
          vehicle_number: res.data.vehicle_number,
          part_name: res.data.part_name,
          cost: res.data.cost,
          quantity: res.data.quantity,
          vendor: res.data.vendor || "",
          replaced_date: res.data.replaced_date
        });
      });
    }
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();

    const payload = {
      ...form,
      cost: Number(form.cost),
      quantity: Number(form.quantity)
    };

    if (id) {
      // ✏️ EDIT
      await api.put(`/spare-parts/${id}`, payload);
      alert("Spare part updated successfully");
    } else {
      // ➕ ADD
      await api.post("/spare-parts", payload);
      alert("Spare part added successfully");
    }

    navigate("/spare-parts");
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{id ? "Refine Component" : "Register Component"}</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Lifecycle Management for Mechanical Assets</p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-10 1c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Allocation</label>
              <select
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">Select Targeted Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_number} value={v.vehicle_number}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Component Designation</label>
              <input
                name="part_name"
                placeholder="Ex: Brake Pad Set"
                value={form.part_name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Valuation (Cost)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={handleChange}
                  required
                  className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inventory Quota (Quantity)</label>
              <input
                name="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Acquisition Channel (Vendor)</label>
              <div className="flex gap-2">
                <select
                  name="vendor"
                  value={form.vendor}
                  onChange={handleChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate("/vendors")}
                  className="px-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center shadow-inner"
                >
                  <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Install Date</label>
              <input
                name="replaced_date"
                type="date"
                value={form.replaced_date}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/spare-parts")}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98]"
            >
              {id ? "Save Changes" : "Save Spare Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
