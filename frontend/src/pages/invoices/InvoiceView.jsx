import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";
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
      : Number(trip.distance_km || 0) * Number(trip.cost_per_km || 0) * vehicles;
    const computedFareLabel = trip.pricing_type === "package" ? "Package Fare" : "Base Fare";
    const computedFareQuantity = trip.pricing_type === "package"
      ? `${tripDays} day(s) x ${vehicles} vehicle(s)`
      : `${trip.distance_km || 0} km x ${vehicles} vehicle(s)`;
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

  const subtotalAmount = invoiceRows
    .filter((row) => row.included !== false && row.total > 0)
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalPaid = Number(trip?.amount_received || 0);
  const balanceDue = Number(trip?.pending_amount || 0);

  const handlePrint = () => {
    if (!printRef.current) return;
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

      <div ref={printRef} className="invoice-print-area max-w-5xl mx-auto bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-5 md:p-8 text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
          <div className="flex items-start gap-4">
            <img src={NathkrupaLogo} alt="Nathkrupa Logo" className="h-14 w-auto object-contain" />
          </div>
          <div className="md:text-right">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{COMPANY_NAME}</h1>
            <p className="text-sm text-slate-500 mt-2">{COMPANY_ADDRESS}</p>
            {COMPANY_EMAIL ? <p className="text-sm text-slate-500">Email: {COMPANY_EMAIL}</p> : null}
            {COMPANY_CONTACT ? <p className="text-sm text-slate-500">Phone: {COMPANY_CONTACT}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-2xl font-black mb-2">Customer</h2>
            <p className="text-lg text-slate-600">{customer.name}</p>
            {customer?.email ? <p className="text-base text-slate-500">Email: {customer.email}</p> : null}
            {customer?.phone ? <p className="text-base text-slate-500">Phone: {customer.phone}</p> : null}
          </div>
          <div className="md:text-right text-slate-500">
            <p className="text-base"><span className="font-medium">Invoice No:</span> {trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}</p>
            <p className="text-base"><span className="font-medium">Date:</span> {formatDateDDMMYYYY(trip.trip_date)}</p>
            {printTimestamp ? <p className="text-sm mt-1">Printed: {printTimestamp}</p> : null}
          </div>
        </div>

        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse invoice-table">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 p-3 text-left">Description</th>
                <th className="border border-slate-300 p-3 text-left">Quantity</th>
                <th className="border border-slate-300 p-3 text-left">Unit Price</th>
                <th className="border border-slate-300 p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((row) => {
                return (
                  <tr key={row.key}>
                    <td className="border border-slate-300 p-3">{row.description}</td>
                    <td className="border border-slate-300 p-3 text-slate-600">{row.quantity}</td>
                    <td className="border border-slate-300 p-3 text-slate-600">{row.unitPrice}</td>
                    <td className="border border-slate-300 p-3 text-right">
                      {`${row.total < 0 ? "- " : ""}Rs. ${Math.abs(Number(row.total || 0)).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm text-base text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs. {subtotalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>{Number(trip.discount_amount || 0) > 0 ? `- Rs. ${Number(trip.discount_amount || 0).toFixed(2)}` : "Rs. 0.00"}</span>
            </div>
            <div className="flex justify-between pt-1 text-2xl font-black text-slate-800">
              <span>Total Amount Due:</span>
              <span>Rs. {(trip.total_charged || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid:</span>
              <span>Rs. {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 text-xl font-black text-rose-700">
              <span>Balance:</span>
              <span>Rs. {balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 flex justify-between items-end gap-8">
          <div className="text-slate-500 space-y-3">
            <p className="text-lg">Thank you.</p>
          </div>
          <div className="min-w-[220px] text-center">
            <div className="h-16" />
            <div className="border-t border-slate-400 pt-2">
              <p className="text-sm font-semibold text-slate-700">Authority Signature</p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          html, body {
            width: 210mm;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: "Segoe UI", Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .invoice-print-area {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .invoice-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .invoice-table th,
          .invoice-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 10px !important;
            vertical-align: top !important;
          }

          .invoice-table thead {
            display: table-header-group !important;
          }

          .invoice-table tr,
          .invoice-print-area {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
