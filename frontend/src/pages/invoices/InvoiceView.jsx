import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import PrintLayout from "../../components/print/PrintLayout";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      const tripRes = await api.get(`/trips/${id}`);
      setTrip(tripRes.data);

      const customerRes = await api.get("/customers");
      setCustomer(
        customerRes.data.find(c => c.id === tripRes.data.customer_id)
      );

      const vehicleRes = await api.get("/vehicles");
      setVehicle(
        vehicleRes.data.find(v => v.vehicle_number === tripRes.data.vehicle_number)
      );

      const driverRes = await api.get("/drivers");
      setDriver(
        driverRes.data.find(d => d.id === tripRes.data.driver_id)
      );
    } catch (error) {
      console.error("Error loading invoice:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (searchParams.get("print") === "true" && trip && customer) {
      setPrintTimestamp(new Date().toLocaleString());
      setTimeout(() => handlePrint(), 150);
    }
  }, [searchParams, trip, customer]);

  if (!trip || !customer) {
    return <div className="p-4 md:p-6">Loading invoice...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* TOP ACTIONS */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 no-print">
        <button
          onClick={() => navigate("/invoices")}
          className="text-blue-600 text-sm"
        >
          ← Back to Invoices
        </button>
        <button
          onClick={() => setShowPrintModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Print / Download PDF
        </button>
      </div>

      {/* INVOICE VIEW */}
      <InvoiceContent />

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center no-print">
        <button
          onClick={() => setShowPrintModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          🖨️ Print Invoice
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="bg-gray-300 px-6 py-2 rounded"
        >
          Back
        </button>
      </div>

      <PrintLayout>
        <div className="text-center font-black text-2xl tracking-widest uppercase mb-8 border-y-2 border-slate-900 py-2">
           TAX INVOICE
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 border-2 border-slate-900 p-6">
          <div className="border-r-2 border-slate-900 pr-6">
            <h2 className="text-[12px] font-black uppercase mb-3 text-red-600">Bill To:</h2>
            <p className="text-xl font-black text-slate-900 leading-tight">{customer.name}</p>
            <p className="text-[12px] font-bold text-slate-700 mt-2">{customer.address || "No Address Provided"}</p>
            {customer?.phone ? <p className="text-[12px] font-bold text-slate-700">Phone: {customer.phone}</p> : null}
          </div>
          <div className="pl-6 space-y-2">
            <div className="flex justify-between items-center bg-slate-100 p-2 px-4 rounded border border-slate-200">
               <span className="font-black text-[10px] uppercase">Invoice No:</span>
               <span className="font-black text-sm">{trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}</span>
            </div>
            <div className="flex justify-between items-center p-2 px-4">
               <span className="font-black text-[10px] uppercase">Date:</span>
               <span className="font-black text-sm">{formatDateDDMMYYYY(trip.trip_date)}</span>
            </div>
            {printTimestamp ? <p className="text-[8px] text-right text-slate-400 italic">Printed: {printTimestamp}</p> : null}
          </div>
        </div>

        <div className="border-2 border-slate-900 border-collapse mb-8 overflow-hidden rounded-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest w-12 border-r border-slate-700">Sr.</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700">Description</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700 w-24">Qty / KM</th>
                <th className="p-3 text-left font-black text-[10px] uppercase tracking-widest border-r border-slate-700 text-right w-32">Rate</th>
                <th className="p-3 font-black text-[10px] uppercase tracking-widest text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {invoiceRows.map((row, idx) => {
                return (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="p-4 py-3 text-[11px] font-bold text-slate-500 border-r-2 border-slate-100">{idx + 1}</td>
                    <td className="p-4 py-3 text-[12px] font-black text-slate-800 border-r-2 border-slate-100 uppercase">{row.description}</td>
                    <td className="p-4 py-3 text-[11px] font-bold text-slate-500 border-r-2 border-slate-100 uppercase">{row.quantity}</td>
                    <td className="p-4 py-3 text-[11px] font-bold text-slate-500 border-r-2 border-slate-100 text-right">{row.unitPrice}</td>
                    <td className="p-4 py-3 text-[12px] font-black text-slate-900 text-right">
                      {`${row.total < 0 ? "- " : ""}Rs. ${Math.abs(Number(row.total || 0)).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
              {/* Filler Rows to maintain layout */}
              {[...Array(Math.max(0, 8 - invoiceRows.length))].map((_, i) => (
                <tr key={`filler-${i}`} className="h-10">
                   <td className="border-r-2 border-slate-100"></td>
                   <td className="border-r-2 border-slate-100"></td>
                   <td className="border-r-2 border-slate-100"></td>
                   <td className="border-r-2 border-slate-100"></td>
                   <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50">
                <td colSpan="4" className="p-2 text-right font-black text-[9px] uppercase tracking-widest border-r-2 border-slate-900">Total Amount Due</td>
                <td className="p-2 text-right text-base font-black text-red-600">Rs. {(trip.total_charged || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="p-4 border-2 border-slate-100 rounded-lg bg-slate-50/50">
              <h3 className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Payment Summary</h3>
              <div className="space-y-1">
                 <div className="flex justify-between text-xs font-bold">
                    <span>Paid Amount:</span>
                    <span className="text-emerald-700">Rs. {totalPaid.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1">
                    <span>Balance Due:</span>
                    <span className="text-red-700 underline underline-offset-2 decoration-2">Rs. {balanceDue.toFixed(2)}</span>
                 </div>
              </div>
           </div>
           <div className="flex flex-col justify-end text-right italic text-slate-400 text-[10px]">
              * This is a computer generated invoice and does not require signature unless printed for official use.
           </div>
        </div>
      </PrintLayout>
    </div>
  );
}
