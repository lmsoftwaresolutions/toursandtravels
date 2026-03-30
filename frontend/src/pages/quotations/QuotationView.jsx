import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { quotationService } from "../../services/quotationService";
import { formatDateDDMMYYYY } from "../../utils/date";
import PrintLayout from "../../components/print/PrintLayout";

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      const data = await quotationService.getById(id);
      setQuotation(data);
    } catch (error) {
      console.error("Error loading quotation:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!quotation) return <div className="p-8">Loading quotation...</div>;

  return (
    <div className="p-8 space-y-8 print:p-0 print:space-y-4">
      <div className="no-print flex justify-between items-center bg-slate-100/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <button
          onClick={() => navigate("/quotations")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          Back to List
        </button>
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg border border-blue-600 hover:bg-black hover:border-black transition-all"
          >
            Print / PDF
          </button>
        </div>
      </div>

      <PrintLayout>
        <div className="text-center font-black text-2xl tracking-widest uppercase mb-8 print:mb-4 border-y-2 border-slate-900 py-2">
           QUOTATION
        </div>

        <div className="grid grid-cols-2 gap-8 print:gap-4 mb-8 print:mb-4 border-2 border-slate-900 p-6 print:p-4">
          <div className="border-r-2 border-slate-900 pr-6">
            <h2 className="text-[12px] font-black uppercase mb-3 text-red-600">To:</h2>
            <p className="text-xl font-black text-slate-900">{quotation.customer_name}</p>
            <p className="text-[12px] font-bold text-slate-700 mt-2">{quotation.address}</p>
            {quotation.mobile ? <p className="text-[12px] font-bold text-slate-700">Mob.: {quotation.mobile}</p> : null}
          </div>
          <div className="pl-6 space-y-2">
            <div className="flex justify-between items-center bg-slate-100 p-2 px-4 rounded border border-slate-200">
               <span className="font-black text-[10px] uppercase">Quotation No:</span>
               <span className="font-black text-sm">{quotation.quotation_no}</span>
            </div>
            <div className="flex justify-between items-center p-2 px-4">
               <span className="font-black text-[10px] uppercase">Date:</span>
               <span className="font-black text-sm">{formatDateDDMMYYYY(quotation.quotation_date)}</span>
            </div>
            {quotation.vehicle_type ? (
              <div className="flex justify-between items-center p-2 px-4">
                <span className="font-black text-[10px] uppercase text-slate-500">Vehicle Type:</span>
                <span className="font-black text-sm text-slate-800 uppercase">{quotation.vehicle_type}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-2 border-slate-900 border-collapse mb-8 print:mb-4 overflow-hidden rounded-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest w-12 border-r border-slate-700">Sr.</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700">Particulars</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700 w-24">Buses</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700 w-24">Rate/KM</th>
                <th className="p-3 font-black text-[10px] uppercase tracking-widest text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top min-h-[400px]">
                <td className="p-4 py-3 text-[11px] font-bold text-slate-500 border-r-2 border-slate-100">1</td>
                <td className="p-4 py-3 space-y-4 border-r-2 border-slate-100">
                   <div className="font-black text-[12px] uppercase underline underline-offset-4 decoration-2">Tour Description</div>
                   <div className="text-[13px] font-black text-slate-800 uppercase leading-relaxed">{quotation.tour_description}</div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] font-black uppercase text-slate-500">
                      <div>
                         <p>Approx KM: <span className="text-slate-900">{quotation.approx_km}</span></p>
                         <p>Rate per KM: <span className="text-slate-900">₹ {quotation.rate_per_km}</span></p>
                      </div>
                   </div>
                </td>
                <td className="p-4 py-3 text-[12px] font-black text-slate-900 text-center border-r-2 border-slate-100">{quotation.no_of_buses}</td>
                <td className="p-4 py-3 text-[12px] font-black text-slate-900 text-center border-r-2 border-slate-100">₹ {quotation.rate_per_km}</td>
                <td className="p-4 py-3 text-[13px] font-black text-slate-900 text-right">₹ {quotation.trip_cost?.toLocaleString()}</td>
              </tr>
              
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-black">
                <td colSpan="2" className="p-3 text-right text-[10px] uppercase border-r-2 border-slate-900">Trip Subtotal</td>
                <td className="p-3 text-center border-r-2 border-slate-100 font-bold">{quotation.no_of_buses} Bus</td>
                <td className="border-r-2 border-slate-100"></td>
                <td className="p-3 text-right text-sm">₹ {quotation.trip_cost?.toLocaleString()}</td>
              </tr>

              <tr className="border-t border-slate-100">
                <td colSpan="2" className="border-r-2 border-slate-900"></td>
                <td className="p-2 border-r-2 border-slate-100 text-[10px] font-black uppercase text-slate-400">Other Exp.</td>
                <td className="p-2 border-r-2 border-slate-100 text-[10px] font-bold uppercase">Border Entry</td>
                <td className="p-2 text-right text-[12px] font-black">₹ {quotation.border_entry?.toLocaleString()}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td colSpan="2" className="border-r-2 border-slate-900"></td>
                <td className="border-r-2 border-slate-100"></td>
                <td className="p-2 border-r-2 border-slate-100 text-[10px] font-bold uppercase">Toll (Approx)</td>
                <td className="p-2 text-right text-[12px] font-black">₹ {quotation.toll?.toLocaleString()}</td>
              </tr>

              <tr className="border-t-2 border-slate-900 bg-slate-900 text-white">
                <td colSpan="4" className="p-4 text-right font-black text-[12px] uppercase tracking-widest border-r-2 border-slate-700">Total Net Amount</td>
                <td className="p-4 text-right text-lg font-black italic">₹ {quotation.total_amount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {quotation.notes ? (
          <div className="border-2 border-emerald-100 p-4 rounded-xl bg-emerald-50/40 mb-6 print:mb-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Notes</div>
            <div className="text-[12px] font-bold text-slate-700">{quotation.notes}</div>
          </div>
        ) : null}

        <div className="border-2 border-slate-200 p-6 print:p-4 rounded-xl bg-slate-50/50 mb-8 print:mb-4">
           <div className="flex gap-4 items-center">
              <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest min-w-[100px]">Amount in Words:</span>
              <span className="font-black text-sm uppercase text-slate-800">Rupees {quotation.amount_in_words} Only</span>
           </div>
        </div>
      </PrintLayout>
    </div>
  );
}
