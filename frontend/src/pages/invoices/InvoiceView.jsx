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
  const hasVehicleAssigned = Boolean(trip?.vehicle_number || (trip?.vehicles || []).length);

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
    if (searchParams.get("print") === "true" && trip && customer && hasVehicleAssigned) {
      setPrintTimestamp(new Date().toLocaleString());
      setTimeout(() => handlePrint(), 150);
    }
  }, [searchParams, trip, customer, hasVehicleAssigned]);

  if (!trip || !customer) {
    return <div className="p-4 md:p-6">Loading invoice...</div>;
  }

  if (!hasVehicleAssigned) {
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
            onClick={() => navigate(`/trips/edit/${trip.id}`)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all"
          >
            Add Vehicle to Generate Invoice
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-10 text-center">
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Invoice Pending</p>
          <p className="text-2xl font-black text-slate-800 mt-3">Vehicle not assigned yet</p>
          <p className="text-sm text-slate-500 mt-2">Add vehicle details to generate the invoice.</p>
        </div>
      </div>
    );
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
        <div className="text-center font-black text-2xl tracking-widest uppercase mb-6 border-y-[1.5px] border-black py-2 text-red-600">
          INVOICE
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6 border-[1.5px] border-black p-4">
          <div className="border-r-[1.5px] border-black pr-6">
            <h2 className="text-[12px] font-black uppercase mb-2 text-red-600">Bill To:</h2>
            <p className="text-[16px] font-black text-black leading-tight uppercase">{customer.name}</p>
            <p className="text-[12px] font-bold text-black mt-1 uppercase">{trip.customer_address || customer.address || "No Address Provided"}</p>
            {(trip.customer_phone || customer?.phone) ? (
              <p className="text-[12px] font-bold text-black mt-1">Phone: {trip.customer_phone || customer.phone}</p>
            ) : null}
          </div>
          <div className="pl-6 space-y-1">
            <div className="flex justify-between items-center p-1.5 px-3">
              <span className="font-black text-[11px] uppercase text-red-600">Invoice No:</span>
              <span className="font-black text-[13px] text-black">{trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}</span>
            </div>
            <div className="flex justify-between items-center p-1.5 px-3">
              <span className="font-black text-[11px] uppercase text-red-600">Date:</span>
              <span className="font-black text-[13px] text-black">{formatDateDDMMYYYY(trip.trip_date)}</span>
            </div>
            <div className="flex justify-between items-start p-1.5 px-3">
              <span className="font-black text-[11px] uppercase text-red-600">Route:</span>
              <span className="font-black text-[11px] text-black text-right uppercase">
                {trip.from_location} {trip.to_location ? `To ${trip.to_location}` : ""}
              </span>
            </div>
            {trip.bus_type ? (
              <div className="flex justify-between items-start p-1.5 px-3">
                <span className="font-black text-[11px] uppercase text-red-600">Vehicle:</span>
                <span className="font-black text-[11px] text-black text-right uppercase">
                  {trip.bus_type}
                </span>
              </div>
            ) : null}
            {printTimestamp ? <p className="text-[9px] text-right text-black font-bold mt-2">Printed: {printTimestamp}</p> : null}
          </div>
        </div>

        <div className="border-[1.5px] border-black border-collapse mb-6 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-red-600 text-white border-b-[1.5px] border-black">
                <th className="p-2 text-left font-black text-[11px] uppercase tracking-widest w-12 border-r-[1.5px] border-black">Sr.</th>
                <th className="p-2 text-left font-black text-[11px] uppercase tracking-widest border-r-[1.5px] border-black">Description</th>
                <th className="p-2 text-left font-black text-[11px] uppercase tracking-widest border-r-[1.5px] border-black w-28">Qty / KM</th>
                <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest border-r-[1.5px] border-black w-28">Rate</th>
                <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-black text-black">
              {invoiceRows.map((row, idx) => {
                return (
                  <tr key={row.key} className="bg-white">
                    <td className="p-2.5 text-[11px] font-bold border-r-[1.5px] border-black text-center">{idx + 1}</td>
                    <td className="p-2.5 text-[11px] font-black uppercase border-r-[1.5px] border-black">{row.description}</td>
                    <td className="p-2.5 text-[11px] font-bold uppercase border-r-[1.5px] border-black text-center">{row.quantity}</td>
                    <td className="p-2.5 text-[11px] font-bold border-r-[1.5px] border-black text-right">{row.unitPrice}</td>
                    <td className="p-2.5 text-[12px] font-black text-right">
                      {`${row.total < 0 ? "- " : ""}Rs. ${Math.abs(Number(row.total || 0)).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
              {/* Filler Rows */}
              {[...Array(Math.max(0, 8 - invoiceRows.length))].map((_, i) => (
                <tr key={`filler-${i}`} className="h-8 print:hidden divide-x-[1.5px] divide-black">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-black bg-white">
                <td colSpan="4" className="p-2.5 text-right font-black text-[11px] uppercase tracking-widest border-r-[1.5px] border-black text-red-600">Total Amount Due</td>
                <td className="p-2.5 text-right text-[14px] font-black text-black">Rs. {calculatedTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="p-3 border-[1.5px] border-black text-black">
            <h3 className="text-[11px] font-black uppercase text-red-600 mb-2 border-b-[1.5px] border-black pb-1 inline-block">Payment Summary</h3>
            <div className="space-y-1.5 mt-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Paid Amount:</span>
                <span>Rs. {totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-black pt-1">
                <span className="text-red-600">Balance Due:</span>
                <span className="underline underline-offset-2 decoration-2">Rs. {balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-end text-right italic font-bold text-black text-[10px]">
            * This is a computer generated invoice and does not require signature unless printed for official use.
          </div>
        </div>
      </PrintLayout>
    </div>
  );
}
