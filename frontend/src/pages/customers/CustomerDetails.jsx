import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState("");
  const [error, setError] = useState("");

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
  if (!customer) return <p>Loading...</p>;

  const filteredTrips = searchInvoice.trim()
    ? trips.filter(t =>
        String(t.invoice_number || "").toLowerCase().includes(searchInvoice.trim().toLowerCase())
      )
    : trips;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Client Intelligence</h1>
          <p className="text-slate-500 font-medium mt-1">Relationship management and financial oversight</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/customers/edit/${id}`)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit Profile
          </button>
          <button
            onClick={() => navigate("/customers")}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 transition-all text-sm"
          >
            Network Directory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-8 rounded-[2rem] border border-slate-100 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.21 1.87 1.32 0 2.14-.65 2.14-1.44 0-.89-.74-1.28-2.13-1.63-1.66-.4-3.66-.99-3.66-3.21 0-1.85 1.5-3.09 3.27-3.4V5h2.67v1.91c1.47.28 2.7 1.25 2.87 2.9h-1.96c-.17-.89-.74-1.57-1.94-1.57-1.2 0-1.97.56-1.97 1.34 0 .76.62 1.13 2.05 1.51 1.63.43 3.75 1.04 3.75 3.33 0 1.94-1.42 3.19-3.32 3.52z"/></svg>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Partner Client</p>
          <p className="text-2xl font-black text-slate-800 mt-2 tracking-tight">{customer.name}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
            Enterprise Grade
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-blue-100 bg-blue-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Engagements</p>
          <p className="text-4xl font-black text-blue-600 mt-2 tracking-tighter">{customer.total_trips}</p>
          <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-tighter">Total Missions</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-emerald-100 bg-emerald-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Yield Realized</p>
          <p className="text-4xl font-black text-emerald-600 mt-2 tracking-tighter">₹ {((customer.total_billed ?? 0) - (customer.pending_balance ?? 0)).toFixed(0)}</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-tighter">Total Remittances</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-rose-100 bg-rose-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">Market Exposure</p>
          <p className="text-4xl font-black text-rose-600 mt-2 tracking-tighter">₹ {customer.pending_balance?.toFixed(0)}</p>
          <p className="text-[10px] font-bold text-rose-400 mt-2 uppercase tracking-tighter">Outstanding Balance</p>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Trips & Payments</h2>
        <div className="mb-3">
          <input
            className="border p-2 rounded w-full md:w-80"
            placeholder="Search by Invoice Number"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
          />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Invoice #</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">From</th>
                <th className="p-2 text-left">To</th>
                <th className="p-2 text-left">Distance</th>
                <th className="p-2 text-left">Total Charged</th>
                <th className="p-2 text-left">Received</th>
                <th className="p-2 text-left">Pending</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-3 text-center text-gray-500">
                    No trips yet
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2 font-semibold text-blue-600">
                      {t.invoice_number || "N/A"}
                    </td>
                    <td className="p-2">{formatDateDDMMYYYY(t.trip_date)}</td>
                    <td className="p-2">{t.from_location}</td>
                    <td className="p-2">{t.to_location}</td>
                    <td className="p-2">{t.distance_km} km</td>
                    <td className="p-2">
                      ₹{(t.total_charged ?? 0).toFixed(2)}
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-black text-slate-800 tracking-tight">₹{(t.total_charged ?? 0).toFixed(2)}</span>
                    </td>
                    <td className="p-6 text-right">
                      <span className={`text-sm font-black tracking-tight ${t.pending_amount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{(t.pending_amount ?? 0).toFixed(2)}
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
