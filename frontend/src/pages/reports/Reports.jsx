import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.png";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";

const getMonthKey = (dateStr) => {
  if (!dateStr) return "";
  const [datePart] = String(dateStr).split("T");
  return String(datePart).slice(0, 7);
};

const inRange = (dateStr, fromDate, toDate, monthFilter) => {
  if (!dateStr) return true;
  const [datePart] = String(dateStr).split("T");
  if (fromDate && datePart < fromDate) return false;
  if (toDate && datePart > toDate) return false;
  if (monthFilter && getMonthKey(datePart) !== monthFilter) return false;
  return true;
};

const getTripDays = (departureDatetime, returnDatetime) => {
  if (!departureDatetime || !returnDatetime) return 1;
  const start = new Date(departureDatetime);
  const end = new Date(returnDatetime);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 1);
};

const getPricingItemAmount = (item, vehicles) => {
  const baseAmount = Number(item?.amount || 0) || (Number(item?.quantity || 1) * Number(item?.rate || 0));
  return baseAmount * vehicles;
};

const getChargeItemAmount = (item) => {
  return Number(item?.amount || 0) || (Number(item?.quantity || 1) * Number(item?.rate || 0));
};

export default function Reports() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [spareEntries, setSpareEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [mechanicEntries, setMechanicEntries] = useState([]);

  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes, customersRes, vendorsRes, fuelRes, spareRes, maintenanceRes, mechanicRes] = await Promise.all([
        api.get("/trips"),
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/customers"),
        api.get("/vendors"),
        api.get("/fuel"),
        api.get("/spare-parts"),
        api.get("/maintenance"),
        api.get("/mechanic"),
      ]);
      setTrips(tripsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setDrivers(driversRes.data || []);
      setCustomers(customersRes.data || []);
      setVendors(vendorsRes.data || []);
      setFuelEntries(fuelRes.data || []);
      setSpareEntries(spareRes.data || []);
      setMaintenanceEntries(maintenanceRes.data || []);
      setMechanicEntries(mechanicRes.data || []);
    } catch (error) {
      console.error("Error loading report data:", error);
    }
  };

  const customerNameById = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.id, c.name || ""));
    return map;
  }, [customers]);

  const vendorCategoryByName = useMemo(() => {
    const map = new Map();
    vendors.forEach((vendor) => {
      map.set(vendor.name, vendor.category || "");
    });
    return map;
  }, [vendors]);

  const vendorNameSet = useMemo(() => {
    return new Set(vendors.map((vendor) => vendor.name).filter(Boolean));
  }, [vendors]);

  const filteredTrips = useMemo(() => {
    const searchCustomerQuery = searchCustomer.trim().toLowerCase();
    const searchInvoiceQuery = searchInvoice.trim().toLowerCase();

    return trips.filter((t) => {
      if (filterVehicle && t.vehicle_number !== filterVehicle) return false;
      if (filterDriver && t.driver_id !== Number(filterDriver)) return false;
      if (!inRange(t.trip_date, dateFrom, dateTo, monthFilter)) return false;

      const customerName = String(customerNameById.get(t.customer_id) || "").toLowerCase();
      const invoice = String(t.invoice_number || "").toLowerCase();

      if (searchCustomerQuery && !customerName.includes(searchCustomerQuery)) return false;
      if (searchInvoiceQuery && !invoice.includes(searchInvoiceQuery)) return false;
      return true;
    });
  }, [trips, filterVehicle, filterDriver, dateFrom, dateTo, monthFilter, searchCustomer, searchInvoice, customerNameById]);

  const tripVehicleSet = useMemo(() => new Set(filteredTrips.map((t) => t.vehicle_number)), [filteredTrips]);

  const filteredFuelEntries = useMemo(() => {
    return fuelEntries.filter((f) => {
      if (!inRange(f.filled_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && f.vehicle_number !== filterVehicle) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(f.vehicle_number)) return false;
      return true;
    });
  }, [fuelEntries, dateFrom, dateTo, monthFilter, filterVehicle, tripVehicleSet]);

  const filteredSpareEntries = useMemo(() => {
    return spareEntries.filter((s) => {
      if (!inRange(s.replaced_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && s.vehicle_number !== filterVehicle) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(s.vehicle_number)) return false;
      return true;
    });
  }, [spareEntries, dateFrom, dateTo, monthFilter, filterVehicle, tripVehicleSet]);

  const filteredMaintenance = useMemo(() => {
    return maintenanceEntries.filter((m) => {
      if (!inRange(m.start_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && m.vehicle_number !== filterVehicle) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(m.vehicle_number)) return false;
      return true;
    });
  }, [maintenanceEntries, dateFrom, dateTo, monthFilter, filterVehicle, tripVehicleSet]);

  const filteredMechanicEntries = useMemo(() => {
    return mechanicEntries.filter((m) => {
      if (!inRange(m.service_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && m.vehicle_number !== filterVehicle) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(m.vehicle_number)) return false;
      return true;
    });
  }, [mechanicEntries, dateFrom, dateTo, monthFilter, filterVehicle, tripVehicleSet]);

  const totals = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalDistance = filteredTrips.reduce((sum, t) => sum + Number(t.distance_km || 0), 0);
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + Number(t.total_charged || 0), 0);
    const totalPaid = filteredTrips.reduce((sum, t) => sum + Number(t.amount_received || 0), 0);
    const totalPending = filteredTrips.reduce((sum, t) => sum + Number(t.pending_amount || 0), 0);

    const invoiceBaseFare = filteredTrips.reduce((sum, t) => {
      const vehicles = Number(t.number_of_vehicles || 1);
      if (t.pricing_type === "package") {
        const tripDays = getTripDays(t.departure_datetime, t.return_datetime);
        return sum + (Number(t.package_amount || 0) * tripDays * vehicles);
      }
      return sum + (Number(t.distance_km || 0) * Number(t.cost_per_km || 0) * vehicles);
    }, 0);
    const invoiceCustomPricing = filteredTrips.reduce((sum, t) => {
      const vehicles = Number(t.number_of_vehicles || 1);
      const pricingItems = (t.pricing_items || []).filter((item) => item.item_type === "pricing");
      return sum + pricingItems.reduce((itemSum, item) => itemSum + getPricingItemAmount(item, vehicles), 0);
    }, 0);
    const invoiceChargedToll = filteredTrips.reduce((sum, t) => sum + Number(t.charged_toll_amount || 0), 0);
    const invoiceChargedParking = filteredTrips.reduce((sum, t) => sum + Number(t.charged_parking_amount || 0), 0);
    const invoiceExtraCharges = filteredTrips.reduce((sum, t) => {
      const chargeItems = (t.pricing_items || []).filter((item) => item.item_type === "charge");
      return sum + chargeItems.reduce((itemSum, item) => itemSum + getChargeItemAmount(item), 0);
    }, 0);
    const invoiceOtherExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.other_expenses || 0), 0);
    const invoiceDiscount = filteredTrips.reduce((sum, t) => sum + Number(t.discount_amount || 0), 0);

    const tripFuelExpenses = filteredTrips.reduce(
      (sum, t) => sum + Number(t.diesel_used || 0) + Number(t.petrol_used || 0),
      0
    );
    const directFuelExpenses = filteredFuelEntries.reduce((sum, f) => sum + Number(f.total_cost || 0), 0);
    const fuelExpenses = tripFuelExpenses + directFuelExpenses;
    const spareExpenses = filteredSpareEntries.reduce((sum, s) => sum + Number(s.cost || 0) * Number(s.quantity || 0), 0);
    const maintenanceExpenses = filteredMaintenance.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const mechanicExpenses = filteredMechanicEntries.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    const tollExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.toll_amount || 0), 0);
    const parkingExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.parking_amount || 0), 0);
    const totalOperatingExpense = fuelExpenses + spareExpenses + maintenanceExpenses + mechanicExpenses + tollExpenses + parkingExpenses;
    const netProfit = totalRevenue - totalOperatingExpense;

    return {
      totalTrips,
      totalDistance,
      totalRevenue,
      totalPaid,
      totalPending,
      invoiceBaseFare,
      invoiceCustomPricing,
      invoiceChargedToll,
      invoiceChargedParking,
      invoiceExtraCharges,
      invoiceOtherExpenses,
      invoiceDiscount,
      tripFuelExpenses,
      directFuelExpenses,
      fuelExpenses,
      tollExpenses,
      parkingExpenses,
      spareExpenses,
      maintenanceExpenses,
      mechanicExpenses,
      totalOperatingExpense,
      netProfit,
    };
  }, [filteredTrips, filteredFuelEntries, filteredSpareEntries, filteredMaintenance, filteredMechanicEntries]);

  const monthlyExpenseBreakdown = useMemo(() => {
    const monthlyMap = new Map();
    const add = (month, key, amount) => {
      if (!month) return;
      if (!monthlyMap.has(month)) monthlyMap.set(month, { tyres: 0, spare_parts: 0, other_expenses: 0 });
      monthlyMap.get(month)[key] += amount;
    };

    filteredSpareEntries.forEach((s) => {
      const amount = Number(s.cost || 0) * Number(s.quantity || 0);
      const name = String(s.part_name || "").toLowerCase();
      const month = getMonthKey(s.replaced_date);
      if (name.includes("tyre") || name.includes("tire")) add(month, "tyres", amount);
      else add(month, "spare_parts", amount);
    });

    filteredTrips.forEach((t) => {
      add(getMonthKey(t.trip_date), "other_expenses", Number(t.other_expenses || 0));
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, values]) => ({ month, ...values }));
  }, [filteredSpareEntries, filteredTrips]);

  const vendorWiseExpenses = useMemo(() => {
    const map = new Map();
    const add = (vendorName, type, amount) => {
      const key = String(vendorName || "").trim();
      if (!key || !vendorNameSet.has(key) || Number(amount || 0) <= 0) return;
      if (!map.has(key)) {
        map.set(key, {
          vendor: key,
          category: vendorCategoryByName.get(key) || "",
          fuel: 0,
          spare_parts: 0,
          mechanic: 0,
          total: 0
        });
      }
      map.get(key)[type] += amount;
      map.get(key).total += amount;
    };
    filteredFuelEntries.forEach((f) => add(f.vendor, "fuel", Number(f.total_cost || 0)));
    filteredTrips.forEach((t) => add(t.vendor, "fuel", Number(t.diesel_used || 0) + Number(t.petrol_used || 0)));
    filteredSpareEntries.forEach((s) => add(s.vendor, "spare_parts", Number(s.cost || 0) * Number(s.quantity || 0)));
    filteredMechanicEntries.forEach((m) => add(m.vendor, "mechanic", Number(m.cost || 0)));

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredFuelEntries, filteredSpareEntries, filteredTrips, filteredMechanicEntries, vendorCategoryByName, vendorNameSet]);

  const vendorMonthlySummary = useMemo(() => {
    const map = new Map();
    const add = (month, vendorName, amount) => {
      const vendor = String(vendorName || "").trim();
      if (!month || !vendor || !vendorNameSet.has(vendor) || Number(amount || 0) <= 0) return;
      const key = `${month}|${vendor}`;
      if (!map.has(key)) map.set(key, { month, vendor, amount: 0 });
      map.get(key).amount += amount;
    };

    filteredFuelEntries.forEach((f) => add(getMonthKey(f.filled_date), f.vendor, Number(f.total_cost || 0)));
    filteredTrips.forEach((t) => add(getMonthKey(t.trip_date), t.vendor, Number(t.diesel_used || 0) + Number(t.petrol_used || 0)));
    filteredSpareEntries.forEach((s) => add(getMonthKey(s.replaced_date), s.vendor, Number(s.cost || 0) * Number(s.quantity || 0)));
    filteredMechanicEntries.forEach((m) => add(getMonthKey(m.service_date), m.vendor, Number(m.cost || 0)));

    return Array.from(map.values()).sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return b.amount - a.amount;
    });
  }, [filteredFuelEntries, filteredSpareEntries, filteredTrips, filteredMechanicEntries, vendorNameSet]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;
    const formatMoney = (value) =>
      Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const reportPeriod = monthFilter || (
      dateFrom || dateTo
        ? `${dateFrom || "Start"} to ${dateTo || "End"}`
        : "All Dates"
    );
    const invoiceBreakdownRows = [
      ["Base Fare", totals.invoiceBaseFare],
      ["Custom Pricing", totals.invoiceCustomPricing],
      ["Charged Toll", totals.invoiceChargedToll],
      ["Charged Parking", totals.invoiceChargedParking],
      ["Extra Charge Items", totals.invoiceExtraCharges],
      ["Other Expenses", totals.invoiceOtherExpenses],
      ["Discount", -totals.invoiceDiscount],
      ["Invoice Total", totals.totalRevenue],
    ]
      .map(([label, amount]) => `
        <tr>
          <td>${label}</td>
          <td class="num">${formatMoney(amount)}</td>
        </tr>
      `)
      .join("");
    const operatingExpenseRows = [
      ["Fuel Expenses", totals.fuelExpenses],
      ["Spare Parts", totals.spareExpenses],
      ["Maintenance", totals.maintenanceExpenses],
      ["Mechanic (Mistry)", totals.mechanicExpenses],
      ["Toll Paid", totals.tollExpenses],
      ["Parking Paid", totals.parkingExpenses],
      ["Total Operating Expense", totals.totalOperatingExpense],
    ]
      .map(([label, amount]) => `
        <tr>
          <td>${label}</td>
          <td class="num">${formatMoney(amount)}</td>
        </tr>
      `)
      .join("");
    const tripRows = filteredTrips.length
      ? filteredTrips.map((trip) => `
          <tr>
            <td>${trip.invoice_number || `INV-${trip.id}`}</td>
            <td>${formatDateDDMMYYYY(trip.trip_date)}</td>
            <td>${customerNameById.get(trip.customer_id) || "N/A"}</td>
            <td>${trip.from_location} to ${trip.to_location}</td>
            <td class="num">${formatMoney(trip.total_charged)}</td>
            <td class="num">${formatMoney(trip.amount_received)}</td>
            <td class="num">${formatMoney(trip.pending_amount)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="7" class="empty">No trips found for the selected filters.</td></tr>`;
    const vendorRows = vendorWiseExpenses.length
      ? vendorWiseExpenses.map((vendor) => `
          <tr>
            <td>${vendor.vendor}</td>
            <td>${vendor.category || "General"}</td>
            <td class="num">${formatMoney(vendor.fuel)}</td>
            <td class="num">${formatMoney(vendor.spare_parts)}</td>
            <td class="num">${formatMoney(vendor.mechanic)}</td>
            <td class="num">${formatMoney(vendor.total)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="6" class="empty">No vendor expenses found for the selected filters.</td></tr>`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${COMPANY_NAME} - Financial Report</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }
            html, body {
              background: #fff;
              margin: 0;
              padding: 0;
              color: #111827;
              font-family: "Segoe UI", Arial, sans-serif;
            }
            body {
              padding: 0;
            }
            .page {
              width: 186mm;
              margin: 0 auto;
              font-size: 10.5pt;
              line-height: 1.35;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              padding-bottom: 10px;
              border-bottom: 1px solid #111827;
              margin-bottom: 12px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              height: 42px;
              width: auto;
            }
            .company {
              font-size: 9pt;
              line-height: 1.45;
            }
            .title-block {
              text-align: right;
              font-size: 9pt;
            }
            .report-title {
              font-size: 14pt;
              font-weight: 700;
              letter-spacing: 0.03em;
              text-transform: uppercase;
            }
            .meta {
              width: 100%;
              border: 1px solid #94a3b8;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .meta td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              font-size: 9pt;
            }
            .section {
              margin-bottom: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 10pt;
              font-weight: 700;
              text-transform: uppercase;
              border-bottom: 1px solid #111827;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            table.report-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .report-table th,
            .report-table td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              font-size: 9pt;
              vertical-align: top;
            }
            .report-table th {
              background: #eef2f7;
              text-align: left;
              font-weight: 700;
            }
            .num {
              text-align: right;
              white-space: nowrap;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
              gap: 8px;
              margin-bottom: 14px;
            }
            .summary-card {
              border: 1px solid #cbd5e1;
              padding: 8px;
            }
            .summary-card .label {
              font-size: 8pt;
              color: #475569;
              text-transform: uppercase;
            }
            .summary-card .value {
              margin-top: 4px;
              font-size: 12pt;
              font-weight: 700;
            }
            .empty {
              text-align: center;
              color: #64748b;
            }
            .footer {
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px solid #cbd5e1;
              font-size: 8.5pt;
              color: #64748b;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${NathkrupaLogo}" class="logo" alt="${COMPANY_NAME}" />
                <div class="company">
                  <div><strong>${COMPANY_NAME}</strong></div>
                  <div>${COMPANY_ADDRESS}</div>
                  <div>${COMPANY_CONTACT || ""}</div>
                  <div>${COMPANY_EMAIL ? `Email: ${COMPANY_EMAIL}` : ""}</div>
                </div>
              </div>
              <div class="title-block">
                <div class="report-title">Financial Report</div>
                <div>Generated: ${new Date().toLocaleString()}</div>
              </div>
            </div>

            <table class="meta">
              <tr>
                <td><strong>Report Period</strong></td>
                <td>${reportPeriod}</td>
                <td><strong>Vehicle Filter</strong></td>
                <td>${filterVehicle || "All Vehicles"}</td>
              </tr>
              <tr>
                <td><strong>Driver Filter</strong></td>
                <td>${filterDriver ? (drivers.find((d) => String(d.id) === String(filterDriver))?.name || filterDriver) : "All Drivers"}</td>
                <td><strong>Customer Search</strong></td>
                <td>${searchCustomer || "None"}</td>
              </tr>
            </table>

            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">Trips</div>
                <div class="value">${totals.totalTrips}</div>
              </div>
              <div class="summary-card">
                <div class="label">Revenue</div>
                <div class="value">Rs. ${formatMoney(totals.totalRevenue)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Paid</div>
                <div class="value">Rs. ${formatMoney(totals.totalPaid)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Pending</div>
                <div class="value">Rs. ${formatMoney(totals.totalPending)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Operating Expense</div>
                <div class="value">Rs. ${formatMoney(totals.totalOperatingExpense)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Net Profit</div>
                <div class="value">Rs. ${formatMoney(totals.netProfit)}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Invoice Breakdown</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="num">Amount</th>
                  </tr>
                </thead>
                <tbody>${invoiceBreakdownRows}</tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Operating Expenses</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="num">Amount</th>
                  </tr>
                </thead>
                <tbody>${operatingExpenseRows}</tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Vendor Expenses</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Category</th>
                    <th class="num">Diesel + Petrol</th>
                    <th class="num">Spare Parts Cost</th>
                    <th class="num">Mechanic Cost</th>
                    <th class="num">Total Amount</th>
                  </tr>
                </thead>
                <tbody>${vendorRows}</tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Filtered Trips</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th class="num">Charged</th>
                    <th class="num">Paid</th>
                    <th class="num">Pending</th>
                  </tr>
                </thead>
                <tbody>${tripRows}</tbody>
              </table>
            </div>

            <div class="footer">Computer-generated report</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div id="report-print-root" className="max-w-7xl mx-auto p-10 space-y-12 animate-in fade-in duration-700 print:text-slate-900">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-center">
        <div>
          <div className="bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 inline-block mb-6 shadow-sm">
            <img src={NathkrupaLogo} alt="Nath Krupa Travels" className="h-12 w-auto" />
          </div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tight">Financial Reports</h1>
          <p className="text-slate-500 font-medium mt-2 uppercase text-xs tracking-[0.2em]">Live business intelligence and expense tracking</p>
        </div>
        <button
          onClick={handlePrint}
          className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 no-print"
        >
          <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Export Report
        </button>
      </div>

      {/* ---------- FILTERS (GLASSMORPHISM) ---------- */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 no-print">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Filter Records</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Driver</label>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Period</label>
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quick Search</label>
            <input
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              placeholder="Customer name..."
            />
          </div>
        </div>
      </div>

      {/* ---------- STATS GRID ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <StatCard title="Trips Completed" value={totals.totalTrips} icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <StatCard title="Distance Traveled" value={`${totals.totalDistance} km`} icon="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M5 17H3m13 0h2m-2 0a2 2 0 104 0" />
        <StatCard title="Total Revenue" value={`₹ ${totals.totalRevenue.toFixed(0)}`} color="text-emerald-600" bg="bg-emerald-50" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard title="Pending Amount" value={`₹ ${totals.totalPending.toFixed(0)}`} color="text-amber-600" bg="bg-amber-50" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-600 rounded-full" />
          Revenue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <ExpenseDetailCard label="Total Revenue" value={totals.totalRevenue} color="text-emerald-700" />
          <ExpenseDetailCard label="Total Paid" value={totals.totalPaid} color="text-blue-700" />
          <ExpenseDetailCard label="Total Pending" value={totals.totalPending} color="text-amber-700" />
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Revenue Source</p>
            <p className="text-3xl font-black text-white tracking-tight">Invoice Total</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">Uses trip.total_charged directly from backend</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className={`p-10 rounded-[2.5rem] border border-blue-100 relative overflow-hidden group transition-all duration-500 ${totals.netProfit >= 0 ? "bg-emerald-600 shadow-emerald-200" : "bg-rose-600 shadow-rose-200"} shadow-2xl`}>
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <p className="text-white/60 font-black text-xs uppercase tracking-widest mb-4">Net Profit</p>
          <p className="text-6xl font-black text-white tracking-tighter">₹ {totals.netProfit.toFixed(2)}</p>
          <p className="text-white/40 text-xs font-medium mt-6 uppercase tracking-widest">Revenue minus operating expense</p>
        </div>

        <div className="p-10 bg-slate-900 rounded-[2.5rem] border border-slate-800 relative overflow-hidden group shadow-2xl shadow-slate-900/30">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest mb-4">Total Operating Expense</p>
          <p className="text-6xl font-black text-white tracking-tighter">₹ {totals.totalOperatingExpense.toFixed(2)}</p>
          <p className="text-slate-600 text-xs font-medium mt-6 uppercase tracking-widest">Fuel + spare parts + maintenance + toll + parking</p>
        </div>
      </div>

      {/* ---------- INVOICE BREAKDOWN ---------- */}
      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
          <div className="w-2 h-8 bg-rose-600 rounded-full" />
          Invoice Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          <ExpenseBox title="Base Fare" amount={totals.invoiceBaseFare} subtext="Invoice base fare" />
          <ExpenseBox title="Custom Pricing" amount={totals.invoiceCustomPricing} subtext="Pricing items billed to customer" icon="bg-indigo-50 text-indigo-600" />
          <ExpenseBox title="Charged Toll" amount={totals.invoiceChargedToll} subtext="Toll charged in invoice" icon="bg-blue-50 text-blue-600" />
          <ExpenseBox title="Charged Parking" amount={totals.invoiceChargedParking} subtext="Parking charged in invoice" icon="bg-cyan-50 text-cyan-600" />
          <ExpenseBox title="Extra Charges" amount={totals.invoiceExtraCharges} subtext="Charge items billed to customer" icon="bg-violet-50 text-violet-600" />
          <ExpenseBox title="Other Charges" amount={totals.invoiceOtherExpenses} subtext="Other expenses billed to customer" icon="bg-fuchsia-50 text-fuchsia-600" />
          <ExpenseBox title="Discount" amount={totals.invoiceDiscount} subtext="Discount given in invoice" icon="bg-amber-50 text-amber-600" />
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Invoice Revenue Total</p>
            <p className="text-3xl font-black text-white tracking-tight">₹ {totals.totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">This matches backend invoice total</p>
          </div>
        </div>
      </div>

      {/* ---------- OPERATING EXPENSES ---------- */}
      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full" />
          Operating Expenses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          <ExpenseDetailCard label="Fuel Expenses" value={totals.fuelExpenses} color="text-blue-700" />
          <ExpenseDetailCard label="Spare Parts" value={totals.spareExpenses} color="text-amber-700" />
          <ExpenseDetailCard label="Maintenance" value={totals.maintenanceExpenses} color="text-emerald-700" />
          <ExpenseDetailCard label="Mechanic (Mistry)" value={totals.mechanicExpenses} color="text-emerald-700" />
          <ExpenseDetailCard label="Toll Paid" value={totals.tollExpenses} color="text-rose-700" />
          <ExpenseDetailCard label="Parking Paid" value={totals.parkingExpenses} color="text-cyan-700" />
          <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Operating Expense</p>
            <p className="text-3xl font-black text-white tracking-tight">₹ {totals.totalOperatingExpense.toFixed(0)}</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">Fuel + Spare Parts + Maintenance + Mechanic + Toll + Parking</p>
          </div>
        </div>
      </div>

      {/* ---------- TABLES ---------- */}
      <div className="space-y-12 pb-20 no-print">
        <TableSection title="Vendor Expenses" columns={["Vendor Name", "Category", "Diesel + Petrol", "Spare Parts Cost", "Mechanic Cost", "Total Amount"]}>
          {vendorWiseExpenses.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            vendorWiseExpenses.map((v) => (
              <tr key={v.vendor} className="group hover:bg-slate-50 transition-colors">
                <td className="p-6 font-black text-slate-700">{v.vendor}</td>
                <td className="p-6 text-slate-500 font-bold uppercase">{v.category || "general"}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {v.fuel.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {v.spare_parts.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {v.mechanic.toFixed(2)}</td>
                <td className="p-6 font-black text-slate-800">₹ {v.total.toFixed(2)}</td>
              </tr>
            ))
          )}
        </TableSection>

        <TableSection title="Filtered Trips" columns={["Invoice #", "Trip Date", "Customer", "Journey Route", "Charged", "Paid", "Pending"]}>
          {filteredTrips.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            filteredTrips.map((t) => (
              <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                <td className="p-6">
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm" onClick={() => navigate(`/trips/${t.id}`)}>
                    {t.invoice_number || "VIEW"}
                  </button>
                </td>
                <td className="p-6 text-slate-500 font-bold text-sm">{formatDateDDMMYYYY(t.trip_date)}</td>
                <td className="p-6 font-black text-slate-700">{customerNameById.get(t.customer_id) || "N/A"}</td>
                <td className="p-6 text-slate-500 font-bold text-sm tracking-tight">{t.from_location} <span className="text-slate-300 mx-2">→</span> {t.to_location}</td>
                <td className="p-6 font-black text-slate-800">₹ {Number(t.total_charged || 0).toFixed(0)}</td>
                <td className="p-6 text-emerald-600 font-black">₹ {Number(t.amount_received || 0).toFixed(0)}</td>
                <td className="p-6 text-amber-600 font-black">₹ {Number(t.pending_amount || 0).toFixed(0)}</td>
              </tr>
            ))
          )}
        </TableSection>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-slate-800", bg = "bg-slate-50" }) {
  return (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
        </svg>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}

function ExpenseBox({ title, amount, subtext, icon = "bg-rose-50 text-rose-600" }) {
  return (
    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group hover:bg-white hover:shadow-xl transition-all duration-300">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-3xl font-black text-slate-800 tracking-tight">₹ {amount.toFixed(0)}</p>
      <p className="text-[10px] font-medium text-slate-400 mt-4 uppercase tracking-widest leading-loose">{subtext}</p>
    </div>
  );
}

function ExpenseDetailCard({ label, value, color }) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
      <p className={`text-3xl font-black mb-2 ${color}`}>₹ {Number(value || 0).toFixed(0)}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function TableSection({ title, columns, children }) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-10 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <div className="w-2 h-2 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50">
              {columns.map((c) => (
                <th key={c} className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-20 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Records Detected</p>
        </div>
      </td>
    </tr>
  );
}

