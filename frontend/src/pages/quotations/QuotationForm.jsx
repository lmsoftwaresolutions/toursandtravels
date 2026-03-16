import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quotationService } from "../../services/quotationService";
import { numberToWords } from "../../utils/numberToWords";

export default function QuotationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    quotation_no: "",
    quotation_date: new Date().toISOString().split("T")[0],
    customer_name: "",
    address: "",
    mobile: "",
    tour_description: "",
    approx_km: "",
    rate_per_km: "",
    no_of_buses: 1,
    trip_cost: 0,
    mp_tax: 0,
    border_entry: 0,
    toll: 0,
    total_amount: 0,
    amount_in_words: ""
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadQuotation();
    }
  }, [id, isEdit]);

  const loadQuotation = async () => {
    try {
      const data = await quotationService.getById(id);
      setForm(data);
    } catch (error) {
      console.error("Error loading quotation:", error);
      alert("Failed to load quotation");
    }
  };

  useEffect(() => {
    const km = Number(form.approx_km || 0);
    const rate = Number(form.rate_per_km || 0);
    const tripCost = km * rate;
    
    const extraExp = Number(form.mp_tax || 0) + Number(form.border_entry || 0) + Number(form.toll || 0);
    const totalPerBus = tripCost + extraExp;
    const finalTotal = totalPerBus * Number(form.no_of_buses || 1);

    setForm(prev => ({
      ...prev,
      trip_cost: tripCost,
      total_amount: finalTotal,
      amount_in_words: numberToWords(finalTotal)
    }));
  }, [form.approx_km, form.rate_per_km, form.mp_tax, form.border_entry, form.toll, form.no_of_buses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await quotationService.update(id, form);
        alert("Quotation updated successfully");
      } else {
        await quotationService.create(form);
        alert("Quotation created successfully");
      }
      navigate("/quotations");
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Error saving quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate("/quotations")}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Quotation List
          </button>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{isEdit ? "Edit Quotation" : "Create Quotation"}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
        <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Basic Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Field label="Quotation No" name="quotation_no" value={form.quotation_no} onChange={handleChange} required />
            <Field label="Quotation Date" name="quotation_date" value={form.quotation_date} onChange={handleChange} type="date" required />
            <Field label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} required />
            <Field label="Address" name="address" value={form.address} onChange={handleChange} className="md:col-span-2" />
            <Field label="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} />
          </div>
        </div>

        <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Tour Description & Calculations
          </h3>
          
          <div className="space-y-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tour Description</label>
            <textarea
              name="tour_description"
              value={form.tour_description}
              onChange={handleChange}
              rows="3"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
              placeholder="e.g. Ahmednagar - Ashti - Malegaon - Zambuwa - Back"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Field label="Approx KM" name="approx_km" value={form.approx_km} onChange={handleChange} type="number" />
            <Field label="Rate per KM" name="rate_per_km" value={form.rate_per_km} onChange={handleChange} type="number" />
            <Field label="No of Buses" name="no_of_buses" value={form.no_of_buses} onChange={handleChange} type="number" />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Cost</label>
              <div className="h-12 flex items-center px-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-700">
                ₹{form.trip_cost.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Extra Expenses
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Field label="MP TAX" name="mp_tax" value={form.mp_tax} onChange={handleChange} type="number" />
            <Field label="BORDER ENTRY" name="border_entry" value={form.border_entry} onChange={handleChange} type="number" />
            <Field label="TOLL (APROX)" name="toll" value={form.toll} onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="glass-card p-10 rounded-[2.5rem] border border-slate-900 bg-slate-900 text-white space-y-8 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="w-full md:w-2/3 space-y-4">
              <h3 className="text-xl font-black text-blue-400 tracking-tight flex items-center gap-2">
                Total Amount in Words
              </h3>
              <p className="text-lg font-bold text-slate-300 italic">Rupees {form.amount_words || form.amount_in_words}</p>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Total Amount</h3>
              <div className="text-5xl font-black tracking-tighter text-white">
                ₹{form.total_amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-14 bg-blue-600 text-white font-black text-[12px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? "SAVING..." : (isEdit ? "UPDATE QUOTATION" : "SAVE QUOTATION")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
      />
    </div>
  );
}
