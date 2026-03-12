import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";
import { vendorEntryConfig } from "../../config/vendorEntryConfig";

const normalizeVendorCategory = (category) => String(category || "").trim().toLowerCase();
const isFuelCategory = (category) => {
  const value = normalizeVendorCategory(category);
  return value === "fuel" || value === "both" || value.includes("fuel") || value.includes("diesel") || value.includes("petrol");
};
const isSpareCategory = (category) => {
  const value = normalizeVendorCategory(category);
  return value === "spare_parts" || value === "both" || value.includes("spare") || value.includes("part");
};

export default function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [fuelHistory, setFuelHistory] = useState([]);
  const [spareHistory, setSpareHistory] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("fuel");
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ amount: "", paid_on: "", notes: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [entryForm, setEntryForm] = useState({});

  const loadVendorData = useCallback(async () => {
    try {
      // Get vendor details
      const vendorRes = await api.get(`/vendors`);
      const vendorData = vendorRes.data.find(v => v.id === Number(id));
      setVendor(vendorData);

      if (!vendorData) return;
      const vendorCategory = normalizeVendorCategory(vendorData.category);
      const supportsFuel = isFuelCategory(vendorCategory);
      const supportsSpare = isSpareCategory(vendorCategory);

      // Set default tab based on vendor category
      if (supportsFuel) {
        setActiveTab("fuel");
      } else if (supportsSpare) {
        setActiveTab("spare");
      } else {
        setActiveTab("payments");
      }

      // Payments
      const payRes = await api.get(`/vendor-payments/vendor/${id}`);
      setPayments(payRes.data);

      const summaryRes = await api.get(`/vendors/${id}/summary`);
      setSummary(summaryRes.data);

      // Only load fuel history for fuel vendors
      if (supportsFuel) {
        // Get separate fuel entries
        const fuelRes = await api.get("/fuel");
        const fuelEntries = fuelRes.data.filter(f => f.vendor === vendorData.name);

        // Get trips with fuel for this vendor and convert to fuel entries
        const tripRes = await api.get("/trips");
        const tripFuelEntries = tripRes.data
          .filter(t => t.vendor === vendorData.name && (t.diesel_used > 0 || t.petrol_used > 0))
          .map(t => {
            const totalCost = t.diesel_used > 0 ? t.diesel_used : t.petrol_used;
            const litres = Number(t.fuel_litres || 0);
            const rate = litres > 0 ? totalCost / litres : 0;

            return {
              id: `trip-${t.id}`,
              filled_date: t.trip_date,
              vehicle_number: t.vehicle_number,
              fuel_type: t.diesel_used > 0 ? "diesel" : "petrol",
              quantity: litres,
              rate_per_litre: Number(rate.toFixed(2)),
              total_cost: totalCost,
              vendor: vendorData.name,
              trip_id: t.id
            };
          });

        // Combine both fuel entries
        setFuelHistory([...fuelEntries, ...tripFuelEntries]);

        // Also set trip history for trips tab
        setTripHistory(tripRes.data.filter(t => t.vendor === vendorData.name));
      }

      // Only load spare parts history for spare vendors
      if (supportsSpare) {
        const spareRes = await api.get("/spare-parts");
        setSpareHistory(spareRes.data.filter(s => s.vendor === vendorData.name));
      }
    } catch (error) {
      console.error("Error loading vendor data:", error);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      await loadVendorData();
      const res = await api.get("/vehicles");
      setVehicles(res.data);
    };
    init();
  }, [loadVendorData]);

  useEffect(() => {
    const refreshOnFocus = () => loadVendorData();
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        loadVendorData();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [loadVendorData]);

  const totalFuelCost = Number(summary?.fuel_total || 0);
  const totalSpareCost = Number(summary?.spare_total || 0);
  const totalMechanicCost = Number(summary?.mechanic_total || 0);
  const totalTripFuelCost = Number(summary?.trip_fuel_total || 0);
  const totalOwed = Number(summary?.total_owed || 0);
  const totalPaid = Number(summary?.paid_total || 0);
  const pendingAmount = Number(summary?.pending || 0);
  const vendorCategory = normalizeVendorCategory(vendor?.category);
  const vendorSupportsFuel = isFuelCategory(vendorCategory);
  const vendorSupportsSpare = isSpareCategory(vendorCategory);
  const availableCategories = useMemo(() => {
    if (!vendorCategory) return [];
    if (vendorCategory === "both") return ["fuel", "spare_parts"].filter((key) => vendorEntryConfig[key]);
    return vendorEntryConfig[vendorCategory] ? [vendorCategory] : [];
  }, [vendorCategory]);
  const activeCategoryConfig = selectedCategory ? vendorEntryConfig[selectedCategory] : null;
  const formatMoney = (value) =>
    `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chargeEntries = useMemo(() => {
    const fuelCharges = fuelHistory.map((entry) => ({
      id: `fuel-${entry.id}`,
      source: entry.trip_id ? "Trip Fuel" : "Fuel Entry",
      date: entry.filled_date,
      vehicle: entry.vehicle_number || "-",
      description: entry.trip_id
        ? `${entry.fuel_type} fuel recorded against trip #${entry.trip_id}`
        : `${entry.fuel_type} fuel purchase`,
      amount: Number(entry.total_cost || 0),
      meta: `${Number(entry.quantity || 0).toFixed(2)} L at ${formatMoney(entry.rate_per_litre)}`,
    }));

    const spareCharges = spareHistory.map((entry) => ({
      id: `spare-${entry.id}`,
      source: "Spare Part",
      date: entry.replaced_date,
      vehicle: entry.vehicle_number || "-",
      description: entry.part_name || "Spare part",
      amount: Number(entry.cost || 0) * Number(entry.quantity || 0),
      meta: `${Number(entry.quantity || 0)} qty at ${formatMoney(entry.cost)}`,
    }));

    const tripCharges = tripHistory
      .filter((trip) => Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0) > 0)
      .map((trip) => ({
        id: `trip-${trip.id}`,
        source: "Trip Charge",
        date: trip.trip_date,
        vehicle: trip.vehicle_number || "-",
        description: `${trip.from_location || "-"} to ${trip.to_location || "-"}`,
        amount: Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0),
        meta: `${Number(trip.distance_km || 0).toLocaleString()} km`,
      }));

    return [...fuelCharges, ...spareCharges, ...tripCharges].sort((a, b) => {
      const first = new Date(a.date || 0).getTime();
      const second = new Date(b.date || 0).getTime();
      return first - second || String(a.id).localeCompare(String(b.id));
    });
  }, [fuelHistory, spareHistory, tripHistory]);

  const paymentAllocations = useMemo(() => {
    const charges = chargeEntries.map((charge) => ({
      ...charge,
      remaining: Number(charge.amount || 0),
    }));

    const sortedPayments = [...payments].sort((a, b) => {
      const first = new Date(a.paid_on || 0).getTime();
      const second = new Date(b.paid_on || 0).getTime();
      return first - second || Number(a.id || 0) - Number(b.id || 0);
    });

    const allocationMap = {};

    sortedPayments.forEach((payment) => {
      let paymentRemaining = Number(payment.amount || 0);
      const allocations = [];

      for (const charge of charges) {
        if (paymentRemaining <= 0) break;
        if (charge.remaining <= 0) continue;

        const coveredAmount = Math.min(paymentRemaining, charge.remaining);
        allocations.push({
          chargeId: charge.id,
          source: charge.source,
          date: charge.date,
          vehicle: charge.vehicle,
          description: charge.description,
          meta: charge.meta,
          chargeAmount: Number(charge.amount || 0),
          coveredAmount,
        });
        charge.remaining -= coveredAmount;
        paymentRemaining -= coveredAmount;
      }

      allocationMap[payment.id] = {
        allocations,
        coveredTotal: Number(payment.amount || 0) - paymentRemaining,
        unallocatedAmount: paymentRemaining,
      };
    });

    return allocationMap;
  }, [chargeEntries, payments]);

  const selectedPaymentAllocation = selectedPayment
    ? paymentAllocations[selectedPayment.id] || {
      allocations: [],
      coveredTotal: 0,
      unallocatedAmount: Number(selectedPayment.amount || 0),
    }
    : null;

  const selectedPaymentActualAmount = selectedPaymentAllocation
    ? selectedPaymentAllocation.allocations.reduce(
      (sum, entry) => sum + Number(entry.chargeAmount || 0),
      0
    )
    : 0;

  const selectedPaymentReceivedAmount = selectedPaymentAllocation
    ? Number(selectedPaymentAllocation.coveredTotal || 0)
    : 0;

  const selectedPaymentPendingAmount = Math.max(
    selectedPaymentActualAmount - selectedPaymentReceivedAmount,
    0
  );

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.paid_on) return;
    const payload = {
      vendor_id: Number(id),
      amount: Number(payForm.amount),
      paid_on: payForm.paid_on,
      notes: payForm.notes || undefined,
    };
    try {
      await api.post("/vendor-payments", payload);
      alert("Payment recorded successfully");
      await loadVendorData();
      setPayForm({ amount: "", paid_on: "", notes: "" });
    } catch (err) {
      console.error("Payment submit error:", err);
      alert("Error recording payment: " + (err.response?.data?.detail || err.message));
    }
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await api.delete(`/vendor-payments/${paymentId}`);
      await loadVendorData();
    } catch (err) {
      console.error("Delete payment error:", err);
      alert("Error deleting payment: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrint = () => {
    if (!vendor) return;
    const printWindow = window.open("", "_blank", "width=1000,height=1200");
    if (!printWindow) return;

    const summaryCards = [
      { label: "Fuel Cost", value: totalFuelCost },
      { label: "Trip Fuel Cost", value: totalTripFuelCost },
      { label: "Spare Cost", value: totalSpareCost },
      { label: "Mechanic Cost", value: totalMechanicCost },
      { label: "Paid", value: totalPaid },
      { label: "Pending", value: pendingAmount },
    ];

    const activeRows = (() => {
      if (activeTab === "payments") {
        return {
          title: "Payments",
          headers: ["Date", "Amount", "Reference"],
          rows: payments.map((p) => [formatDateDDMMYYYY(p.paid_on), formatMoney(p.amount), p.notes || "-"]),
        };
      }
      if (activeTab === "spare") {
        return {
          title: "Spare Entries",
          headers: ["Date", "Vehicle", "Part", "Qty", "Amount"],
          rows: spareHistory.map((s) => [
            formatDateDDMMYYYY(s.replaced_date),
            s.vehicle_number,
            s.part_name,
            s.quantity,
            formatMoney((s.cost || 0) * (s.quantity || 0)),
          ]),
        };
      }
      if (activeTab === "trips") {
        return {
          title: "Trip History",
          headers: ["Date", "Vehicle", "Route", "Distance", "Fuel Cost"],
          rows: tripHistory.map((t) => [
            formatDateDDMMYYYY(t.trip_date),
            t.vehicle_number,
            `${t.from_location} to ${t.to_location}`,
            `${t.distance_km || 0} km`,
            formatMoney((t.diesel_used || 0) + (t.petrol_used || 0)),
          ]),
        };
      }
      return {
        title: "Fuel Entries",
        headers: ["Date", "Vehicle", "Fuel", "Litres", "Rate", "Total"],
        rows: fuelHistory.map((f) => [
          formatDateDDMMYYYY(f.filled_date),
          f.vehicle_number,
          f.fuel_type,
          f.quantity,
          formatMoney(f.rate_per_litre),
          formatMoney(f.total_cost),
        ]),
      };
    })();

    const summaryHtml = summaryCards
      .filter((card) => {
        if (card.label === "Spare Cost") return vendor.category === "spare_parts" || vendor.category === "both" || totalSpareCost > 0;
        if (card.label === "Mechanic Cost") return vendor.category === "mechanic" || totalMechanicCost > 0;
        if (card.label === "Fuel Cost" || card.label === "Trip Fuel Cost") return vendor.category === "fuel" || vendor.category === "both" || totalFuelCost > 0 || totalTripFuelCost > 0;
        return true;
      })
      .map((card) => `
        <div class="summary-card">
          <div class="summary-label">${card.label}</div>
          <div class="summary-value">${formatMoney(card.value)}</div>
        </div>
      `)
      .join("");

    const tableRows = activeRows.rows.length
      ? activeRows.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${activeRows.headers.length}">No records found</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Vendor ${vendor?.name || ""}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #fff; color: #111827; }
            .print-shell { max-width: 190mm; margin: 0 auto; border: 1px solid #cbd5e1; padding: 10mm; }
            .header { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; align-items: start; }
            .brand { display: flex; gap: 12px; align-items: flex-start; }
            .logo { height: 48px; width: auto; object-fit: contain; }
            .company-name { font-size: 26px; font-weight: 800; }
            .muted { color: #64748b; font-size: 13px; }
            .section-title { font-size: 16px; font-weight: 700; margin: 24px 0 12px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 24px; }
            .summary-card { border: 1px solid #cbd5e1; padding: 12px; }
            .summary-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px; }
            .summary-value { font-size: 22px; font-weight: 800; }
            .meta-label { font-size: 11px; color: #64748b; font-weight: 700; }
            .meta-value { font-size: 15px; font-weight: 600; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="print-shell">
            <div class="header">
              <div class="brand">
                <img src="${NathkrupaLogo}" class="logo" alt="Nathkrupa Logo" />
                <div>
                  <div class="company-name">${COMPANY_NAME}</div>
                  <div class="muted">${COMPANY_ADDRESS}</div>
                  ${COMPANY_EMAIL ? `<div class="muted">Email: ${COMPANY_EMAIL}</div>` : ""}
                  ${COMPANY_CONTACT ? `<div class="muted">Phone: ${COMPANY_CONTACT}</div>` : ""}
                </div>
              </div>
              <div>
                <div class="meta-label">Vendor</div>
                <div class="meta-value">${vendor.name}</div>
                <div class="meta-label" style="margin-top: 10px;">Category</div>
                <div class="meta-value">${vendor.category || "General"}</div>
                <div class="meta-label" style="margin-top: 10px;">Printed On</div>
                <div class="meta-value">${new Date().toLocaleString()}</div>
              </div>
            </div>
            <div class="summary-grid">${summaryHtml}</div>
            <div class="section-title">${activeRows.title}</div>
            <table>
              <thead>
                <tr>${activeRows.headers.map((header) => `<th>${header}</th>`).join("")}</tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  useEffect(() => {
    if (availableCategories.length === 1) {
      setSelectedCategory(availableCategories[0]);
    } else if (availableCategories.length === 0) {
      setSelectedCategory(null);
    }
  }, [availableCategories]);

  useEffect(() => {
    if (!activeCategoryConfig) return;
    const defaults = {};
    activeCategoryConfig.fields.forEach((field) => {
      if (field.type === "select" && field.options?.length) {
        defaults[field.name] = field.options[0];
      } else {
        defaults[field.name] = "";
      }
    });
    setEntryForm(defaults);
  }, [activeCategoryConfig]);

  const handleOpenModal = (category) => {
    setSelectedCategory(category || availableCategories[0] || null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEntryForm({});
    if (availableCategories.length === 1) {
      setSelectedCategory(availableCategories[0]);
    } else {
      setSelectedCategory(null);
    }
  };

  const handleEntryChange = (name, type, value) => {
    const parsedValue = type === "number" ? value : value;
    setEntryForm((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    if (!activeCategoryConfig || !vendor) return;

    const normalizedPayload = activeCategoryConfig.fields.reduce((acc, field) => {
      const raw = entryForm[field.name];
      if (field.type === "number") {
        acc[field.name] = raw === "" || raw === undefined ? "" : Number(raw);
      } else {
        acc[field.name] = raw;
      }
      return acc;
    }, {});

    let payload = { ...normalizedPayload, vendor: vendor.name };
    if (typeof activeCategoryConfig.preparePayload === "function") {
      payload = activeCategoryConfig.preparePayload(payload, normalizedPayload);
    }

    try {
      await api.post(activeCategoryConfig.endpoint, payload);
      alert("Entry added successfully");
      handleCloseModal();
      loadVendorData();
    } catch (error) {
      alert("Error adding entry: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendor) return;
    if (!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/vendors/${vendor.id}`);
      navigate("/vendors");
    } catch (error) {
      alert("Error deleting vendor: " + (error.response?.data?.detail || error.message));
    }
  };

  if (!vendor) {
    return (
      <div className="p-6">
        <p>Loading vendor details...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-end">
        <div className="space-y-4">
          <button
            onClick={() => navigate("/vendors")}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back to Vendors
          </button>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-800 tracking-tight">{vendor.name}</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                {vendor.category || "General"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Vendor ID: {id}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDeleteVendor}
            className="h-12 px-6 bg-white border border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 7h12m-9 0V5a2 2 0 012-2h2a2 2 0 012 2v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7z" /></svg>
            Delete
          </button>
          <button
            onClick={handlePrint}
            className="h-12 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
            Print
          </button>
          <button
            onClick={() => {
              if (availableCategories.length === 0) {
                alert("No entry form configured for this vendor category.");
                return;
              }
              if (availableCategories.length <= 1) {
                handleOpenModal(availableCategories[0]);
              } else {
                setSelectedCategory(null);
                setShowAddModal(true);
              }
            }}
            className="h-12 px-8 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Entry
          </button>
        </div>
      </div>

      {/* ---------- ENTRY SELECTION MODAL ---------- */}
      {showAddModal && !activeCategoryConfig && availableCategories.length > 1 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] w-[400px] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Add Entry</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8">Choose what you want to add for this vendor</p>

            <div className="space-y-3">
              {availableCategories.map((categoryKey) => (
                <button
                  key={categoryKey}
                  onClick={() => handleOpenModal(categoryKey)}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
                >
                  Add {categoryKey === "mechanic" ? "Mistry" : categoryKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Entry
                </button>
              ))}
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-6 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---------- DYNAMIC ENTRY MODAL ---------- */}
      {showAddModal && activeCategoryConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              Add {selectedCategory === "mechanic" ? "Mistry" : selectedCategory?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Entry
            </h2>
            <form onSubmit={handleEntrySubmit} className="space-y-6">
              {activeCategoryConfig.fields.map((field) => {
                const fieldValue = entryForm[field.name] ?? "";
                const selectOptions =
                  field.options ||
                  (field.name === "vehicle_number" ? vehicles.map((v) => v.vehicle_number) : []);

                const sharedInputProps = {
                  className:
                    "w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all",
                  required: true,
                };

                return (
                  <div key={field.name} className={field.type === "select" && field.name === "vehicle_number" ? "space-y-2" : "space-y-2"}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={fieldValue}
                        onChange={(e) => handleEntryChange(field.name, field.type, e.target.value)}
                        className={`${sharedInputProps.className} appearance-none`}
                        required={sharedInputProps.required}
                      >
                        <option value="">Select {field.label}</option>
                        {selectOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={fieldValue}
                        onChange={(e) => handleEntryChange(field.name, field.type, e.target.value)}
                        placeholder={field.placeholder || ""}
                        {...sharedInputProps}
                        min={field.type === "number" ? "0" : undefined}
                        step={field.type === "number" ? "0.01" : undefined}
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-14 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- STRATEGIC INTELLIGENCE (SUMMARY) ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-[2rem] border-l-4 border-l-blue-500 bg-white shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Cost</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-400">Rs.</span>
            <span className="text-3xl font-black text-slate-800 tabular-nums">{totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Charges: {chargeEntries.length}
          </div>
        </div>
        <div className="glass-card p-6 rounded-[2rem] border-l-4 border-l-emerald-500 bg-white shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Received</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-400">Rs.</span>
            <span className="text-3xl font-black text-slate-800 tabular-nums">{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Payments: {payments.length}
          </div>
        </div>
        <div className="glass-card p-6 rounded-[2rem] border-l-4 border-l-rose-500 bg-white shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Pending</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-400">Rs.</span>
            <span className="text-3xl font-black text-slate-800 tabular-nums">{pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Fuel {formatMoney(totalFuelCost)} | Trip {formatMoney(totalTripFuelCost)} | Spare {formatMoney(totalSpareCost)}
          </div>
        </div>
      </div>

      {/* ---------- TACTICAL TABS ---------- */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] w-fit border border-slate-200/50 backdrop-blur-sm">
        {vendorSupportsFuel && (
          <button
            onClick={() => setActiveTab("fuel")}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "fuel"
              ? "bg-white text-blue-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Fuel Entries ({fuelHistory.length})
          </button>
        )}
        {vendorSupportsSpare && (
          <button
            onClick={() => setActiveTab("spare")}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "spare"
              ? "bg-white text-blue-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Spare Entries ({spareHistory.length})
          </button>
        )}
        {vendorSupportsFuel && (
          <button
            onClick={() => setActiveTab("trips")}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "trips"
              ? "bg-white text-blue-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Trip History ({tripHistory.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "payments"
            ? "bg-white text-blue-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100"
            : "text-slate-400 hover:text-slate-600"
            }`}
        >
          Payments ({payments.length})
        </button>
      </div>
      {/* ---------- SETTLEMENTS TAB ---------- */}
      {activeTab === "payments" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="glass-card p-8 rounded-[2rem] border-l-4 border-l-blue-600 bg-white shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Add Payment
            </h2>
            <form onSubmit={submitPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Date</label>
                <input
                  type="date"
                  value={payForm.paid_on}
                  onChange={(e) => setPayForm({ ...payForm, paid_on: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reference</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="Invoice no, UPI ref"
                />
              </div>
              <button type="submit" className="h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                Save Payment
              </button>
            </form>
          </div>

          <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-2xl shadow-slate-200/50">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Date</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Amount</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Reference</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Charge Details</th>
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-20 text-center opacity-20">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No payments found</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const allocation = paymentAllocations[p.id] || { allocations: [], coveredTotal: 0, unallocatedAmount: Number(p.amount || 0) };
                    const firstAllocation = allocation.allocations[0];

                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 text-sm font-black text-slate-400 tabular-nums">{formatDateDDMMYYYY(p.paid_on)}</td>
                        <td className="p-6 text-sm font-black text-slate-800 tabular-nums">Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-6 text-sm font-bold text-slate-500">{p.notes || "-"}</td>
                        <td className="p-6 text-sm text-slate-500">
                          {allocation.allocations.length === 0 ? (
                            <span className="font-bold text-slate-400">No linked charges available</span>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-black text-slate-700">
                                {allocation.allocations.length} charge{allocation.allocations.length > 1 ? "s" : ""} covered
                              </p>
                              <p className="text-xs font-bold text-slate-500">
                                {firstAllocation.source} | {firstAllocation.vehicle} | {formatMoney(firstAllocation.coveredAmount)}
                              </p>
                              {allocation.unallocatedAmount > 0 && (
                                <p className="text-xs font-bold text-amber-600">
                                  Unallocated: {formatMoney(allocation.unallocatedAmount)}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deletePayment(p.id)}
                              className="h-10 px-4 bg-white border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between gap-4 p-8 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Payment Details</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {formatDateDDMMYYYY(selectedPayment.paid_on)} | {formatMoney(selectedPayment.amount)} | {selectedPayment.notes || "No reference"}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="h-10 px-4 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="rounded-2xl bg-white border border-slate-200 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actual Amount To Collect</p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {formatMoney(selectedPaymentActualAmount || selectedPayment.amount)}
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Received Amount</p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {formatMoney(selectedPaymentReceivedAmount || selectedPayment.amount)}
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Amount</p>
                <p className="mt-2 text-2xl font-black text-slate-800">
                  {formatMoney(selectedPaymentPendingAmount)}
                </p>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-auto p-8">
              <div className="rounded-[1.5rem] overflow-hidden border border-slate-100">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/70">
                      <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Charge Date</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Source</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vehicle</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Description</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Details</th>
                      <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Covered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(paymentAllocations[selectedPayment.id]?.allocations || []).length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          No charge details available for this payment
                        </td>
                      </tr>
                    ) : (
                      paymentAllocations[selectedPayment.id].allocations.map((entry) => (
                        <tr key={`${selectedPayment.id}-${entry.chargeId}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm font-black text-slate-500">{formatDateDDMMYYYY(entry.date)}</td>
                          <td className="p-4 text-sm font-black text-slate-800">{entry.source}</td>
                          <td className="p-4 text-sm font-bold text-slate-600">{entry.vehicle}</td>
                          <td className="p-4 text-sm font-bold text-slate-600">{entry.description}</td>
                          <td className="p-4 text-sm font-bold text-slate-400">{entry.meta}</td>
                          <td className="p-4 text-right text-sm font-black text-slate-800">{formatMoney(entry.coveredAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- ENERGY LOGS TAB ---------- */}
      {activeTab === "fuel" && (
        <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 animate-in fade-in duration-500">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Date</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vehicle</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Fuel Type</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Litres</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Rate</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fuelHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.2em]">No fuel entries found</td>
                </tr>
              ) : (
                fuelHistory.map(f => (
                  <tr key={f.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-400 tabular-nums">{formatDateDDMMYYYY(f.filled_date)}</td>
                    <td className="p-6 text-sm font-black text-slate-800">{f.vehicle_number}</td>
                    <td className="p-6">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider">{f.fuel_type}</span>
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-600 tabular-nums">{f.quantity}</td>
                    <td className="p-6 text-sm font-bold text-slate-400 tabular-nums">Rs. {f.rate_per_litre}</td>
                    <td className="p-6 text-right text-sm font-black text-slate-800 tabular-nums">Rs. {f.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- HARDWARE LOGS TAB ---------- */}
      {activeTab === "spare" && (
        <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 animate-in fade-in duration-500">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Procurement Date</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vehicle</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Component</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Unit Count</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Unit Cost</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Total Capital</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {spareHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.2em]">Zero hardware logs recorded</td>
                </tr>
              ) : (
                spareHistory.map(s => (
                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-400 tabular-nums">{formatDateDDMMYYYY(s.replaced_date)}</td>
                    <td className="p-6 text-sm font-black text-slate-800">{s.vehicle_number}</td>
                    <td className="p-6 text-sm font-bold text-slate-600">{s.part_name}</td>
                    <td className="p-6 text-sm font-bold text-slate-500 tabular-nums">{s.quantity}</td>
                    <td className="p-6 text-sm font-bold text-slate-400 tabular-nums">Rs. {s.cost}</td>
                    <td className="p-6 text-right text-sm font-black text-slate-800 tabular-nums">Rs. {(s.cost * s.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- OPS HISTORY TAB ---------- */}
      {activeTab === "trips" && (
        <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 animate-in fade-in duration-500">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Mission Date</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Asset</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Tactical Route</th>
                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Metric Dist.</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Energy Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tripHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.2em]">Zero operational trips recorded</td>
                </tr>
              ) : (
                tripHistory.map(t => (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-400 tabular-nums">{formatDateDDMMYYYY(t.trip_date)}</td>
                    <td className="p-6 text-sm font-black text-slate-800">{t.vehicle_number}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        {t.from_location}
                        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7" /></svg>
                        {t.to_location}
                      </div>
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-500 tabular-nums">{t.distance_km} km</td>
                    <td className="p-6 text-right text-sm font-black text-slate-800 tabular-nums">
                      Rs. {((t.diesel_used || 0) + (t.petrol_used || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
