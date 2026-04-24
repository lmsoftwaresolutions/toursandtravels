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

const normalizeVendorName = (value) => String(value || "").trim().toLowerCase();

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

const getVehicleFuelExpense = (vehicleEntry) => {
  const directFuel = Number(vehicleEntry?.fuel_cost || 0);
  if (directFuel > 0) return directFuel;
  return Number(vehicleEntry?.diesel_used || 0) + Number(vehicleEntry?.petrol_used || 0);
};

const getTripFuelExpense = (trip) => {
  const linkedVehicles = Array.isArray(trip?.vehicles) ? trip.vehicles : [];
  if (linkedVehicles.length > 0) {
    return linkedVehicles.reduce((sum, entry) => sum + getVehicleFuelExpense(entry), 0);
  }
  return Number(trip?.diesel_used || 0) + Number(trip?.petrol_used || 0);
};

const getTripFuelByVendor = (trip) => {
  const buckets = new Map();
  const add = (vendorName, amount) => {
    const vendor = String(vendorName || "").trim();
    const value = Number(amount || 0);
    if (!vendor || value <= 0) return;
    buckets.set(vendor, Number(buckets.get(vendor) || 0) + value);
  };

  const linkedVehicles = Array.isArray(trip?.vehicles) ? trip.vehicles : [];
  if (linkedVehicles.length > 0) {
    linkedVehicles.forEach((entry) => {
      const amount = getVehicleFuelExpense(entry);
      add(entry?.fuel_vendor || trip?.vendor, amount);
    });
    return buckets;
  }

  add(trip?.vendor, getTripFuelExpense(trip));
  return buckets;
};

