import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
        // Load payments for this trip
        api.get(`/payments/trip/${id}`)
          .then(r => setPayments(r.data))
          .catch(() => setPayments([]));
        
        // Load driver expenses
        api.get(`/driver-expenses/trip/${id}`)
          .then(r => setDriverExpenses(r.data))
          .catch(() => setDriverExpenses([]));
        
        // fetch customer and driver names (best-effort)
        if (res.data.customer_id) {
          api.get(`/customers/${res.data.customer_id}`)
            .then(r => setCustomerName(r.data.name))
            .catch(() => {});
        }
        if (res.data.driver_id) {
          api.get(`/drivers/${res.data.driver_id}`)
            .then(r => setDriverName(r.data.name || r.data.id))
            .catch(() => {});
        }
      } catch (e) {
        setError("Unable to load trip");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-6">Loading trip...</div>;
  if (error || !trip) return <div className="p-6 text-red-600">{error || "Trip not found"}</div>;

  const totalCharged = trip.total_charged ?? 0;
  const pending = trip.pending_amount ?? 0;
  const received = trip.amount_received ?? 0;
  const totalDriverExpenses = driverExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pricingLabel = trip.pricing_type === "package" ? "Package" : "Per KM";
  const pricingItems = (trip.pricing_items || []).filter(i => i.item_type !== "charge");
  const chargeItems = (trip.pricing_items || []).filter(i => i.item_type === "charge");
  const fuelTotal = (trip.diesel_used ?? 0) + (trip.petrol_used ?? 0);
  const fuelRate = trip.fuel_litres ? fuelTotal / trip.fuel_litres : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Trip {trip.invoice_number || trip.id}</h1>
            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${pending === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
              {pending === 0 ? "Settled" : "Outstanding"}
            </div>
          </div>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Digital Dispatch Manifest • Trip ID: {trip.id}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/trips/edit/${trip.id}`)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            Edit Trip
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

      {/* ---------- TRIP CORE INFO ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Trip Info
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <RowItem label="Trip Date" value={formatDateDDMMYYYY(trip.trip_date)} />
            <RowItem label="Vehicle" value={trip.vehicle_number} />
            <div className="col-span-2 flex items-center gap-4 py-4 px-6 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">From</p>
                <p className="text-sm font-black text-slate-700">{trip.from_location}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-px bg-slate-200 relative">
                   <div className="absolute -top-1 right-0 w-2 h-2 border-t border-r border-slate-400 rotate-45" />
                </div>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">To</p>
                <p className="text-sm font-black text-slate-700">{trip.to_location}</p>
              </div>
            </div>
            <RowItem label="Driver" value={driverName || "N/A"} />
            <RowItem label="Customer" value={customerName || "N/A"} />
            <RowItem label="Distance" value={`${trip.distance_km} km`} highlight />
            <RowItem label="Vendor" value={trip.vendor || "In-House"} />
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
            Billing Summary
          </h2>
          <div className="grid grid-cols-2 gap-6 pb-8 border-b border-slate-100">
            <RowItem label="Pricing Type" value={pricingLabel} />
            <RowItem label="Unit Velocity Cost" value={`₹${trip.cost_per_km}/KM`} />
            <RowItem label="Toll Charged" value={`₹${trip.charged_toll_amount}`} />
            <RowItem label="Parking Charged" value={`₹${trip.charged_parking_amount}`} />
          </div>
          <div className="pt-8 space-y-4">
            <div className="flex justify-between items-center group/row">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Charged</span>
              <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover:scale-105 transition-transform">₹{totalCharged.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Received</span>
              <span className="text-lg font-black text-emerald-600 tracking-tight">₹{received.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between items-center p-4 rounded-2xl ${pending > 0 ? "bg-rose-50 ring-1 ring-rose-100" : "bg-emerald-50 ring-1 ring-emerald-100"} transition-colors`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${pending > 0 ? "text-rose-500" : "text-emerald-500"}`}>Pending</span>
              <span className={`text-xl font-black tracking-tighter ${pending > 0 ? "text-rose-600" : "text-emerald-600"}`}>₹{pending.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- FINANCIAL LEDGERS ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PAYMENTS */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
            Payment History
          </h2>
          {payments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No payments found</div>
          ) : (
            <div className="space-y-4">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.payment_mode}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{formatDateDDMMYYYY(p.payment_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-emerald-600 tracking-tighter">₹{Number(p.amount).toLocaleString()}</p>
                    {p.notes && <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">{p.notes}</p>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-6 px-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Payments</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{totalPayments.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* INTERNAL COSTS */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
            Trip Expenses
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <CostChip label="Fuel" value={fuelTotal} color="orange" />
            <CostChip label="Toll" value={trip.toll_amount} color="slate" />
            <CostChip label="Parking" value={trip.parking_amount} color="slate" />
            <CostChip label="Other Expenses" value={trip.other_expenses} color="rose" />
            <CostChip label="Driver Bhatta" value={trip.driver_bhatta} color="blue" />
            <div className="col-span-2 mt-4 p-6 bg-slate-900 rounded-[2rem] flex justify-between items-center group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Trip Cost</p>
                <p className="text-2xl font-black text-white tracking-tighter">₹{Number(trip.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center relative z-10">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function RowItem({ label, value, highlight }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-base font-black ${highlight ? "text-blue-600" : "text-slate-800"} tracking-tight`}>{value || "---"}</p>
    </div>
  );
}

function CostChip({ label, value, color }) {
  return (
    <div className={`p-4 rounded-2xl bg-${color}-50/50 border border-${color}-100 flex flex-col`}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <span className={`text-sm font-black text-slate-800 tracking-tighter`}>₹{Number(value || 0).toLocaleString()}</span>
    </div>
  );
}


