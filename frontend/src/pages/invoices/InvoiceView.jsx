import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import PrintLayout from "../../components/print/PrintLayout";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [trip, setTrip] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [printTimestamp, setPrintTimestamp] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = useCallback(async () => {
    try {
      const tripRes = await api.get(`/trips/${id}`);
      setTrip(tripRes.data);

      const customerRes = await api.get("/customers");
      setCustomer(
        customerRes.data.find((c) => c.id === tripRes.data.customer_id)
      );
    } catch (error) {
      console.error("Error loading invoice:", error);
    }
  }, [id]);

  useEffect(() => {
    const refreshOnFocus = () => loadInvoiceData();
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        loadInvoiceData();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [loadInvoiceData]);

  const getTripDays = () => {
    if (!trip || !trip.departure_datetime || !trip.return_datetime) return 1;
    const start = new Date(`${trip.departure_datetime.split("T")[0]}T00:00:00`);
    const end = new Date(`${trip.return_datetime.split("T")[0]}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const invoiceRows = useMemo(() => {
    if (!trip) return [];

    const tripDays = getTripDays();
    const pricingItems = (trip.pricing_items || []).filter((item) => item.item_type === "pricing");
    const chargeItems = (trip.pricing_items || []).filter((item) => item.item_type === "charge");
    const vehicles = Number(trip.number_of_vehicles || 1);
    const computedFareAmount = trip.pricing_type === "package"
      ? Number(trip.package_amount || 0) * vehicles * tripDays
      : Number(trip.distance_km || 0) * Number(trip.cost_per_km || 0);

    const computedFareLabel = trip.pricing_type === "package" ? "Package Fare" : "Base Fare";

    // For per_km, we show (total_distance / vehicles) to clarify it's per-vehicle distance
    // if that matches the quantity label logic.
    const distancePerVehicle = Number(trip.distance_km || 0) / vehicles;

    const computedFareQuantity = trip.pricing_type === "package"
      ? `${tripDays} day(s) x ${vehicles} vehicle(s)`
      : `${distancePerVehicle.toFixed(1)} km x ${vehicles} vehicle(s)`;

    const computedFareUnit = trip.pricing_type === "package"
      ? `Rs. ${Number(trip.package_amount || 0).toFixed(2)}/day`
      : `Rs. ${Number(trip.cost_per_km || 0).toFixed(2)}/km`;
    const rows = [];

    rows.push({
      key: "computed-fare",
      description: computedFareLabel,
      quantity: computedFareQuantity,
      unitPrice: computedFareUnit,
      total: computedFareAmount,
      included: true,
    });

    pricingItems.forEach((item, index) => {
      const itemAmount = Number(item.amount || 0);
      rows.push({
        key: `pricing-${index}`,
        description: item.description || "Pricing Item",
        quantity: `${vehicles}`,
        unitPrice: `Rs. ${itemAmount.toFixed(2)}`,
        total: itemAmount * vehicles,
        included: true,
      });
    });

    if (Number(trip.charged_toll_amount || 0) > 0) {
      rows.push({
        key: "charged-toll",
        description: "Toll Charges",
        quantity: "1",
        unitPrice: `Rs. ${Number(trip.charged_toll_amount || 0).toFixed(2)}`,
        total: Number(trip.charged_toll_amount || 0),
        included: true,
      });
    }

    if (Number(trip.charged_parking_amount || 0) > 0) {
      rows.push({
        key: "charged-parking",
        description: "Parking Charges",
        quantity: "1",
        unitPrice: `Rs. ${Number(trip.charged_parking_amount || 0).toFixed(2)}`,
        total: Number(trip.charged_parking_amount || 0),
        included: true,
      });
    }

    chargeItems.forEach((item, index) => {
      const itemAmount = Number(item.amount || 0);
      rows.push({
        key: `charge-${index}`,
        description: item.description || "Extra Charge",
        quantity: item.quantity ? String(item.quantity) : "1",
        unitPrice: `Rs. ${itemAmount.toFixed(2)}`,
        total: itemAmount,
        included: true,
      });
    });

    if (Number(trip.other_expenses || 0) > 0) {
      rows.push({
        key: "other-expenses",
        description: "Other Expenses Charged",
        quantity: "1",
        unitPrice: `Rs. ${Number(trip.other_expenses || 0).toFixed(2)}`,
        total: Number(trip.other_expenses || 0),
        included: true,
      });
    }

    if (Number(trip.discount_amount || 0) > 0) {
      rows.push({
        key: "discount",
        description: "Discount",
        quantity: "1",
        unitPrice: `- Rs. ${Number(trip.discount_amount || 0).toFixed(2)}`,
        total: -Number(trip.discount_amount || 0),
        included: true,
      });
    }

    return rows;
  }, [trip]);

  const calculatedTotal = useMemo(() => {
    return invoiceRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  }, [invoiceRows]);

  const totalPaid = Number(trip?.amount_received || 0);
  const balanceDue = Math.max(calculatedTotal - totalPaid, 0);

  const handlePrint = () => {
    if (!printTimestamp) {
      setPrintTimestamp(new Date().toLocaleString());
    }
    setTimeout(() => {
      window.print();
    }, 100);
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 no-print bg-slate-100/50 p-6 rounded-[2rem] border border-slate-100">
        <button
          onClick={() => navigate("/invoices")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          Back to Invoices
        </button>
        <button
          onClick={() => {
            setPrintTimestamp(new Date().toLocaleString());
            setTimeout(() => handlePrint(), 100);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print
        </button>
        <button
          onClick={loadInvoiceData}
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
        >
          Refresh
        </button>
      </div>

      <PrintLayout>
        <div className="text-center font-black text-2xl tracking-widest uppercase mb-8 border-y-2 border-slate-900 py-2">
          INVOICE
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 border-2 border-slate-900 p-6">
          <div className="border-r-2 border-slate-900 pr-6">
            <h2 className="text-[12px] font-black uppercase mb-3 text-red-600">Bill To:</h2>
            <p className="text-xl font-black text-slate-900 leading-tight">{customer.name}</p>
            <p className="text-[12px] font-bold text-slate-700 mt-2">{trip.customer_address || customer.address || "No Address Provided"}</p>
            {(trip.customer_phone || customer?.phone) ? (
              <p className="text-[12px] font-bold text-slate-700">Phone: {trip.customer_phone || customer.phone}</p>
            ) : null}
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
            <div className="flex justify-between items-start p-2 px-4">
              <span className="font-black text-[10px] uppercase text-slate-500">Route:</span>
              <span className="font-black text-[11px] text-slate-800 text-right uppercase">
                {trip.from_location} {trip.to_location ? `To ${trip.to_location}` : ""}
              </span>
            </div>
            {trip.bus_type ? (
              <div className="flex justify-between items-start p-2 px-4">
                <span className="font-black text-[10px] uppercase text-slate-500">Vehicle Type:</span>
                <span className="font-black text-[11px] text-slate-800 text-right uppercase">
                  {trip.bus_type}
                </span>
              </div>
            ) : null}
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
                <tr key={`filler-${i}`} className="h-10 print:hidden">
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
                <td className="p-2 text-right text-base font-black text-red-600">Rs. {calculatedTotal.toFixed(2)}</td>
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
