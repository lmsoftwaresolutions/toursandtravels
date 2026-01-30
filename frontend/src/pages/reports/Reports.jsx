import { useEffect, useState } from "react";
import api from "../../services/api";

export default function Reports() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [spareEntries, setSpareEntries] = useState([]);
  const [reportType, setReportType] = useState("summary");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState(""); // empty = all months

  const getDateKey = (dateStr) => {
    if (!dateStr) return null;
    const [datePart] = dateStr.split("T");
    const [year, month] = (datePart || "").split("-");
    if (!year || !month) return null;
    return `${year}-${month.padStart(2, "0")}`;
  };

  const toDateValue = (dateStr) => {
    if (!dateStr) return null;
    const [datePart] = dateStr.split("T");
    const [y, m, d] = (datePart || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt.getTime();
  };

  const isInMonth = (dateStr) => {
    if (!monthFilter) return true;
    const key = getDateKey(dateStr);
    return !key || key === monthFilter;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes, customersRes, fuelRes, spareRes] = await Promise.all([
        api.get("/trips"),
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/customers"),
        api.get("/fuel"),
        api.get("/spare-parts")
      ]);
      setTrips(tripsRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setCustomers(customersRes.data);
      setFuelEntries(fuelRes.data);
      setSpareEntries(spareRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const filterTrips = () => {
    let filtered = trips;
    if (filterVehicle) filtered = filtered.filter(t => t.vehicle_number === filterVehicle);
    if (filterDriver) filtered = filtered.filter(t => t.driver_id === Number(filterDriver));
    const fromVal = toDateValue(dateFrom);
    const toVal = toDateValue(dateTo);
    filtered = filtered.filter(t => {
      const tripVal = toDateValue(t.trip_date);
      if (tripVal === null) return true;
      if (fromVal !== null && tripVal < fromVal) return false;
      if (toVal !== null && tripVal > toVal) return false;
      return true;
    });
    filtered = filtered.filter(t => isInMonth(t.trip_date));
    return filtered;
  };

  const filteredTrips = filterTrips();

  // CALCULATIONS
  const totalTrips = filteredTrips.length;
  const totalDistance = filteredTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0);
  const totalPaid = filteredTrips.reduce((sum, t) => sum + (t.amount_received || 0), 0);
  const totalPending = filteredTrips.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

  // EXPENSES CALCULATION: Toll + Parking + Other + Fuel + Spare Parts
  const tripCharges = filteredTrips.reduce((sum, t) => sum + (t.toll_amount || 0) + (t.parking_amount || 0) + (t.other_expenses || 0), 0);
  
  // Fuel expenses for filtered trips
  const fuelExpenses = fuelEntries
    .filter(f => {
      const fuelDate = f.filled_date;
      if (dateFrom && fuelDate < dateFrom) return false;
      if (dateTo && fuelDate > dateTo) return false;
      if (!isInMonth(fuelDate)) return false;
      if (filterVehicle && f.vehicle_number !== filterVehicle) return false;
      return true;
    })
    .reduce((sum, f) => sum + (f.total_cost || 0), 0);

  // Spare parts expenses for filtered trips
  const spareExpenses = spareEntries
    .filter(s => {
      const spareDate = s.replaced_date;
      if (dateFrom && spareDate < dateFrom) return false;
      if (dateTo && spareDate > dateTo) return false;
      if (!isInMonth(spareDate)) return false;
      if (filterVehicle && s.vehicle_number !== filterVehicle) return false;
      return true;
    })
    .reduce((sum, s) => sum + (s.cost * s.quantity || 0), 0);

  const totalExpenses = tripCharges + fuelExpenses + spareExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const vehicleStats = vehicles.map(v => {
    const vehicleTrips = filteredTrips.filter(t => t.vehicle_number === v.vehicle_number);
    return {
      vehicle: v.vehicle_number,
      trips: vehicleTrips.length,
      distance: vehicleTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0),
      revenue: vehicleTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0)
    };
  }).filter(v => v.trips > 0);

  const driverStats = drivers.map(d => {
    const driverTrips = filteredTrips.filter(t => t.driver_id === d.id);
    return {
      driver: d.name,
      trips: driverTrips.length,
      distance: driverTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0),
      revenue: driverTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0)
    };
  }).filter(d => d.trips > 0);

  const paymentStatus = {
    paid: filteredTrips.filter(t => t.pending_amount === 0).length,
    partial: filteredTrips.filter(t => t.pending_amount > 0 && t.pending_amount < t.total_charged).length,
    pending: filteredTrips.filter(t => t.pending_amount === t.total_charged).length
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded shadow space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle:</label>
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.vehicle_number} value={v.vehicle_number}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Driver:</label>
            <select
              value={filterDriver}
              onChange={e => setFilterDriver(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            >
              <option value="">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">From Date:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To Date:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Month:</label>
            <input
              type="month"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
            <button
              type="button"
              onClick={() => setMonthFilter("")}
              className="text-sm text-blue-600 hover:text-blue-800 mt-1"
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Total Trips</p>
          <p className="text-2xl font-bold">{totalTrips}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Total Distance</p>
          <p className="text-2xl font-bold">{totalDistance} km</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">₹ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">₹ {totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      {/* SECOND ROW CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Net Profit</p>
          <p className="text-2xl font-bold" style={{ color: netProfit >= 0 ? "#16a34a" : "#dc2626" }}>
            ₹ {netProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Amount Collected</p>
          <p className="text-2xl font-bold text-blue-600">₹ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-600">Amount Pending</p>
          <p className="text-2xl font-bold text-yellow-600">₹ {totalPending.toFixed(2)}</p>
        </div>
      </div>

      {/* EXPENSE BREAKDOWN */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-4">Expense Breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-orange-50 rounded">
            <p className="text-2xl font-bold text-orange-600">₹ {tripCharges.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">Trip Charges<br/>(Toll, Parking)</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-600">₹ {fuelExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">Fuel Expenses</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded">
            <p className="text-2xl font-bold text-purple-600">₹ {spareExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">Spare Parts</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">₹ {totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">Total Expenses</p>
          </div>
        </div>
      </div>

      {/* PAYMENT STATUS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-4">Payment Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-600">{paymentStatus.paid}</p>
            <p className="text-sm text-gray-600">Fully Paid</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <p className="text-2xl font-bold text-yellow-600">{paymentStatus.partial}</p>
            <p className="text-sm text-gray-600">Partial Payment</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">{paymentStatus.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>
      </div>

      {/* VEHICLE STATISTICS */}
      {vehicleStats.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-4">Vehicle Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Vehicle</th>
                  <th className="p-2 text-left">Trips</th>
                  <th className="p-2 text-left">Distance</th>
                  <th className="p-2 text-left">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStats.map((v, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-semibold">{v.vehicle}</td>
                    <td className="p-2">{v.trips}</td>
                    <td className="p-2">{v.distance} km</td>
                    <td className="p-2 text-green-600">₹ {v.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRIVER STATISTICS */}
      {driverStats.length > 0 && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-4">Driver Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Driver</th>
                  <th className="p-2 text-left">Trips</th>
                  <th className="p-2 text-left">Distance</th>
                  <th className="p-2 text-left">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {driverStats.map((d, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 font-semibold">{d.driver}</td>
                    <td className="p-2">{d.trips}</td>
                    <td className="p-2">{d.distance} km</td>
                    <td className="p-2 text-green-600">₹ {d.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
