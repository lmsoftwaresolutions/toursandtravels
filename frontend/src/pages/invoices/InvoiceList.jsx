import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function InvoiceList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");

  useEffect(() => {
    loadTrips();
    loadCustomers();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips");
      setTrips(res.data);
    } catch (error) {
      console.error("Error loading trips:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  let filteredTrips = filterCustomer
    ? trips.filter(t => t.customer_id === Number(filterCustomer))
    : trips;

  if (searchCustomer.trim()) {
    const query = searchCustomer.trim().toLowerCase();
    filteredTrips = filteredTrips.filter(t => {
      const name = customers.find(c => c.id === t.customer_id)?.name || "";
      return name.toLowerCase().includes(query);
    });
  }

  if (searchInvoice.trim()) {
    const query = searchInvoice.trim().toLowerCase();
    filteredTrips = filteredTrips.filter(t => {
      const invoice = String(t.invoice_number || `INV-${String(t.id).padStart(4, "0")}`);
      return invoice.toLowerCase().includes(query);
    });
  }

  const totalInvoiced = filteredTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0);
  const totalPaid = filteredTrips.reduce((sum, t) => sum + (t.amount_received || 0), 0);
  const totalPending = filteredTrips.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Invoices</h1>
          <p className="text-slate-500 font-medium mt-1">View and manage bills for all trips</p>
        </div>
      </div>

      {/* ---------- SUMMARY CARDS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <KPI CardTitle="Total Billed" CardValue={`₹${totalInvoiced.toLocaleString()}`} CardNote="Total across filtered invoices" Color="blue" />
        <KPI CardTitle="Total Paid" CardValue={`₹${totalPaid.toLocaleString()}`} CardNote="Amount collected from customers" Color="emerald" />
        <KPI CardTitle="Balance Due" CardValue={`₹${totalPending.toLocaleString()}`} CardNote="Amount yet to be settled" Color="rose" />
      </div>

      {/* ---------- FILTERS & SEARCH ---------- */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-100/30 p-4 rounded-3xl border border-slate-100">
        <div className="relative group w-full md:w-64">
          <select
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <input
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              placeholder="Search Customer..."
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
            />
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="relative flex-1 max-w-sm">
            <input
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              placeholder="Search Invoice #..."
              value={searchInvoice}
              onChange={e => setSearchInvoice(e.target.value)}
            />
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-[2rem] overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 uppercase">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Invoice</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Customer</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Payment Status</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTrips.length === 0 ? (
                <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No invoices found</td></tr>
              ) : (
                filteredTrips.map(trip => {
                  const customer = customers.find(c => c.id === trip.customer_id);
                  const status = trip.pending_amount === 0 ? "Settled" : trip.pending_amount === trip.total_charged ? "Outstanding" : "Partial";

                  return (
                    <tr key={trip.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="p-6">
                        <button
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="text-sm font-black text-blue-600 hover:text-blue-700 tracking-tighter"
                        >
                          {trip.invoice_number || `INV-${trip.id}`}
                        </button>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Vehicle: {trip.vehicle_number}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-700">{customer?.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDateDDMMYYYY(trip.trip_date)}</div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border mb-2 shadow-sm transition-colors cursor-default"
                          style={{
                            backgroundColor: status === "Settled" ? "#ecfdf5" : status === "Outstanding" ? "#fef2f2" : "#fffbeb",
                            color: status === "Settled" ? "#059669" : status === "Outstanding" ? "#dc2626" : "#d97706",
                            borderColor: status === "Settled" ? "#d1fae5" : status === "Outstanding" ? "#fee2e2" : "#fef3c7"
                          }}>
                          {status}
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-black text-slate-800 tracking-tight">₹{trip.total_charged?.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Due: ₹{trip.pending_amount?.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/invoices/${trip.id}`)}
                            className="p-3 bg-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                          >
                            View Invoice
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${trip.id}?print=true`)}
                            className="p-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                          >
                            Print / PDF
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
      </div>
    </div>
  );
}

function KPI({ CardTitle, CardValue, CardNote, Color }) {
  const colorClass = Color === "emerald" ? "text-emerald-600" : Color === "rose" ? "text-rose-600" : "text-blue-600";
  const bgClass = Color === "emerald" ? "bg-emerald-50" : Color === "rose" ? "bg-rose-50" : "bg-blue-50";
  const borderClass = Color === "emerald" ? "border-emerald-100" : Color === "rose" ? "border-rose-100" : "border-blue-100";

  return (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{CardTitle}</p>
      <p className={`text-3xl font-black tracking-tighter ${colorClass}`}>{CardValue}</p>
      <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${bgClass} ${colorClass} ${borderClass}`}>
        {CardNote}
      </div>
    </div>
  );
}
