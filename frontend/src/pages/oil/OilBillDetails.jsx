import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

export default function OilBillDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const canWrite = !authService.hasLimitedAccess();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/oil-bills/${id}`);
        setBill(res.data || null);
      } catch {
        alert("Failed to load oil bill details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const rows = useMemo(
    () => [...(bill?.entries || [])].sort((a, b) => Number(a.row_order || 0) - Number(b.row_order || 0)),
    [bill]
  );

  if (loading) return <div className="p-6 text-gray-500">Loading oil bill details...</div>;
  if (!bill) return <div className="p-6 text-gray-500">Oil bill not found.</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/oil")}
            className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
          >
            Back to Oil Bills
          </button>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Bill {bill.bill_number}</h1>
          <p className="text-slate-500 font-medium mt-1">Vendor: {bill.vendor_name}</p>
        </div>
        {canWrite ? (
          <button
            onClick={() => navigate(`/oil/edit/${bill.id}`)}
            className="h-12 px-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
          >
            Edit Bill
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoCard label="Bill Date" value={formatDateDDMMYYYY(bill.bill_date)} />
        <InfoCard label="Payment Status" value={bill.payment_status || "-"} />
        <InfoCard label="Payment Mode" value={bill.payment_mode || "-"} />
        <InfoCard label="Total Vehicles" value={String(bill.total_vehicles || 0)} />
        <InfoCard label="Grand Total" value={`Rs. ${Number(bill.grand_total_amount || 0).toFixed(2)}`} />
        <InfoCard label="Note" value={bill.overall_note || "-"} />
      </div>

      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">Vehicle Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Particular</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Liters</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="p-6 text-sm font-black text-slate-700">{entry.vehicle_number}</td>
                  <td className="p-6 text-sm font-bold text-slate-600">{entry.particular_name}</td>
                  <td className="p-6 text-sm font-bold text-slate-600">{Number(entry.liters || 0).toFixed(2)}</td>
                  <td className="p-6 text-sm font-bold text-slate-600">Rs. {Number(entry.rate || 0).toFixed(2)}</td>
                  <td className="p-6 text-sm font-black text-slate-800">Rs. {Number(entry.total_amount || 0).toFixed(2)}</td>
                  <td className="p-6 text-sm font-medium text-slate-500">{entry.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-lg font-black text-slate-700 break-words">{value}</p>
    </div>
  );
}