const getTripPartyFuelCredit = (trip) => {
  const linkedVehicles = Array.isArray(trip?.vehicles) ? trip.vehicles : [];
  if (linkedVehicles.length === 0) return 0;

  return linkedVehicles.reduce((sum, vehicleEntry) => {
    const vendorDeduction = Number(vehicleEntry?.vendor_deduction_amount || 0);
    const expenseCredits = Array.isArray(vehicleEntry?.expenses)
      ? vehicleEntry.expenses.reduce((inner, exp) => inner + Number(exp?.amount || 0), 0)
      : 0;
    return sum + vendorDeduction + expenseCredits;
  }, 0);
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
  const [payments, setPayments] = useState([]);
  const [driverSalaries, setDriverSalaries] = useState([]);
  const [financeDashboard, setFinanceDashboard] = useState(null);

  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterExpenseType, setFilterExpenseType] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const endpoints = [
      ["/trips", setTrips, []],
      ["/vehicles", setVehicles, []],
      ["/drivers", setDrivers, []],
      ["/customers", setCustomers, []],
      ["/vendors", setVendors, []],
      ["/fuel", setFuelEntries, []],
      ["/spare-parts", setSpareEntries, []],
      ["/maintenance", setMaintenanceEntries, []],
      ["/mechanic", setMechanicEntries, []],
      ["/payments", setPayments, []],
      ["/driver-salaries", setDriverSalaries, []],
      ["/vehicle-finance/dashboard-summary", setFinanceDashboard, null],
    ];

    const results = await Promise.allSettled(endpoints.map(([url]) => api.get(url)));
    results.forEach((result, index) => {
      const [url, setter, fallback] = endpoints[index];
      if (result.status === "fulfilled") {
        setter(result.value?.data ?? fallback);
        return;
      }
      console.error(`Error loading report data from ${url}:`, result.reason);
      setter(fallback);
    });
  };

  const customerNameById = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.id, c.name || ""));
    return map;
  }, [customers]);

  const customerPhoneById = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.id, c.phone || c.mobile || ""));
    return map;
  }, [customers]);

  const vendorMetaByNormalizedName = useMemo(() => {
    const map = new Map();
    vendors.forEach((vendor) => {
      const normalized = normalizeVendorName(vendor.name);
      if (!normalized) return;
      map.set(normalized, {
        name: String(vendor.name || "").trim(),
        category: vendor.category || "",
      });
    });
    return map;
  }, [vendors]);

  const vendorFilterOptions = useMemo(() => {
    const map = new Map();
    const add = (name) => {
      const normalized = normalizeVendorName(name);
      if (!normalized) return;
      if (!map.has(normalized)) map.set(normalized, String(name || "").trim());
    };

    vendors.forEach((v) => add(v.name));
    fuelEntries.forEach((entry) => add(entry.vendor));
    spareEntries.forEach((entry) => add(entry.vendor));
    mechanicEntries.forEach((entry) => add(entry.vendor));
    trips.forEach((trip) => {
      add(trip.vendor);
      (trip.vehicles || []).forEach((vehicleEntry) => add(vehicleEntry?.fuel_vendor));
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [vendors, fuelEntries, spareEntries, mechanicEntries, trips]);

  const normalizedFilterVendor = useMemo(() => normalizeVendorName(filterVendor), [filterVendor]);

  const filteredTrips = useMemo(() => {
    const searchCustomerQuery = searchCustomer.trim().toLowerCase();
    const searchInvoiceQuery = searchInvoice.trim().toLowerCase();

    return trips.filter((t) => {
      if (filterVehicle && t.vehicle_number !== filterVehicle) return false;
      if (filterDriver && t.driver_id !== Number(filterDriver)) return false;
      if (filterCustomer && t.customer_id !== Number(filterCustomer)) return false;
      if (normalizedFilterVendor && normalizeVendorName(t.vendor) !== normalizedFilterVendor) return false;
      if (!inRange(t.trip_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterPaymentStatus) {
        const charged = Number(t.total_charged || 0);
        const paid = Number(t.amount_received || 0);
        const pending = Math.max(charged - paid, 0);
        const status = charged <= 0 ? "not_billed" : pending <= 0 ? "paid" : paid <= 0 ? "unpaid" : "partial";
        if (status !== filterPaymentStatus) return false;
      }

      const customerName = String(customerNameById.get(t.customer_id) || "").toLowerCase();
      const customerPhone = String(customerPhoneById.get(t.customer_id) || "").toLowerCase();
      const invoice = String(t.invoice_number || "").toLowerCase();

      if (
        searchCustomerQuery &&
        !customerName.includes(searchCustomerQuery) &&
        !customerPhone.includes(searchCustomerQuery)
      ) return false;
      if (searchInvoiceQuery && !invoice.includes(searchInvoiceQuery)) return false;
      return true;
    });
  }, [trips, filterVehicle, filterDriver, filterCustomer, normalizedFilterVendor, filterPaymentStatus, dateFrom, dateTo, monthFilter, searchCustomer, searchInvoice, customerNameById, customerPhoneById]);

  const paymentsByTrip = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      const tripId = Number(payment.trip_id);
      if (!Number.isFinite(tripId)) return;
      const running = Number(map.get(tripId) || 0);
      map.set(tripId, running + Number(payment.amount || 0));
    });
    return map;
  }, [payments]);

  const getTripFinancials = (trip) => {
    const totalCharged = Number(trip?.total_charged || 0);
    const storedReceived = Number(trip?.amount_received || 0);
    const paymentReceived = Number(paymentsByTrip.get(Number(trip?.id)) || 0);
    const partyFuelCredit = getTripPartyFuelCredit(trip);
    const totalPaid = Math.max(storedReceived, paymentReceived) + partyFuelCredit;
    const totalPending = Math.max(totalCharged - totalPaid, 0);
    return { totalCharged, totalPaid, totalPending };
  };

  const getTripPaymentStatus = (trip) => {
    const { totalCharged, totalPaid, totalPending } = getTripFinancials(trip);
    if (totalCharged <= 0) return "not_billed";
    if (totalPending <= 0) return "paid";
    if (totalPaid <= 0) return "unpaid";
    return "partial";
  };

  const filteredFuelEntries = useMemo(() => {
    return fuelEntries.filter((f) => {
      if (!inRange(f.filled_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && f.vehicle_number !== filterVehicle) return false;
      if (normalizedFilterVendor && normalizeVendorName(f.vendor) !== normalizedFilterVendor) return false;
      return true;
    });
  }, [fuelEntries, dateFrom, dateTo, monthFilter, filterVehicle, normalizedFilterVendor]);

  const filteredSpareEntries = useMemo(() => {
    return spareEntries.filter((s) => {
      if (!inRange(s.replaced_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && s.vehicle_number !== filterVehicle) return false;
      if (normalizedFilterVendor && normalizeVendorName(s.vendor) !== normalizedFilterVendor) return false;
      return true;
    });
  }, [spareEntries, dateFrom, dateTo, monthFilter, filterVehicle, normalizedFilterVendor]);

  const filteredMaintenance = useMemo(() => {
    return maintenanceEntries.filter((m) => {
      if (!inRange(m.start_date || m.service_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && m.vehicle_number !== filterVehicle) return false;
      return true;
    });
  }, [maintenanceEntries, dateFrom, dateTo, monthFilter, filterVehicle]);

  const filteredMechanicEntries = useMemo(() => {
    return mechanicEntries.filter((m) => {
      if (!inRange(m.service_date, dateFrom, dateTo, monthFilter)) return false;
      if (filterVehicle && m.vehicle_number !== filterVehicle) return false;
      if (normalizedFilterVendor && normalizeVendorName(m.vendor) !== normalizedFilterVendor) return false;
      return true;
    });
  }, [mechanicEntries, dateFrom, dateTo, monthFilter, filterVehicle, normalizedFilterVendor]);

  const filteredDriverSalaries = useMemo(() => {
    return driverSalaries.filter((salary) => {
      if (!inRange(salary.paid_on, dateFrom, dateTo, monthFilter)) return false;
      if (filterDriver && Number(salary.driver_id) !== Number(filterDriver)) return false;
      return true;
    });
  }, [driverSalaries, dateFrom, dateTo, monthFilter, filterDriver]);

  const totals = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalDistance = filteredTrips.reduce((sum, t) => sum + Number(t.distance_km || 0), 0);
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + getTripFinancials(t).totalCharged, 0);
    const totalPaid = filteredTrips.reduce((sum, t) => sum + getTripFinancials(t).totalPaid, 0);
    const totalPending = filteredTrips.reduce((sum, t) => sum + getTripFinancials(t).totalPending, 0);

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
    const invoiceBaseFare = Math.max(
      totalRevenue -
        invoiceCustomPricing -
        invoiceChargedToll -
        invoiceChargedParking -
        invoiceExtraCharges -
        invoiceOtherExpenses +
        invoiceDiscount,
      0
    );
    const tripFuelExpenses = filteredTrips.reduce((sum, t) => sum + getTripFuelExpense(t), 0);

    const directFuelExpenses = filteredFuelEntries.reduce((sum, f) => sum + Number(f.total_cost || 0), 0);
    const fuelExpenses = tripFuelExpenses + directFuelExpenses;
    const driverBhattaExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.driver_bhatta || 0), 0);
    const driverSalaryExpenses = filteredDriverSalaries.reduce((sum, salary) => sum + Number(salary.amount || 0), 0);
    const driverExpenses = driverBhattaExpenses + driverSalaryExpenses;
    const spareExpenses = filteredSpareEntries.reduce((sum, s) => sum + Number(s.cost || 0) * Number(s.quantity || 0), 0);
    const maintenanceExpenses = filteredMaintenance.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const mechanicExpenses = filteredMechanicEntries.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    const tollExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.toll_amount || 0), 0);
    const parkingExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.parking_amount || 0), 0);
    const dailyRunningExpenses = filteredTrips.reduce((sum, t) => sum + Number(t.other_expenses || 0), 0);
    const monthlyFinanceOutflow = Number(financeDashboard?.total_monthly_finance_outflow || 0);
    const financeExpenses = monthlyFinanceOutflow;

    const expenseBuckets = {
      fuel: fuelExpenses,
      driver: driverExpenses,
      toll: tollExpenses,
      parking: parkingExpenses,
      maintenance: maintenanceExpenses,
      spare: spareExpenses,
      mechanic: mechanicExpenses,
      other: dailyRunningExpenses,
      finance: financeExpenses,
    };
    const selectedOperatingExpense = filterExpenseType
      ? Number(expenseBuckets[filterExpenseType] || 0)
      : (
        expenseBuckets.fuel +
        expenseBuckets.driver +
        expenseBuckets.toll +
        expenseBuckets.parking +
        expenseBuckets.maintenance +
        expenseBuckets.spare +
        expenseBuckets.mechanic +
        expenseBuckets.other +
        expenseBuckets.finance
      );

    const totalOperatingExpense = selectedOperatingExpense;
    const netProfit = totalRevenue - totalOperatingExpense;
    const actualProfit = netProfit;

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
      driverExpenses,
      driverBhattaExpenses,
      driverSalaryExpenses,
      tollExpenses,
      parkingExpenses,
      spareExpenses,
      maintenanceExpenses,
      mechanicExpenses,
      dailyRunningExpenses,
      financeExpenses,
      monthlyFinanceOutflow,
      totalOperatingExpense,
      netProfit,
      actualProfit,
    };
  }, [filteredTrips, filteredFuelEntries, filteredSpareEntries, filteredMaintenance, filteredMechanicEntries, filteredDriverSalaries, financeDashboard, filterExpenseType, paymentsByTrip]);

  const invoiceBreakdownCards = useMemo(() => {
    const cards = [
      { title: "Base Fare", amount: totals.invoiceBaseFare, subtext: "Invoice base fare" },
      { title: "Custom Pricing", amount: totals.invoiceCustomPricing, subtext: "Pricing items billed to customer", icon: "bg-indigo-50 text-indigo-600" },
      { title: "Charged Toll", amount: totals.invoiceChargedToll, subtext: "Toll charged in invoice", icon: "bg-blue-50 text-blue-600" },
      { title: "Charged Parking", amount: totals.invoiceChargedParking, subtext: "Parking charged in invoice", icon: "bg-cyan-50 text-cyan-600" },
      { title: "Extra Charges", amount: totals.invoiceExtraCharges, subtext: "Charge items billed to customer", icon: "bg-violet-50 text-violet-600" },
      { title: "Other Charges", amount: totals.invoiceOtherExpenses, subtext: "Other expenses billed to customer", icon: "bg-fuchsia-50 text-fuchsia-600" },
      { title: "Discount", amount: totals.invoiceDiscount, subtext: "Discount given in invoice", icon: "bg-amber-50 text-amber-600" },
    ];
    return cards.filter((card) => card.title === "Base Fare" || Number(card.amount || 0) > 0);
  }, [totals]);

  const operatingExpenseCards = useMemo(() => {
    const cards = [
      { label: "Fuel Expenses", value: totals.fuelExpenses, color: "text-blue-700" },
      { label: "Driver Expenses (Bhatta + Salary)", value: totals.driverExpenses, color: "text-slate-700" },
      { label: "Toll Paid", value: totals.tollExpenses, color: "text-rose-700" },
      { label: "Parking Paid", value: totals.parkingExpenses, color: "text-cyan-700" },
      { label: "Maintenance (Service)", value: totals.maintenanceExpenses, color: "text-emerald-700" },
      { label: "Spare Parts", value: totals.spareExpenses, color: "text-amber-700" },
      { label: "Mechanic (Mistry)", value: totals.mechanicExpenses, color: "text-emerald-700" },
      { label: "Other Running Expenses", value: totals.dailyRunningExpenses, color: "text-fuchsia-700" },
      { label: "EMI + Insurance + Tax", value: totals.financeExpenses, color: "text-violet-700" },
    ];
    return cards.filter((card) => Number(card.value || 0) > 0);
  }, [totals]);

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
      const normalized = normalizeVendorName(vendorName);
      const value = Number(amount || 0);
      if (!normalized || value <= 0) return;
      const vendorMeta = vendorMetaByNormalizedName.get(normalized);
      const displayName = vendorMeta?.name || String(vendorName || "").trim();
      if (!map.has(normalized)) {
        map.set(normalized, {
          vendor: displayName,
          category: vendorMeta?.category || "",
          fuel: 0,
          spare_parts: 0,
          mechanic: 0,
          total: 0
        });
      }
      map.get(normalized)[type] += value;
      map.get(normalized).total += value;
    };
    filteredFuelEntries.forEach((f) => add(f.vendor, "fuel", Number(f.total_cost || 0)));
    filteredTrips.forEach((trip) => {
      const vendorFuelBreakdown = getTripFuelByVendor(trip);
      vendorFuelBreakdown.forEach((amount, vendorName) => add(vendorName, "fuel", amount));
    });
    filteredSpareEntries.forEach((s) => add(s.vendor, "spare_parts", Number(s.cost || 0) * Number(s.quantity || 0)));
    filteredMechanicEntries.forEach((m) => add(m.vendor, "mechanic", Number(m.cost || 0)));

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredFuelEntries, filteredSpareEntries, filteredTrips, filteredMechanicEntries, vendorMetaByNormalizedName]);

  const vendorMonthlySummary = useMemo(() => {
    const map = new Map();
    const add = (month, vendorName, amount) => {
      const normalized = normalizeVendorName(vendorName);
      const value = Number(amount || 0);
      if (!month || !normalized || value <= 0) return;
      const vendorMeta = vendorMetaByNormalizedName.get(normalized);
      const displayName = vendorMeta?.name || String(vendorName || "").trim();
      const key = `${month}|${normalized}`;
      if (!map.has(key)) map.set(key, { month, vendor: displayName, amount: 0 });
      map.get(key).amount += value;
    };

    filteredFuelEntries.forEach((f) => add(getMonthKey(f.filled_date), f.vendor, Number(f.total_cost || 0)));
    filteredTrips.forEach((trip) => {
      const monthKey = getMonthKey(trip.trip_date);
      const vendorFuelBreakdown = getTripFuelByVendor(trip);
      vendorFuelBreakdown.forEach((amount, vendorName) => add(monthKey, vendorName, amount));
    });
    filteredSpareEntries.forEach((s) => add(getMonthKey(s.replaced_date), s.vendor, Number(s.cost || 0) * Number(s.quantity || 0)));
    filteredMechanicEntries.forEach((m) => add(getMonthKey(m.service_date), m.vendor, Number(m.cost || 0)));

    return Array.from(map.values()).sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return b.amount - a.amount;
    });
  }, [filteredFuelEntries, filteredSpareEntries, filteredTrips, filteredMechanicEntries, vendorMetaByNormalizedName]);

  const vehicleFinanceMap = useMemo(() => {
    const map = new Map();
    const rows = financeDashboard?.vehicle_wise_expenses || [];
    rows.forEach((row) => map.set(row.vehicle_number, row));
    return map;
  }, [financeDashboard]);

  const tripHasVehicle = (trip, vehicleNumber) => {
    if ((trip?.vehicle_number || "") === vehicleNumber) return true;
    const linked = Array.isArray(trip?.vehicles) ? trip.vehicles : [];
    return linked.some((item) => String(item?.vehicle_number || "") === vehicleNumber);
  };

  const vehicleWiseReport = useMemo(() => {
    const targetVehicles = vehicles.filter((v) => !filterVehicle || v.vehicle_number === filterVehicle);
    return targetVehicles.map((vehicle) => {
      const vehicleNumber = vehicle.vehicle_number;
      const relatedTrips = filteredTrips.filter((trip) => tripHasVehicle(trip, vehicleNumber));
      const tripCount = relatedTrips.length;
      const revenue = relatedTrips.reduce((sum, trip) => sum + getTripFinancials(trip).totalCharged, 0);
      const distance = relatedTrips.reduce((sum, trip) => {
        const linked = Array.isArray(trip.vehicles) ? trip.vehicles.filter((x) => x.vehicle_number === vehicleNumber) : [];
        if (linked.length > 0) return sum + linked.reduce((s, x) => s + Number(x.distance_km || 0), 0);
        if (trip.vehicle_number === vehicleNumber) return sum + Number(trip.distance_km || 0);
        return sum;
      }, 0);

      const tripFuel = relatedTrips.reduce((sum, trip) => {
        const linked = Array.isArray(trip.vehicles) ? trip.vehicles.filter((x) => x.vehicle_number === vehicleNumber) : [];
        if (linked.length > 0) {
          return sum + linked.reduce((s, x) => {
            const direct = Number(x.fuel_cost || 0);
            const fallback = Number(x.diesel_used || 0) + Number(x.petrol_used || 0);
            return s + (direct > 0 ? direct : fallback);
          }, 0);
        }
        if (trip.vehicle_number === vehicleNumber) return sum + Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0);
        return sum;
      }, 0);

      const driverCost = relatedTrips.reduce((sum, trip) => {
        const linked = Array.isArray(trip.vehicles) ? trip.vehicles.filter((x) => x.vehicle_number === vehicleNumber) : [];
        if (linked.length > 0) return sum + linked.reduce((s, x) => s + Number(x.driver_bhatta || 0), 0);
        if (trip.vehicle_number === vehicleNumber) return sum + Number(trip.driver_bhatta || 0);
        return sum;
      }, 0);

      const tollCost = relatedTrips.reduce((sum, trip) => {
        const linked = Array.isArray(trip.vehicles) ? trip.vehicles.filter((x) => x.vehicle_number === vehicleNumber) : [];
        if (linked.length > 0) return sum + linked.reduce((s, x) => s + Number(x.toll_amount || 0), 0);
        if (trip.vehicle_number === vehicleNumber) return sum + Number(trip.toll_amount || 0);
        return sum;
      }, 0);

      const parkingCost = relatedTrips.reduce((sum, trip) => {
        const linked = Array.isArray(trip.vehicles) ? trip.vehicles.filter((x) => x.vehicle_number === vehicleNumber) : [];
        if (linked.length > 0) return sum + linked.reduce((s, x) => s + Number(x.parking_amount || 0), 0);
        if (trip.vehicle_number === vehicleNumber) return sum + Number(trip.parking_amount || 0);
        return sum;
      }, 0);

      const directFuel = filteredFuelEntries
        .filter((f) => f.vehicle_number === vehicleNumber)
        .reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
      const maintenanceCost = filteredMaintenance
        .filter((m) => m.vehicle_number === vehicleNumber)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const spareCost = filteredSpareEntries
        .filter((s) => s.vehicle_number === vehicleNumber)
        .reduce((sum, row) => sum + Number(row.cost || 0) * Number(row.quantity || 0), 0);
      const mechanicCost = filteredMechanicEntries
        .filter((m) => m.vehicle_number === vehicleNumber)
        .reduce((sum, row) => sum + Number(row.cost || 0), 0);
      const finance = vehicleFinanceMap.get(vehicleNumber) || {};
      const emi = Number(finance.monthly_emi || 0);
      const insurance = Number(finance.monthly_insurance || 0);
      const tax = Number(finance.monthly_tax || 0);
      const totalExpense = tripFuel + directFuel + driverCost + tollCost + parkingCost + maintenanceCost + spareCost + mechanicCost + emi + insurance + tax;
      const profit = revenue - totalExpense;
      const runningCostPerKm = distance > 0 ? (totalExpense / distance) : 0;

      const latestTripDate = relatedTrips
        .map((trip) => String(trip.trip_date || ""))
        .filter(Boolean)
        .sort()
        .slice(-1)[0];
      const isActive = latestTripDate
        ? ((new Date() - new Date(latestTripDate)) / (1000 * 60 * 60 * 24)) <= 30
        : false;

      return {
        vehicle_number: vehicleNumber,
        total_trips: tripCount,
        total_revenue: revenue,
        total_expense: totalExpense,
        emi,
        insurance,
        tax,
        maintenance_cost: maintenanceCost + spareCost + mechanicCost,
        running_cost_per_km: runningCostPerKm,
        profit_loss: profit,
        status: isActive ? "active" : "inactive",
      };
    });
  }, [vehicles, filterVehicle, filteredTrips, filteredFuelEntries, filteredMaintenance, filteredSpareEntries, filteredMechanicEntries, vehicleFinanceMap]);

  const maintenanceUnitCost = totals.totalTrips > 0 ? ((totals.maintenanceExpenses + totals.spareExpenses + totals.mechanicExpenses) / totals.totalTrips) : 0;
  const fixedCostSharePerTrip = totals.totalTrips > 0 ? (totals.financeExpenses / totals.totalTrips) : 0;

  const tripWiseReport = useMemo(() => {
    return filteredTrips.map((trip) => {
      const financials = getTripFinancials(trip);
      const tripExpense =
        getTripFuelExpense(trip) +
        Number(trip.driver_bhatta || 0) +
        Number(trip.toll_amount || 0) +
        Number(trip.parking_amount || 0) +
        maintenanceUnitCost +
        fixedCostSharePerTrip;
      return {
        id: trip.id,
        invoice_number: trip.invoice_number || `INV-${trip.id}`,
        trip_date: trip.trip_date,
        customer_name: customerNameById.get(trip.customer_id) || "-",
        driver_name: (drivers.find((d) => Number(d.id) === Number(trip.driver_id))?.name) || "-",
        vehicle_number: trip.vehicle_number || "-",
        route: `${trip.from_location || "-"} -> ${trip.to_location || "-"}`,
        distance_km: Number(trip.distance_km || 0),
        charged_amount: financials.totalCharged,
        paid_amount: financials.totalPaid,
        pending_amount: financials.totalPending,
        fuel_used: getTripFuelExpense(trip),
        driver_cost: Number(trip.driver_bhatta || 0),
        toll: Number(trip.toll_amount || 0),
        parking: Number(trip.parking_amount || 0),
        maintenance_share: maintenanceUnitCost,
        fixed_cost_share: fixedCostSharePerTrip,
        trip_profit: financials.totalCharged - tripExpense,
        payment_status: getTripPaymentStatus(trip),
      };
    });
  }, [filteredTrips, customerNameById, drivers, maintenanceUnitCost, fixedCostSharePerTrip]);

  const pendingPaymentRows = useMemo(() => {
    return tripWiseReport.filter((row) => row.pending_amount > 0);
  }, [tripWiseReport]);

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
      .filter(([label, amount]) => label === "Base Fare" || label === "Invoice Total" || Math.abs(Number(amount || 0)) > 0)
      .map(([label, amount]) => `
        <tr>
          <td>${label}</td>
          <td class="num">${formatMoney(amount)}</td>
        </tr>
      `)
      .join("");
    const operatingExpenseRows = [
      ["Fuel Expenses", totals.fuelExpenses],
      ["Driver Expenses (Bhatta + Salary)", totals.driverExpenses],
      ["Toll Paid", totals.tollExpenses],
      ["Parking Paid", totals.parkingExpenses],
      ["Maintenance (Service)", totals.maintenanceExpenses],
      ["Spare Parts", totals.spareExpenses],
      ["Mechanic (Mistry)", totals.mechanicExpenses],
      ["Other Running Expenses", totals.dailyRunningExpenses],
      ["EMI + Insurance + Tax", totals.financeExpenses],
      ["Total Operating Expense", totals.totalOperatingExpense],
    ]
      .filter(([label, amount]) => label === "Total Operating Expense" || Number(amount || 0) > 0)
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
            <td>${customerNameById.get(trip.customer_id) || "N/A"}${customerPhoneById.get(trip.customer_id) ? ` (${customerPhoneById.get(trip.customer_id)})` : ""}</td>
            <td>${trip.from_location} to ${trip.to_location}</td>
            <td class="num">${formatMoney(getTripFinancials(trip).totalCharged)}</td>
            <td class="num">${formatMoney(getTripFinancials(trip).totalPaid)}</td>
            <td class="num">${formatMoney(getTripFinancials(trip).totalPending)}</td>
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
    const vehicleRows = vehicleWiseReport.length
      ? vehicleWiseReport.map((row) => `
          <tr>
            <td>${row.vehicle_number}</td>
            <td class="num">${row.total_trips}</td>
            <td class="num">${formatMoney(row.total_revenue)}</td>
            <td class="num">${formatMoney(row.total_expense)}</td>
            <td class="num">${formatMoney(row.emi + row.insurance + row.tax)}</td>
            <td class="num">${formatMoney(row.running_cost_per_km)}</td>
            <td class="num">${formatMoney(row.profit_loss)}</td>
            <td>${row.status}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="8" class="empty">No vehicle records found for the selected filters.</td></tr>`;
    const pendingRows = pendingPaymentRows.length
      ? pendingPaymentRows.map((row) => `
          <tr>
            <td>${row.invoice_number}</td>
            <td>${formatDateDDMMYYYY(row.trip_date)}</td>
            <td>${row.customer_name}</td>
            <td class="num">${formatMoney(row.charged_amount)}</td>
            <td class="num">${formatMoney(row.paid_amount)}</td>
            <td class="num">${formatMoney(row.pending_amount)}</td>
            <td>${row.payment_status}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="7" class="empty">No pending payment records found for the selected filters.</td></tr>`;

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
              <div class="summary-card">
                <div class="label">Actual Profit</div>
                <div class="value">Rs. ${formatMoney(totals.actualProfit)}</div>
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
              <div class="section-title">Vehicle-wise Report</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th class="num">Trips</th>
                    <th class="num">Revenue</th>
                    <th class="num">Expense</th>
                    <th class="num">EMI+Insurance+Tax</th>
                    <th class="num">Running Cost/KM</th>
                    <th class="num">Profit/Loss</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>${vehicleRows}</tbody>
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

            <div class="section">
              <div class="section-title">Pending Payments Report</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th class="num">Charged</th>
                    <th class="num">Paid</th>
                    <th class="num">Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>${pendingRows}</tbody>
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

  const handleExportExcel = () => {
    const lines = [];
    const addRow = (cells) => {
      lines.push(cells.map((cell) => {
        const value = String(cell ?? "");
        const escaped = value.replace(/"/g, "\"\"");
        return `"${escaped}"`;
      }).join(","));
    };

    addRow(["Financial Reports Export"]);
    addRow(["Generated At", new Date().toISOString()]);
    addRow([]);
    addRow(["Summary"]);
    addRow(["Total Trips", totals.totalTrips]);
    addRow(["Total Revenue", totals.totalRevenue.toFixed(2)]);
    addRow(["Total Paid", totals.totalPaid.toFixed(2)]);
    addRow(["Total Pending", totals.totalPending.toFixed(2)]);
    addRow(["Operating Expense", totals.totalOperatingExpense.toFixed(2)]);
    addRow(["Net Profit", totals.netProfit.toFixed(2)]);
    addRow(["Actual Profit", totals.actualProfit.toFixed(2)]);
    addRow([]);

    addRow(["Vehicle-wise Report"]);
    addRow(["Vehicle", "Trips", "Revenue", "Expense", "EMI", "Insurance", "Tax", "Running Cost/KM", "Profit/Loss", "Status"]);
    vehicleWiseReport.forEach((row) => {
      addRow([
        row.vehicle_number,
        row.total_trips,
        row.total_revenue.toFixed(2),
        row.total_expense.toFixed(2),
        row.emi.toFixed(2),
        row.insurance.toFixed(2),
        row.tax.toFixed(2),
        row.running_cost_per_km.toFixed(2),
        row.profit_loss.toFixed(2),
        row.status,
      ]);
    });
    addRow([]);

    addRow(["Trip-wise Report"]);
    addRow(["Invoice", "Trip Date", "Customer", "Driver", "Vehicle", "Route", "Distance", "Charged", "Paid", "Pending", "Fuel", "Driver Cost", "Toll", "Parking", "Maintenance Share", "Fixed Share", "Trip Profit", "Payment Status"]);
    tripWiseReport.forEach((row) => {
      addRow([
        row.invoice_number,
        row.trip_date,
        row.customer_name,
        row.driver_name,
        row.vehicle_number,
        row.route,
        row.distance_km,
        row.charged_amount.toFixed(2),
        row.paid_amount.toFixed(2),
        row.pending_amount.toFixed(2),
        row.fuel_used.toFixed(2),
        row.driver_cost.toFixed(2),
        row.toll.toFixed(2),
        row.parking.toFixed(2),
        row.maintenance_share.toFixed(2),
        row.fixed_cost_share.toFixed(2),
        row.trip_profit.toFixed(2),
        row.payment_status,
      ]);
    });
    addRow([]);

    addRow(["Vendor Report"]);
    addRow(["Vendor", "Category", "Fuel", "Spare Parts", "Mechanic", "Total"]);
    vendorWiseExpenses.forEach((row) => {
      addRow([row.vendor, row.category || "general", row.fuel.toFixed(2), row.spare_parts.toFixed(2), row.mechanic.toFixed(2), row.total.toFixed(2)]);
    });
    addRow([]);

    addRow(["Pending Payments Report"]);
    addRow(["Invoice", "Trip Date", "Customer", "Charged", "Paid", "Pending", "Status"]);
    pendingPaymentRows.forEach((row) => {
      addRow([row.invoice_number, row.trip_date, row.customer_name, row.charged_amount.toFixed(2), row.paid_amount.toFixed(2), row.pending_amount.toFixed(2), row.payment_status]);
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="report-print-root"
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 md:space-y-10 animate-in fade-in duration-700 print:text-slate-900"
    >

      {/* ---------- HEADER ---------- */}
      <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 md:p-8 shadow-xl shadow-slate-200/50">
        <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-blue-100/60 blur-2xl" />
        <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-cyan-100/50 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white/60 inline-block mb-5 shadow-sm">
            <img src={NathkrupaLogo} alt="Nath Krupa Travels" className="h-12 w-auto" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">Financial Reports</h1>
          <p className="text-slate-500 font-semibold mt-2 uppercase text-[11px] tracking-[0.18em]">Live business intelligence and expense tracking</p>
        </div>
        <button
          onClick={handlePrint}
          className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 no-print"
        >
          <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Export Report
        </button>
        <button
          onClick={handleExportExcel}
          className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-700/20 active:scale-95 no-print"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v8m-4-4h8M4 6h16M4 18h16" /></svg>
          Export Excel
        </button>
      </div>
      </div>

      {/* ---------- FILTERS (GLASSMORPHISM) ---------- */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Filter Records</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-5 md:gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
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
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` - ${c.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Period</label>
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Month</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vendor</label>
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Vendors</option>
              {vendorFilterOptions.map((vendorName) => (
                <option key={vendorName} value={vendorName}>{vendorName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expense Type</label>
            <select
              value={filterExpenseType}
              onChange={(e) => setFilterExpenseType(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Expenses</option>
              <option value="fuel">Fuel</option>
              <option value="driver">Driver</option>
              <option value="toll">Toll</option>
              <option value="parking">Parking</option>
              <option value="maintenance">Maintenance</option>
              <option value="spare">Spare Parts</option>
              <option value="mechanic">Mechanic</option>
              <option value="other">Other Running</option>
              <option value="finance">EMI + Insurance + Tax</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
              <option value="not_billed">Not Billed</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quick Search</label>
            <input
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              placeholder="Customer name or phone..."
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Invoice Search</label>
            <input
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              placeholder="Invoice number..."
            />
          </div>
        </div>
      </div>

      {/* ---------- STATS GRID ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
        <StatCard title="Trips Completed" value={totals.totalTrips} icon="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <StatCard title="Distance Traveled" value={`${totals.totalDistance} km`} icon="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M5 17H3m13 0h2m-2 0a2 2 0 104 0" />
        <StatCard title="Total Revenue" value={`₹ ${totals.totalRevenue.toFixed(0)}`} color="text-emerald-600" bg="bg-emerald-50" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard title="Pending Amount" value={`₹ ${totals.totalPending.toFixed(0)}`} color="text-amber-600" bg="bg-amber-50" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-600 rounded-full" />
          Revenue
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
          <ExpenseDetailCard label="Total Revenue" value={totals.totalRevenue} color="text-emerald-700" />
          <ExpenseDetailCard label="Total Paid" value={totals.totalPaid} color="text-blue-700" />
          <ExpenseDetailCard label="Total Pending" value={totals.totalPending} color="text-amber-700" />
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Revenue Source</p>
            <p className="text-3xl font-black text-white tracking-tight">Invoice Total</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">Uses trip.total_charged directly from backend</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <div className={`p-7 md:p-8 rounded-[2rem] border relative overflow-hidden group transition-all duration-500 ${totals.netProfit >= 0 ? "bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500 shadow-emerald-200/70" : "bg-gradient-to-br from-rose-600 to-rose-700 border-rose-500 shadow-rose-200/70"} shadow-xl`}>
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <p className="text-white/60 font-black text-xs uppercase tracking-widest mb-4">Net Profit</p>
          <p className="text-4xl md:text-6xl font-black text-white tracking-tighter">₹ {totals.netProfit.toFixed(2)}</p>
          <p className="text-white/50 text-[11px] font-medium mt-4 uppercase tracking-widest">Revenue minus operating expense</p>
        </div>

        <div className="p-7 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] border border-slate-700 relative overflow-hidden group shadow-xl shadow-slate-900/30">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest mb-4">Total Operating Expense</p>
          <p className="text-4xl md:text-6xl font-black text-white tracking-tighter">₹ {totals.totalOperatingExpense.toFixed(2)}</p>
          <p className="text-slate-500 text-[11px] font-medium mt-4 uppercase tracking-widest">Includes driver and EMI/insurance/tax when available</p>
        </div>
      </div>

      {/* ---------- INVOICE BREAKDOWN ---------- */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-rose-600 rounded-full" />
          Invoice Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
          {invoiceBreakdownCards.map((card) => (
            <ExpenseBox
              key={card.title}
              title={card.title}
              amount={card.amount}
              subtext={card.subtext}
              icon={card.icon}
            />
          ))}
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Invoice Revenue Total</p>
            <p className="text-3xl font-black text-white tracking-tight">₹ {totals.totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">This matches backend invoice total</p>
          </div>
        </div>
      </div>

      {/* ---------- OPERATING EXPENSES ---------- */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full" />
          Operating Expenses
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
          {operatingExpenseCards.map((card) => (
            <ExpenseDetailCard
              key={card.label}
              label={card.label}
              value={card.value}
              color={card.color}
            />
          ))}
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Operating Expense</p>
            <p className="text-3xl font-black text-white tracking-tight">₹ {totals.totalOperatingExpense.toFixed(0)}</p>
            <p className="text-[10px] font-medium text-slate-600 mt-4 uppercase tracking-widest">Includes Driver + EMI/Insurance/Tax when available</p>
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
                <td className="p-6 font-black text-slate-700">
                  <div>{customerNameById.get(t.customer_id) || "N/A"}</div>
                  {customerPhoneById.get(t.customer_id) ? (
                    <div className="text-[10px] text-slate-400 font-bold mt-1">{customerPhoneById.get(t.customer_id)}</div>
                  ) : null}
                </td>
                <td className="p-6 text-slate-500 font-bold text-sm tracking-tight">{t.from_location} <span className="text-slate-300 mx-2">→</span> {t.to_location}</td>
                <td className="p-6 font-black text-slate-800">₹ {getTripFinancials(t).totalCharged.toFixed(0)}</td>
                <td className="p-6 text-emerald-600 font-black">₹ {getTripFinancials(t).totalPaid.toFixed(0)}</td>
                <td className="p-6 text-amber-600 font-black">₹ {getTripFinancials(t).totalPending.toFixed(0)}</td>
              </tr>
            ))
          )}
        </TableSection>

        <TableSection title="Vehicle-wise Report" columns={["Vehicle", "Trips", "Revenue", "Expense", "EMI", "Insurance", "Tax", "Running Cost/KM", "Profit/Loss", "Status"]}>
          {vehicleWiseReport.length === 0 ? (
            <EmptyRow colSpan={10} />
          ) : (
            vehicleWiseReport.map((row) => (
              <tr key={row.vehicle_number} className="group hover:bg-slate-50 transition-colors">
                <td className="p-6 font-black text-slate-700">{row.vehicle_number}</td>
                <td className="p-6 text-slate-500 font-bold">{row.total_trips}</td>
                <td className="p-6 font-black text-slate-800">₹ {row.total_revenue.toFixed(2)}</td>
                <td className="p-6 font-black text-slate-700">₹ {row.total_expense.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.emi.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.insurance.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.tax.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.running_cost_per_km.toFixed(2)}</td>
                <td className={`p-6 font-black ${row.profit_loss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹ {row.profit_loss.toFixed(2)}</td>
                <td className="p-6">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${row.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </TableSection>

        <TableSection title="Trip-wise Profitability" columns={["Invoice #", "Trip Date", "Customer", "Driver", "Vehicle", "Route", "Distance", "Charged", "Paid", "Pending", "Fuel", "Driver Cost", "Toll", "Parking", "Maintenance Share", "Fixed Share", "Trip Profit", "Payment Status"]}>
          {tripWiseReport.length === 0 ? (
            <EmptyRow colSpan={18} />
          ) : (
            tripWiseReport.map((row) => (
              <tr key={row.id} className="group hover:bg-slate-50 transition-colors">
                <td className="p-6 font-black text-slate-700">{row.invoice_number}</td>
                <td className="p-6 text-slate-500 font-bold">{formatDateDDMMYYYY(row.trip_date)}</td>
                <td className="p-6 text-slate-700 font-bold">{row.customer_name}</td>
                <td className="p-6 text-slate-500 font-bold">{row.driver_name}</td>
                <td className="p-6 text-slate-500 font-bold">{row.vehicle_number}</td>
                <td className="p-6 text-slate-500 font-bold">{row.route}</td>
                <td className="p-6 text-slate-500 font-bold">{row.distance_km}</td>
                <td className="p-6 font-black text-slate-800">₹ {row.charged_amount.toFixed(2)}</td>
                <td className="p-6 font-black text-emerald-600">₹ {row.paid_amount.toFixed(2)}</td>
                <td className="p-6 font-black text-amber-600">₹ {row.pending_amount.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.fuel_used.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.driver_cost.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.toll.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.parking.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.maintenance_share.toFixed(2)}</td>
                <td className="p-6 text-slate-500 font-bold">₹ {row.fixed_cost_share.toFixed(2)}</td>
                <td className={`p-6 font-black ${row.trip_profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹ {row.trip_profit.toFixed(2)}</td>
                <td className="p-6 text-slate-600 font-black uppercase text-[10px]">{row.payment_status}</td>
              </tr>
            ))
          )}
        </TableSection>

        <TableSection title="Pending Payments Report" columns={["Invoice #", "Trip Date", "Customer", "Charged", "Paid", "Pending", "Status"]}>
          {pendingPaymentRows.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            pendingPaymentRows.map((row) => (
              <tr key={`pending-${row.id}`} className="group hover:bg-slate-50 transition-colors">
                <td className="p-6 font-black text-slate-700">{row.invoice_number}</td>
                <td className="p-6 text-slate-500 font-bold">{formatDateDDMMYYYY(row.trip_date)}</td>
                <td className="p-6 text-slate-700 font-bold">{row.customer_name}</td>
                <td className="p-6 font-black text-slate-800">₹ {row.charged_amount.toFixed(2)}</td>
                <td className="p-6 font-black text-emerald-600">₹ {row.paid_amount.toFixed(2)}</td>
                <td className="p-6 font-black text-amber-600">₹ {row.pending_amount.toFixed(2)}</td>
                <td className="p-6 text-slate-600 font-black uppercase text-[10px]">{row.payment_status}</td>
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
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/35 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
        </svg>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-3xl md:text-4xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}

function ExpenseBox({ title, amount, subtext, icon = "bg-rose-50 text-rose-600" }) {
  return (
    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-3xl font-black text-slate-800 tracking-tight">₹ {amount.toFixed(0)}</p>
      <p className="text-[10px] font-semibold text-slate-400 mt-3 uppercase tracking-widest leading-loose">{subtext}</p>
    </div>
  );
}

function ExpenseDetailCard({ label, value, color }) {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl border border-slate-200 group hover:shadow-xl transition-all duration-300">
      <p className={`text-3xl font-black mb-2 ${color}`}>₹ {Number(value || 0).toFixed(0)}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function TableSection({ title, columns, children }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
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
            <tr className="bg-slate-50">
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
