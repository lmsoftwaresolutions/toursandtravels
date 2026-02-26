import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function InvoiceList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");

  useEffect(() => {
    loadTrips();
    loadCustomers();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips");
      setTrips(res.data);
    } catch (error) {
      console.error("Error loading trips:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  let filteredTrips = filterCustomer
    ? trips.filter(t => t.customer_id === Number(filterCustomer))
    : trips;

  if (searchCustomer.trim()) {
    const query = searchCustomer.trim().toLowerCase();
    filteredTrips = filteredTrips.filter(t => {
      const name = customers.find(c => c.id === t.customer_id)?.name || "";
      return name.toLowerCase().includes(query);
    });
  }

  if (searchInvoice.trim()) {
    const query = searchInvoice.trim().toLowerCase();
    filteredTrips = filteredTrips.filter(t => {
      const invoice = String(t.invoice_number || `INV-${String(t.id).padStart(4, "0")}`);
      return invoice.toLowerCase().includes(query);
    });
  }

  const totalInvoiced = filteredTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0);
  const totalPaid = filteredTrips.reduce((sum, t) => sum + (t.amount_received || 0), 0);
  const totalPending = filteredTrips.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Invoiced</p>
          <p className="text-2xl font-bold">₹ {totalInvoiced.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">₹ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Due</p>
          <p className="text-2xl font-bold text-red-600">₹ {totalPending.toFixed(2)}</p>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded shadow">
        <label className="block text-sm font-medium mb-2">Filter by Customer:</label>
        <select
          value={filterCustomer}
          onChange={e => setFilterCustomer(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border p-2 rounded"
            placeholder="Search by Customer Name"
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Search by Invoice Number"
            value={searchInvoice}
            onChange={e => setSearchInvoice(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Invoice ID</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Trip Date</th>
              <th className="p-2 text-left">Vehicle</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Paid</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-4 text-center text-gray-500">
                  No invoices found
                </td>
              </tr>
            ) : (
              filteredTrips.map(trip => {
                const customer = customers.find(c => c.id === trip.customer_id);
                const status = trip.pending_amount === 0 ? "Paid" : trip.pending_amount === trip.total_charged ? "Pending" : "Partial";
                const statusColor = status === "Paid" ? "green" : status === "Pending" ? "red" : "yellow";

                return (
                  <tr key={trip.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-semibold">
                      <button
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}
                      </button>
                    </td>
                    <td className="p-2">{customer?.name || "N/A"}</td>
                    <td className="p-2">{formatDateDDMMYYYY(trip.trip_date)}</td>
                    <td className="p-2">{trip.vehicle_number}</td>
                    <td className="p-2">₹ {(trip.total_charged || 0).toFixed(2)}</td>
                    <td className="p-2 text-green-600">₹ {(trip.amount_received || 0).toFixed(2)}</td>
                    <td className="p-2 text-red-600 font-semibold">₹ {(trip.pending_amount || 0).toFixed(2)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-white text-xs font-semibold`} style={{ backgroundColor: statusColor === "green" ? "#16a34a" : statusColor === "red" ? "#dc2626" : "#eab308" }}>
                        {status}
                      </span>
                    </td>
                    <td className="p-2 space-x-2">
                      <button
                        onClick={() => navigate(`/invoices/${trip.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        View
                      </button>
                      <button
                        onClick={() => window.open(`/invoices/${trip.id}`, "_blank")}
                        className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-black"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
