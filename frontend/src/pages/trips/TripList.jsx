import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";

export default function Trips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, past, all
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  /* ---------------- LOAD VEHICLES & CHECK URL PARAMS ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/customers").then(res => setCustomers(res.data));
    api.get("/drivers").then(res => setDrivers(res.data));
    
    // Check if vehicle filter is in URL
    const vehicleParam = searchParams.get("vehicle");
    if (vehicleParam) {
      setSelectedVehicle(vehicleParam);
      setActiveTab("all"); // Set to "all" tab when filtering by vehicle
    } else {
      // Only load all trips if no vehicle filter in URL
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
      const res = await api.get("/trips");
      setTrips(res.data);
      return;
    }
    const res = await api.get(`/trips/vehicle/${selectedVehicle}`);
    setTrips(res.data);
  }, [selectedVehicle]);

  /* ---------------- AUTO-FILTER WHEN VEHICLE SELECTED ---------------- */
  useEffect(() => {
    if (initialLoadDone && selectedVehicle) {
      searchByVehicle();
    }
  }, [searchByVehicle, initialLoadDone, selectedVehicle]);

  /* ---------------- FILTER BY TAB ---------------- */
  useEffect(() => {
    filterTripsByTab();
  }, [trips, activeTab]);

  const filterTripsByTab = () => {
    const today = new Date().toISOString().split('T')[0];
    
    let filtered = trips;
    if (activeTab === "upcoming") {
      filtered = trips.filter(t => t.trip_date >= today);
    } else if (activeTab === "past") {
      filtered = trips.filter(t => t.trip_date < today);
    }
    
    setFilteredTrips(filtered);
  };

  /* ---------------- DELETE TRIP ---------------- */
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this trip?"
    );
    if (!confirmDelete) return;

    await api.delete(`/trips/${id}`);
    fetchAllTrips();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Trips</h1>
        <button
          onClick={() => navigate("/trips/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Trip
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Upcoming Trips
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "past"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Past Trips
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          All Trips
        </button>
      </div>

      {/* FILTER */}
      <div className="flex gap-2 mb-4">
        <select
          className="border p-2 rounded"
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

      {/* TABLE */}
      <div className="bg-white rounded shadow">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Invoice #</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Driver</th>
              <th className="p-2 text-left">Distance (KM)</th>
              <th className="p-2 text-left">Total Charged</th>
              <th className="p-2 text-left">Received</th>
              <th className="p-2 text-left">Pending</th>
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
                <tr key={trip.id} className="border-t">
                  <td className="p-2 font-semibold text-blue-600">{trip.invoice_number || "N/A"}</td>
                  <td className="p-2">{trip.trip_date}</td>
                  <td className="p-2">
                    {customers.find(c => c.id === trip.customer_id)?.name || trip.customer_id}
                  </td>
                  <td className="p-2">
                    {drivers.find(d => d.id === trip.driver_id)?.name || trip.driver_id}
                  </td>
                  <td className="p-2">{trip.distance_km}</td>
                  <td className="p-2">₹{(trip.total_charged ?? 0).toFixed(2)}</td>
                  <td className="p-2">₹{(trip.amount_received ?? 0).toFixed(2)}</td>
                  <td className="p-2 text-red-700">₹{(trip.pending_amount ?? 0).toFixed(2)}</td>
                  <td className="p-2 space-x-2">
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
  );
}
