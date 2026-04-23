import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState("");
  const [error, setError] = useState("");
  const canWrite = !authService.hasLimitedAccess();

  useEffect(() => {
    api
      .get(`/customers/${id}/trips`)
      .then((res) => {
        setCustomer(res.data.customer);
        setTrips(res.data.trips);
      })
      .catch(() => setError("Unable to load customer"));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!customer) return <p className="p-10 text-center font-black animate-pulse">Loading customer...</p>;

  const filteredTrips = searchInvoice.trim()
    ? trips.filter(t =>
      String(t.invoice_number || "").toLowerCase().includes(searchInvoice.trim().toLowerCase())
    )
    : trips;

  const getPartyFuelCredit = (trip) =>
    (trip.vehicles || []).reduce((sum, vehicle) => {
      const directCredit = Number(vehicle.vendor_deduction_amount || 0);
      const entryCredits = (vehicle.expenses || []).reduce(
        (subtotal, exp) => subtotal + Number(exp.amount || 0),
        0
      );
      return sum + directCredit + entryCredits;
    }, 0);

  const getTripDueAmount = (trip) => {
    const totalCharged = Number(trip?.total_charged || 0);
    const received = Number(trip?.amount_received || 0);
    return Math.max(totalCharged - received - getPartyFuelCredit(trip), 0);
  };

  const totalCustomerDue = filteredTrips.reduce((sum, trip) => sum + getTripDueAmount(trip), 0);
  const totalCustomerBilled = filteredTrips.reduce((sum, trip) => sum + Number(trip.total_charged || 0), 0);
  const totalCustomerPaid = Math.max(totalCustomerBilled - totalCustomerDue, 0);
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Customer Details</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Customer trips and payments</p>
        </div>

        <div className="flex gap-3">
          {canWrite ? (
            <button
              onClick={() => navigate(`/customers/edit/${id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Customer
            </button>
          ) : null}
          <button
            onClick={() => navigate("/customers")}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 transition-all text-sm"
          >
            All Customers
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-8 rounded-[2rem] border border-slate-100 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.21 1.87 1.32 0 2.14-.65 2.14-1.44 0-.89-.74-1.28-2.13-1.63-1.66-.4-3.66-.99-3.66-3.21 0-1.85 1.5-3.09 3.27-3.4V5h2.67v1.91c1.47.28 2.7 1.25 2.87 2.9h-1.96c-.17-.89-.74-1.57-1.94-1.57-1.2 0-1.97.56-1.97 1.34 0 .76.62 1.13 2.05 1.51 1.63.43 3.75 1.04 3.75 3.33 0 1.94-1.42 3.19-3.32 3.52z" /></svg>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Customer</p>
          <p className="text-2xl font-black text-slate-800 mt-2 tracking-tight">{customer.name}</p>
          {(customer.phone || customer.alternate_phone || customer.email || customer.address) && (
            <div className="mt-3 space-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {customer.phone && <div>Phone: {customer.phone}</div>}
              {customer.alternate_phone && <div>Alt Phone: {customer.alternate_phone}</div>}
              {customer.email && <div>Email: {customer.email}</div>}
              {customer.address && <div>Address: {customer.address}</div>}
            </div>
          )}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
            Regular Customer
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-blue-100 bg-blue-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Trips</p>
          <p className="text-4xl font-black text-blue-600 mt-2 tracking-tighter">{customer.total_trips}</p>
          <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-tighter">Total Trips</p>
        </div>

          <div className="glass-card p-8 rounded-[2rem] border border-emerald-100 bg-emerald-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Amount Paid</p>
          <p className="text-4xl font-black text-emerald-600 mt-2 tracking-tighter">₹ {totalCustomerPaid.toFixed(0)}</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-tighter">Total Paid</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-rose-100 bg-rose-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">Balance Due</p>
          <p className="text-4xl font-black text-rose-600 mt-2 tracking-tighter">₹ {totalCustomerDue.toFixed(0)}</p>
          <p className="text-[10px] font-bold text-rose-400 mt-2 uppercase tracking-tighter">Balance Due</p>
        </div>
      </div>

      {/* Mission Registry Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-100 bg-white shadow-sm">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Trip Details
          </h3>
          <div className="relative group w-full md:w-96">
            <input
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              placeholder="Search by invoice no..."
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Invoice No</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Trip Date</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Route</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Distance</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Total Amount</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTrips.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No trips found</td></tr>
              ) : (
                filteredTrips.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/40 transition-colors cursor-pointer" onClick={() => navigate(`/trips/${t.id}`)}>
                    <td className="p-6">
                      <span className="text-sm font-black text-blue-600 tracking-tight">#{t.invoice_number || "AUDIT"}</span>
                    </td>
                    <td className="p-6">
                      <span className="text-xs font-bold text-slate-500">{formatDateDDMMYYYY(t.trip_date)}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{t.from_location}</span>
                        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{t.to_location}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.distance_km} KM</span>
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-black text-slate-800 tracking-tight">₹{(t.total_charged ?? 0).toFixed(2)}</span>
                    </td>
                    <td className="p-6 text-right">
                      <span className={`text-sm font-black tracking-tight ${getTripDueAmount(t) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{getTripDueAmount(t).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
