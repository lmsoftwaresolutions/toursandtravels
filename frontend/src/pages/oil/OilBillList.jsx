import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import Pagination from "../../components/common/Pagination";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

export default function OilBillList() {
  const navigate = useNavigate();
  const canWrite = !authService.hasLimitedAccess();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/oil-bills");
      setBills(res.data || []);
    } catch {
      alert("Failed to load oil bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const paginatedBills = useMemo(
    () => bills.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [bills, currentPage]
  );

  const handleDelete = async (id) => {
    if (!canWrite) return;
    if (!window.confirm("Delete this oil bill?")) return;
    try {
      await api.delete(`/oil-bills/${id}`);
      await loadBills();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete oil bill");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Oil Bills</h1>
          <p className="text-slate-500 font-medium mt-1">Track oil purchase bills with multiple vehicle entries</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/oil/add")}
          className="h-12 px-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
        >
          Add Oil Bill
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden min-h-[420px]">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading...</div>
        ) : (
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Bill No</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Date</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicles</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Grand Total</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    No oil bills found
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill) => (
                  <tr key={bill.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-700">{bill.bill_number}</td>
                    <td className="p-6 text-sm font-bold text-slate-600">{bill.vendor_name}</td>
                    <td className="p-6 text-sm font-bold text-slate-600">{formatDateDDMMYYYY(bill.bill_date)}</td>
                    <td className="p-6 text-sm font-bold text-slate-600">{bill.total_vehicles || 0}</td>
                    <td className="p-6 text-sm font-black text-slate-800">Rs. {Number(bill.grand_total_amount || 0).toFixed(2)}</td>
                    <td className="p-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                        {bill.payment_status || "unpaid"}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => navigate(`/oil/${bill.id}`)}
                          className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all"
                        >
                          View
                        </button>
                        {canWrite ? (
                          <>
                            <button
                              onClick={() => navigate(`/oil/edit/${bill.id}`)}
                              className="px-4 py-2 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-100 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(bill.id)}
                              className="px-4 py-2 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={bills.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
