import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function Trips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/customers").then(res => setCustomers(res.data));
    api.get("/drivers").then(res => setDrivers(res.data));

    const vehicleParam = searchParams.get("vehicle");
    if (vehicleParam) {
      setSelectedVehicle(vehicleParam);
      setActiveTab("all");
    } else {
      fetchAllTrips();
    }
    setInitialLoadDone(true);
  }, [searchParams]);

  const fetchAllTrips = async () => {
    const res = await api.get("/trips");
    setTrips(res.data);
  };

  const searchByVehicle = useCallback(async () => {
    if (!selectedVehicle) {
      fetchAllTrips();
      return;
    }
    const res = await api.get(`/trips/vehicle/${selectedVehicle}`);
    setTrips(res.data);
  }, [selectedVehicle]);

  useEffect(() => {
    if (initialLoadDone && selectedVehicle) {
      searchByVehicle();
    }
  }, [searchByVehicle, initialLoadDone, selectedVehicle]);

  /* ---------------- FILTER BY TAB ---------------- */
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    let filtered = trips;
    if (activeTab === "upcoming") {
      filtered = trips.filter(t => t.trip_date >= today);
    } else if (activeTab === "past") {
      filtered = trips.filter(t => t.trip_date < today);
    }

    if (searchInvoice.trim()) {
      const invoiceQuery = searchInvoice.trim().toLowerCase();
      filtered = filtered.filter(t =>
        String(t.invoice_number || "").toLowerCase().includes(invoiceQuery)
      );
    }

    if (searchCustomer.trim()) {
      const customerQuery = searchCustomer.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const name = customers.find(c => c.id === t.customer_id)?.name || "";
        return name.toLowerCase().includes(customerQuery);
      });
    }

    setFilteredTrips(filtered);
  }, [trips, activeTab, searchInvoice, searchCustomer, customers]);

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trip?")) return;
    await api.delete(`/trips/${id}`);
    fetchAllTrips();
  };

  return (
    <div className="p-4 md:p-6">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4">
        <h1 className="text-2xl font-bold">Trips</h1>
        <button
          onClick={() => navigate("/trips/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Trip
        </button>
      </div>

      {/* ---------- TABS ---------- */}
      <div className="flex flex-wrap gap-2 mb-4 border-b">
        {["upcoming", "past", "all"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Trips
          </button>
        ))}
      </div>

      {/* ---------- FILTER ---------- */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <select
          className="border p-2 rounded w-full md:w-auto"
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
        >
          <option value="">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <button
          onClick={searchByVehicle}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          className="border p-2 rounded w-full md:w-auto"
          placeholder="Search by Customer Name"
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full md:w-auto"
          placeholder="Search by Invoice Number"
          value={searchInvoice}
          onChange={(e) => setSearchInvoice(e.target.value)}
        />
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="bg-white rounded shadow">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Invoice #</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Driver</th>
                <th className="p-2 text-left hidden md:table-cell">Distance (KM)</th>
                <th className="p-2 text-left hidden md:table-cell">Total Charged</th>
                <th className="p-2 text-left hidden md:table-cell">Received</th>
                <th className="p-2 text-left hidden md:table-cell">Pending</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-gray-500">
                    No trips found
                  </td>
                </tr>
              ) : (
                filteredTrips.map(trip => (
                  <tr key={trip.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-semibold text-blue-600">
                      {trip.invoice_number || "N/A"}
                    </td>
                    <td className="p-2">{formatDateDDMMYYYY(trip.trip_date)}</td>
                    <td className="p-2">
                      {customers.find(c => c.id === trip.customer_id)?.name || trip.customer_id}
                    </td>
                    <td className="p-2">
                      {drivers.find(d => d.id === trip.driver_id)?.name || trip.driver_id}
                    </td>

                    <td className="p-2 hidden md:table-cell">{trip.distance_km}</td>
                    <td className="p-2 hidden md:table-cell">
                      ₹{(trip.total_charged ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 hidden md:table-cell">
                      ₹{(trip.amount_received ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 hidden md:table-cell text-red-700">
                      ₹{(trip.pending_amount ?? 0).toFixed(2)}
                    </td>

                    <td className="p-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/trips/edit/${trip.id}`)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
