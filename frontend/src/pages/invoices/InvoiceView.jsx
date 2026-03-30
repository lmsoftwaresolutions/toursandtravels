import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import PrintLayout from "../../components/print/PrintLayout";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehiclesLookup, setVehiclesLookup] = useState({});
  const [payments, setPayments] = useState([]);
  const [printTimestamp, setPrintTimestamp] = useState("");
  const [searchParams] = useSearchParams();
  const hasVehicleAssigned = Boolean(trip?.vehicle_number || (trip?.vehicles || []).length);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = useCallback(async () => {
    try {
      const tripRes = await api.get(`/trips/${id}`);
      const [customerRes, vehiclesRes, paymentsRes] = await Promise.all([
        api.get("/customers"),
        api.get("/vehicles").catch(() => ({ data: [] })),
        api.get(`/payments/trip/${id}`).catch(() => ({ data: [] })),
      ]);

      setTrip(tripRes.data);
      setCustomer(customerRes.data.find((c) => c.id === tripRes.data.customer_id));
      setPayments(paymentsRes.data || []);

      const nextLookup = {};
      (vehiclesRes.data || []).forEach((vehicle) => {
        if (!vehicle?.vehicle_number) return;
        nextLookup[String(vehicle.vehicle_number)] = vehicle;
      });
      setVehiclesLookup(nextLookup);
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

    const invoiceRows = useMemo(() => {
    if (!trip) return [];

    const pricingItems = (trip.pricing_items || []).filter((item) => item.item_type === "pricing");
    const chargeItems = (trip.pricing_items || []).filter((item) => item.item_type === "charge");
    const vehicleEntries = Array.isArray(trip.vehicles) ? trip.vehicles : [];
    const hasVehicleEntries = vehicleEntries.length > 0;

    const rows = [];

    const totals = {
      baseFare: 0,
      distance: 0,
      toll: 0,
      parking: 0,
      other: 0,
      pricingTypes: new Set(),
      rates: new Set(),
    };

    if (hasVehicleEntries) {
      vehicleEntries.forEach((entry) => {
        const distance = Number(entry.distance_km || 0);
        const pricingType = entry.pricing_type || trip.pricing_type || "per_km";
        const packageAmount =
          entry.package_amount == null ? Number(trip.package_amount || 0) : Number(entry.package_amount || 0);
        const costPerKm =
          entry.cost_per_km == null ? Number(trip.cost_per_km || 0) : Number(entry.cost_per_km || 0);

        const baseAmount = pricingType === "package" ? Number(packageAmount || 0) : distance * Number(costPerKm || 0);
        const tollAmount = Number(entry.toll_amount || 0);
        const parkingAmount = Number(entry.parking_amount || 0);
        const otherAmount = Number(entry.other_expenses || 0);

        totals.pricingTypes.add(pricingType);
        totals.rates.add(pricingType === "package" ? Number(packageAmount || 0) : Number(costPerKm || 0));
        totals.distance += distance;
        totals.baseFare += baseAmount;
        totals.toll += tollAmount;
        totals.parking += parkingAmount;
        totals.other += otherAmount;

        const vehicleMeta = vehiclesLookup[entry.vehicle_number || ""] || {};
        const vehicleTypeLabel =
          entry.bus_type ||
          entry.vehicle_type ||
          vehicleMeta.vehicle_type ||
          trip.bus_type ||
          trip.bus_detail ||
          "";
        const resolvedSeatCount =
          entry.seat_count ?? (vehicleMeta.seat_count != null ? vehicleMeta.seat_count : null);
        const seatLabel = resolvedSeatCount ? `${resolvedSeatCount} Seat` : "";
        const vehicleLabelParts = [vehicleTypeLabel, seatLabel].filter(Boolean);

        rows.push({
          key: `vehicle-${entry.id || entry.vehicle_number || rows.length}`,
          description: vehicleLabelParts.length ? vehicleLabelParts.join(" ") : "Vehicle",
          baseFare: baseAmount,
          toll: tollAmount,
          parking: parkingAmount,
          total: baseAmount + tollAmount + parkingAmount + otherAmount,
        });
      });
    } else {
      const distance = Number(trip.distance_km || 0);
      const pricingType = trip.pricing_type || "per_km";
      const packageAmount = Number(trip.package_amount || 0);
      const costPerKm = Number(trip.cost_per_km || 0);
      const baseAmount = pricingType === "package" ? packageAmount : distance * costPerKm;
      const tollAmount = Number(trip.charged_toll_amount || trip.toll_amount || 0);
      const parkingAmount = Number(trip.charged_parking_amount || trip.parking_amount || 0);
      const otherAmount = Number(trip.other_expenses || 0);

      totals.pricingTypes.add(pricingType);
      totals.rates.add(pricingType === "package" ? packageAmount : costPerKm);
      totals.distance += distance;
      totals.baseFare += baseAmount;
      totals.toll += tollAmount;
      totals.parking += parkingAmount;
      totals.other += otherAmount;

      const vehicleMeta = vehiclesLookup[trip.vehicle_number || ""] || {};
      const vehicleTypeLabel = trip.bus_type || trip.bus_detail || vehicleMeta.vehicle_type || "Vehicle";
      const seatLabel = vehicleMeta.seat_count ? `${vehicleMeta.seat_count} Seat` : "";
      rows.push({
        key: "vehicle-single",
        description: [vehicleTypeLabel, seatLabel].filter(Boolean).join(" "),
        baseFare: baseAmount,
        toll: tollAmount,
        parking: parkingAmount,
        total: baseAmount + tollAmount + parkingAmount + otherAmount,
      });
    }

    const generalOther = Number(trip.other_expenses || 0);
    if (hasVehicleEntries && generalOther > 0) {
      rows.push({
        key: "general-other",
        description: "Other Expenses",
        baseFare: null,
        toll: null,
        parking: null,
        total: generalOther,
      });
      totals.other += generalOther;
    }

    pricingItems.forEach((item, index) => {
      const itemAmount = Number(item.amount || 0);
      rows.push({
        key: `pricing-${index}`,
        description: item.description || "Pricing Item",
        baseFare: null,
        toll: null,
        parking: null,
        total: itemAmount,
      });
    });

    chargeItems.forEach((item, index) => {
      const itemAmount = Number(item.amount || 0);
      rows.push({
        key: `charge-${index}`,
        description: item.description || "Extra Charge",
        baseFare: null,
        toll: null,
        parking: null,
        total: itemAmount,
      });
    });

    if (Number(trip.discount_amount || 0) > 0) {
      rows.push({
        key: "discount",
        description: "Discount",
        baseFare: null,
        toll: null,
        parking: null,
        total: -Number(trip.discount_amount || 0),
      });
    }

    return rows;
  }, [trip, vehiclesLookup]);



  const calculatedTotal = useMemo(() => {
    return invoiceRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  }, [invoiceRows]);

  const totalAdvance = useMemo(() => {
    const paymentSum = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return paymentSum || Number(trip?.amount_received || 0);
  }, [payments, trip]);

  const balanceDue = Math.max(calculatedTotal - totalAdvance, 0);
  const extraAmount = Math.max(totalAdvance - calculatedTotal, 0);

  const handlePrint = () => {
    setPrintTimestamp(new Date().toLocaleString());
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

  const billToAddress = trip?.customer_address || customer?.address || "";
  const billToPhone = trip?.customer_phone || customer?.phone || "";
  const billToEmail = customer?.email || "";
  const routeNotes = trip?.route_details || trip?.route_notes || trip?.notes || "";
  const primaryVehicleMeta = vehiclesLookup[trip?.vehicle_number || ""] || {};
  const primaryVehicleEntry = Array.isArray(trip?.vehicles) ? trip.vehicles[0] : null;
  const headerVehicleType =
    primaryVehicleEntry?.bus_type ||
    primaryVehicleEntry?.vehicle_type ||
    trip?.bus_type ||
    trip?.bus_detail ||
    primaryVehicleMeta.vehicle_type ||
    "";
  const headerSeatCount =
    primaryVehicleEntry?.seat_count ??
    (primaryVehicleMeta.seat_count != null ? primaryVehicleMeta.seat_count : null);
  const headerVehicleLabel = [headerVehicleType, headerSeatCount ? `${headerSeatCount} Seat` : ""]
    .filter(Boolean)
    .join(" ");

  const vehicleDetails = useMemo(() => {
    if (!trip) return [];
    const vehicleEntries = Array.isArray(trip.vehicles) ? trip.vehicles : [];
    if (vehicleEntries.length) {
      return vehicleEntries.map((entry, index) => {
        const pricingType = entry.pricing_type || trip.pricing_type || "per_km";
        const rateValue =
          pricingType === "package"
            ? Number(entry.package_amount ?? trip.package_amount ?? 0)
            : Number(entry.cost_per_km ?? trip.cost_per_km ?? 0);
        const vehicleMeta = vehiclesLookup[entry.vehicle_number || ""] || {};
        return {
          key: entry.id || `${entry.vehicle_number || "vehicle"}-${index}`,
          name:
            entry.bus_type ||
            entry.vehicle_type ||
            vehicleMeta.vehicle_type ||
            entry.vehicle_number ||
            "",
          distance: Number(entry.distance_km ?? 0),
          rate: rateValue,
        };
      });
    }

    const defaultPricingType = trip.pricing_type || "per_km";
    const defaultRate =
      defaultPricingType === "package"
        ? Number(trip.package_amount || 0)
        : Number(trip.cost_per_km || 0);
    return [
      {
        key: "single-vehicle",
        name: trip.bus_type || trip.vehicle_number || vehiclesLookup[trip.vehicle_number || ""]?.vehicle_type || "",
        distance: Number(trip.distance_km ?? 0),
        rate: defaultRate,
      },
    ];
  }, [trip, vehiclesLookup]);

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

      <PrintLayout printTimestamp={printTimestamp}>
        <div className="invoice-print-area">
          <div className="print-heading text-center font-black text-[20px] tracking-[0.35em] uppercase mb-4 text-slate-800">
            INVOICE
          </div>

          <div className="grid grid-cols-[1.2fr_1fr] gap-0 mb-4 border border-black/40">
            <div className="border-r border-black/40 p-3">
              <div className="mb-2 grid grid-cols-[90px_1fr] gap-y-1 text-left">
                <span className="font-black text-[11px] uppercase text-slate-500">Invoice No:</span>
                <span className="font-black text-[12px] text-black">{trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}</span>
                <span className="font-black text-[11px] uppercase text-slate-500">Invoice Date:</span>
                <span className="font-black text-[12px] text-black">{formatDateDDMMYYYY(trip.trip_date)}</span>
              </div>
              <h2 className="print-heading text-[11px] font-black uppercase mb-2 text-slate-600">Bill To</h2>
              <p className="text-[15px] font-black text-black leading-tight uppercase">{customer.name}</p>
              {billToAddress ? (
                <p className="text-[11px] font-bold text-black mt-1 uppercase whitespace-pre-line break-words">
                  {billToAddress}
                </p>
              ) : null}
              {billToEmail ? (
                <p className="text-[11px] font-bold text-black mt-1">Email: {billToEmail}</p>
              ) : null}
              {billToPhone ? (
                <p className="text-[11px] font-bold text-black mt-1">Phone: {billToPhone}</p>
              ) : null}
            </div>
            <div className="p-3">
              <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-left">
                <span className="font-black text-[11px] uppercase text-slate-500">Trip Start:</span>
                <span className="font-black text-[11px] text-black">
                  {trip.departure_datetime ? formatDateDDMMYYYY(trip.departure_datetime) : "-"}
                </span>
                <span className="font-black text-[11px] uppercase text-slate-500">Trip End:</span>
                <span className="font-black text-[11px] text-black">
                  {trip.return_datetime ? formatDateDDMMYYYY(trip.return_datetime) : "-"}
                </span>
                <span className="font-black text-[11px] uppercase text-slate-500">Route:</span>
                <span className="font-black text-[11px] text-black uppercase">
                  {trip.from_location} {trip.to_location ? `To ${trip.to_location}` : ""}
                </span>
                {headerVehicleLabel ? (
                  <>
                    <span className="font-black text-[11px] uppercase text-slate-500">Vehicle:</span>
                    <span className="font-black text-[11px] text-black uppercase">{headerVehicleLabel}</span>
                  </>
                ) : null}
                {routeNotes ? (
                  <>
                    <span className="font-black text-[11px] uppercase text-slate-500">Notes:</span>
                    <span className="font-black text-[11px] text-black whitespace-pre-line break-words">
                      {routeNotes}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
{/* 
          <div className="border border-black/40 mb-4">
            <div className="print-heading px-3 py-2 border-b border-black/30 text-[11px] font-black uppercase tracking-widest text-slate-600">
              Vehicle Details
            </div>
            <table className="w-full table-fixed vehicle-table">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-black/30">
                  <th className="p-2 text-left w-1/2">Vehicle</th>
                  <th className="p-2 text-right w-1/4">Distance</th>
                  <th className="p-2 text-right w-1/4">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20 text-black text-[11px]">
                {vehicleDetails.map((entry) => {
                  const distanceLabel = Number.isFinite(entry.distance) ? entry.distance.toFixed(1) : "";
                  const rateLabel = Number.isFinite(entry.rate) ? entry.rate.toFixed(2) : "";
                  return (
                    <tr key={entry.key}>
                      <td className="p-2 font-bold uppercase">{entry.name}</td>
                      <td className="p-2 text-right font-bold">{distanceLabel}</td>
                      <td className="p-2 text-right font-bold">{rateLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div> */}

          <div className="border border-black/40 border-collapse mb-3 overflow-hidden">
            <table className="w-full table-fixed invoice-table">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-black/40">
                  <th className="p-2 text-left font-black text-[11px] uppercase tracking-widest w-12 border-r border-black/30">Sr No</th>
                  <th className="p-2 text-left font-black text-[11px] uppercase tracking-widest border-r border-black/30">Description</th>
                  <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest border-r border-black/30 w-28">Base Fare</th>
                  <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest border-r border-black/30 w-20">Toll</th>
                  <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest border-r border-black/30 w-24">Parking</th>
                  <th className="p-2 text-right font-black text-[11px] uppercase tracking-widest w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-black">
              {invoiceRows.map((row, idx) => {
                const baseFareLabel = row.baseFare == null ? "-" : Number(row.baseFare).toFixed(2);
                const tollLabel = row.toll == null ? "-" : Number(row.toll).toFixed(2);
                const parkingLabel = row.parking == null ? "-" : Number(row.parking).toFixed(2);
                const totalLabel = `${row.total < 0 ? "- " : ""}Rs. ${Math.abs(Number(row.total || 0)).toFixed(2)}`;
                return (
                  <tr key={row.key} className="bg-white">
                    <td className="p-2 text-[11px] font-bold border-r border-black/30 text-center">{idx + 1}</td>
                    <td className="p-2 text-[11px] font-black uppercase border-r border-black/30">{row.description}</td>
                    <td className="p-2 text-[11px] font-bold border-r border-black/30 text-right">{baseFareLabel}</td>
                    <td className="p-2 text-[11px] font-bold border-r border-black/30 text-right">{tollLabel}</td>
                    <td className="p-2 text-[11px] font-bold border-r border-black/30 text-right">{parkingLabel}</td>
                    <td className="p-2.5 text-[12px] font-black text-right">{totalLabel}</td>
                  </tr>
                );
              })}
              {/* Filler Rows */}
              {[...Array(Math.max(0, 8 - invoiceRows.length))].map((_, i) => (
                <tr key={`filler-${i}`} className="h-8 print:hidden divide-x divide-black/30">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/40 bg-white">
                <td colSpan="5" className="p-2.5 text-right font-black text-[11px] uppercase tracking-widest border-r border-black/30 text-slate-600">Total Amount Due</td>
                <td className="p-2.5 text-right text-[14px] font-black text-black">Rs. {calculatedTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
            </table>
          </div>

          <div className="flex justify-end mb-2">
            <div className="w-72 text-black">
              <div className="print-heading text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 text-right">Payment Summary</div>
              <div className="border border-black/40 px-3 py-2 space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Advance Paid</span>
                  <span className="tabular-nums">Rs. {totalAdvance.toFixed(2)}</span>
                </div>
                {payments.length > 0 && (
                  <div className="border-t border-black/10 pt-2 space-y-1">
                    {payments.map((p, idx) => (
                      <div key={p.id || idx} className="flex justify-between text-[10px] font-bold text-slate-600">
                        <span>
                          {p.payment_date ? formatDateDDMMYYYY(p.payment_date) : "Advance"}
                          {p.payment_mode ? ` • ${p.payment_mode}` : ""}
                        </span>
                        <span className="tabular-nums">Rs. {Number(p.amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {extraAmount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-emerald-700 pt-1">
                    <span>Extra Amount Received</span>
                    <span className="tabular-nums">Rs. {extraAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12px] font-black pt-1">
                  <span className="text-slate-600">Balance Due</span>
                  <span className="tabular-nums">Rs. {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right italic font-bold text-black text-[10px]">
            * This is a computer generated invoice and does not require signature unless printed for official use.
          </div>
        </div>
      </PrintLayout>
    </div>
  );
}
