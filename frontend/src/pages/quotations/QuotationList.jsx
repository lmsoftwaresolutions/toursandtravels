import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quotationService } from "../../services/quotationService";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";
import Pagination from "../../components/common/Pagination";

export default function QuotationList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin] = useState(authService.isAdmin());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const canWrite = !authService.hasLimitedAccess();

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const data = await quotationService.getAll();
      setQuotations(data);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await quotationService.delete(id);
        loadQuotations();
      } catch (error) {
        console.error("Error deleting quotation:", error);
        alert("Failed to delete quotation");
      }
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [quotations.length]);

  const paginatedQuotations = quotations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate("/invoices")}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all mb-4"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back to Invoices
          </button>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Quotations</h1>
          <p className="text-slate-500 font-medium mt-1">Manage tour and travel quotations</p>
        </div>
        <div>
          <button
            onClick={() => navigate("/quotations/add")}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
          >
            + Create Quotation
          </button>
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-[2rem] overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 uppercase">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Quotation No</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Customer</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Date</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Total Amount</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No quotations found</td></tr>
              ) : (
                paginatedQuotations.map(q => (
                  <tr key={q.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-6">
                      <div className="text-sm font-black text-blue-600">{q.quotation_no}</div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{q.tour_description?.substring(0, 30)}...</div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-black text-slate-700">{q.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{q.mobile}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-medium text-slate-600">{formatDateDDMMYYYY(q.quotation_date)}</div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="text-sm font-black text-slate-800 tracking-tight">₹{q.total_amount?.toLocaleString()}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/quotations/view/${q.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {canWrite ? (
                          <button
                            onClick={() => navigate(`/quotations/edit/${q.id}`)}
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        ) : null}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={quotations.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
