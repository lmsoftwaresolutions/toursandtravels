import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Reports() {
  const navigate = useNavigate();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [spareEntries, setSpareEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);

  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes, customersRes, fuelRes, spareRes, maintenanceRes] = await Promise.all([
        api.get("/trips"),
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/customers"),
        api.get("/vendors"),
        api.get("/fuel"),
        api.get("/spare-parts"),
        api.get("/maintenance"),
      ]);
      setTrips(tripsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setDrivers(driversRes.data || []);
      setCustomers(customersRes.data || []);
      setFuelEntries(fuelRes.data || []);
      setSpareEntries(spareRes.data || []);
      setMaintenanceEntries(maintenanceRes.data || []);
    } catch (error) {
      console.error("Error loading report data:", error);
      console.error("Error loading report data:", error);
    }
  };

  const customerNameById = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.id, c.name || ""));
    return map;
  }, [customers]);

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
  }, [trips, filterVehicle, filterDriver, dateFrom, dateTo, monthFilter, searchCustomer, searchInvoice, customerNameById]);

  const tripVehicleSet = useMemo(() => new Set(filteredTrips.map((t) => t.vehicle_number)), [filteredTrips]);

  const filteredFuelEntries = useMemo(() => {
    return fuelEntries.filter((f) => {
      if (!inRange(f.filled_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && f.vehicle_number !== filterVehicle) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(f.vehicle_number)) return false;
      if (!filterVehicle && tripVehicleSet.size > 0 && !tripVehicleSet.has(f.vehicle_number)) return false;
      return true;
    });
  }, [fuelEntries, dateFrom, dateTo, monthFilter, filterVehicle, tripVehicleSet]);

  const filteredSpareEntries = useMemo(() => {
    return spareEntries.filter((s) => {
      if (!inRange(s.replaced_date, dateFrom, dateTo, monthFilter)) return false;
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

  const totals = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalDistance = filteredTrips.reduce((sum, t) => sum + Number(t.distance_km || 0), 0);
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + Number(t.total_charged || 0), 0);
    const totalPaid = filteredTrips.reduce((sum, t) => sum + Number(t.amount_received || 0), 0);
    const totalPending = filteredTrips.reduce((sum, t) => sum + Number(t.pending_amount || 0), 0);

    const tollAndParking = filteredTrips.reduce(
      (sum, t) => sum + Number(t.toll_amount || 0) + Number(t.parking_amount || 0),
      0
    );
    const otherTripExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.other_expenses || 0), 0);
    const fuelExpenses = filteredFuelEntries.reduce((sum, f) => sum + Number(f.total_cost || 0), 0);
    const spareExpenses = filteredSpareEntries.reduce((sum, s) => sum + Number(s.cost || 0) * Number(s.quantity || 0), 0);
    const maintenanceExpenses = filteredMaintenance.reduce((sum, m) => sum + Number(m.amount || 0), 0);

    const totalExpenses = tollAndParking + otherTripExpenses + fuelExpenses + spareExpenses + maintenanceExpenses;
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalTrips,
      totalDistance,
      totalRevenue,
      totalPaid,
      totalPending,
      tollAndParking,
      otherTripExpenses,
      fuelExpenses,
      spareExpenses,
      maintenanceExpenses,
      totalExpenses,
      netProfit,
    };
  }, [filteredTrips, filteredFuelEntries, filteredSpareEntries, filteredMaintenance]);

  const maintenanceTypeBreakdown = useMemo(() => {
    return filteredMaintenance.reduce(
      (acc, m) => {
        const type = String(m.maintenance_type || "").toLowerCase();
        if (type === "emi") acc.emi += Number(m.amount || 0);
        else if (type === "insurance") acc.insurance += Number(m.amount || 0);
        else if (type === "tax") acc.tax += Number(m.amount || 0);
        return acc;
      },
      { emi: 0, insurance: 0, tax: 0 }
    );
  }, [filteredMaintenance]);

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
      const key = vendorName || "Unassigned";
      if (!map.has(key)) map.set(key, { vendor: key, fuel: 0, spare: 0, total: 0 });
      map.get(key)[type] += amount;
      map.get(key).total += amount;
    };
    filteredFuelEntries.forEach((f) => add(f.vendor, "fuel", Number(f.total_cost || 0)));
    filteredSpareEntries.forEach((s) => add(s.vendor, "spare", Number(s.cost || 0) * Number(s.quantity || 0)));

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredFuelEntries, filteredSpareEntries]);

  const vendorMonthlySummary = useMemo(() => {
    const map = new Map();
    const add = (month, vendorName, amount) => {
      const vendor = vendorName || "Unassigned";
      const key = `${month}|${vendor}`;
      if (!map.has(key)) map.set(key, { month, vendor, amount: 0 });
      map.get(key).amount += amount;
    };

    filteredFuelEntries.forEach((f) => add(getMonthKey(f.filled_date), f.vendor, Number(f.total_cost || 0)));
    filteredSpareEntries.forEach((s) => add(getMonthKey(s.replaced_date), s.vendor, Number(s.cost || 0) * Number(s.quantity || 0)));

    return Array.from(map.values()).sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return b.amount - a.amount;
    });
  }, [filteredFuelEntries, filteredSpareEntries]);

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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-white p-3 rounded shadow">
        <img src={NathkrupaLogo} alt="Nath Krupa Travels" className="h-10 w-auto" />
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded no-print">
          Print Report
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle:</label>
            <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} className="w-full border p-2 rounded text-sm">
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_number} value={v.vehicle_number}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Driver:</label>
            <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full border p-2 rounded text-sm">
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From Date:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Month:</label>
            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name:</label>
            <input
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full border p-2 rounded text-sm"
              placeholder="Search customer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Number:</label>
            <input
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              className="w-full border p-2 rounded text-sm"
              placeholder="Search invoice"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Stat title="Total Trips" value={totals.totalTrips} />
        <Stat title="Total Distance" value={`${totals.totalDistance} km`} />
        <Stat title="Total Revenue" value={`₹ ${totals.totalRevenue.toFixed(2)}`} color="text-green-600" />
        <Stat title="Total Expenses" value={`₹ ${totals.totalExpenses.toFixed(2)}`} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Stat title="Net Profit" value={`₹ ${totals.netProfit.toFixed(2)}`} color={totals.netProfit >= 0 ? "text-green-600" : "text-red-600"} />
        <Stat title="Amount Collected" value={`₹ ${totals.totalPaid.toFixed(2)}`} color="text-blue-600" />
        <Stat title="Amount Pending" value={`₹ ${totals.totalPending.toFixed(2)}`} color="text-yellow-600" />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-4">Expense Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ExpenseCard label="Toll + Parking" value={totals.tollAndParking} color="text-orange-600" />
          <ExpenseCard label="Fuel" value={totals.fuelExpenses} color="text-blue-600" />
          <ExpenseCard label="Spare Parts" value={totals.spareExpenses} color="text-purple-600" />
          <ExpenseCard label="Other Trip Expenses" value={totals.otherTripExpenses} color="text-gray-700" />
          <ExpenseCard label="EMI + Insurance + Tax" value={totals.maintenanceExpenses} color="text-red-600" />
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-4">Maintenance Type Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ExpenseCard label="EMI" value={maintenanceTypeBreakdown.emi} color="text-blue-700" />
          <ExpenseCard label="Insurance" value={maintenanceTypeBreakdown.insurance} color="text-green-700" />
          <ExpenseCard label="Tax" value={maintenanceTypeBreakdown.tax} color="text-red-700" />
        </div>
      </div>

      <TableCard title="Vendor-wise Expense Breakup" columns={["Vendor", "Fuel", "Spare Parts", "Total"]}>
        {vendorWiseExpenses.length === 0 ? (
          <EmptyRow colSpan={4} />
        ) : (
          vendorWiseExpenses.map((v) => (
            <tr key={v.vendor} className="border-t">
              <td className="p-2">{v.vendor}</td>
              <td className="p-2">₹ {v.fuel.toFixed(2)}</td>
              <td className="p-2">₹ {v.spare.toFixed(2)}</td>
              <td className="p-2 font-semibold">₹ {v.total.toFixed(2)}</td>
            </tr>
          ))
        )}
      </TableCard>

      <TableCard title="Monthly Vendor Expense Summary" columns={["Month", "Vendor", "Amount"]}>
        {vendorMonthlySummary.length === 0 ? (
          <EmptyRow colSpan={3} />
        ) : (
          vendorMonthlySummary.map((row, idx) => (
            <tr key={`${row.month}-${row.vendor}-${idx}`} className="border-t">
              <td className="p-2">{row.month}</td>
              <td className="p-2">{row.vendor}</td>
              <td className="p-2 font-semibold">₹ {row.amount.toFixed(2)}</td>
            </tr>
          ))
        )}
      </TableCard>

      <TableCard title="Monthly Expense Reports (Tyres / Spare Parts / Other)" columns={["Month", "Tyres", "Spare Parts", "Other Expenses"]}>
        {monthlyExpenseBreakdown.length === 0 ? (
          <EmptyRow colSpan={4} />
        ) : (
          monthlyExpenseBreakdown.map((row) => (
            <tr key={row.month} className="border-t">
              <td className="p-2">{row.month}</td>
              <td className="p-2">₹ {row.tyres.toFixed(2)}</td>
              <td className="p-2">₹ {row.spare_parts.toFixed(2)}</td>
              <td className="p-2">₹ {row.other_expenses.toFixed(2)}</td>
            </tr>
          ))
        )}
      </TableCard>

      <TableCard title="Filtered Trips" columns={["Invoice", "Date", "Customer", "Route", "Charged", "Received", "Pending"]}>
        {filteredTrips.length === 0 ? (
          <EmptyRow colSpan={7} />
        ) : (
          filteredTrips.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">
                <button className="text-blue-600 hover:underline" onClick={() => navigate(`/trips/${t.id}`)}>
                  {t.invoice_number || "N/A"}
                </button>
              </td>
              <td className="p-2">{formatDateDDMMYYYY(t.trip_date)}</td>
              <td className="p-2">{customerNameById.get(t.customer_id) || "N/A"}</td>
              <td className="p-2">{t.from_location} → {t.to_location}</td>
              <td className="p-2">₹ {Number(t.total_charged || 0).toFixed(2)}</td>
              <td className="p-2">₹ {Number(t.amount_received || 0).toFixed(2)}</td>
              <td className="p-2">₹ {Number(t.pending_amount || 0).toFixed(2)}</td>
            </tr>
          ))
        )}
      </TableCard>
    </div>
  );
}

function Stat({ title, value, color = "" }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-xs text-gray-600">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ExpenseCard({ label, value, color }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded">
      <p className={`text-lg font-bold ${color}`}>₹ {Number(value || 0).toFixed(2)}</p>
      <p className="text-xs text-gray-600 mt-1">{label}</p>
    </div>
  );
}

function TableCard({ title, columns, children }) {
  return (
    <div className="bg-white p-4 rounded shadow overflow-x-auto">
      <h3 className="font-semibold mb-4">{title}</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            {columns.map((c) => (
              <th key={c} className="p-2 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-4 text-center text-gray-500">
        No records found
      </td>
    </tr>
  );
}
