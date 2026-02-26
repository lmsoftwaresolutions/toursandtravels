import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/customers/${id}/trips`)
      .then((res) => {
        setCustomer(res.data.customer);
        setTrips(res.data.trips);
      })
      .catch(() => setError("Unable to load customer"));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!customer) return <p>Loading...</p>;

  const filteredTrips = searchInvoice.trim()
    ? trips.filter(t =>
        String(t.invoice_number || "").toLowerCase().includes(searchInvoice.trim().toLowerCase())
      )
    : trips;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <div className="space-x-2">
          <button
            onClick={() => navigate(`/customers/edit/${id}`)}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Edit
          </button>
          <button
            onClick={() => navigate("/customers")}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-3 w-full max-w-3xl">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <p><b>Total Trips:</b> {customer.total_trips}</p>
          <p><b>Total Billed:</b> ₹{customer.total_billed?.toFixed(2)}</p>
          <p>
            <b>Amount Paid:</b> ₹{(
              (customer.total_billed ?? 0) -
              (customer.pending_balance ?? 0)
            ).toFixed(2)}
          </p>
          <p>
            <b>Balance Pending:</b>{" "}
            <span className="text-red-600 font-semibold">
              ₹{customer.pending_balance?.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Trips & Payments</h2>
        <div className="mb-3">
          <input
            className="border p-2 rounded w-full md:w-80"
            placeholder="Search by Invoice Number"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
          />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Invoice #</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">From</th>
                <th className="p-2 text-left">To</th>
                <th className="p-2 text-left">Distance</th>
                <th className="p-2 text-left">Total Charged</th>
                <th className="p-2 text-left">Received</th>
                <th className="p-2 text-left">Pending</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-3 text-center text-gray-500">
                    No trips yet
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2 font-semibold text-blue-600">
                      {t.invoice_number || "N/A"}
                    </td>
                    <td className="p-2">{formatDateDDMMYYYY(t.trip_date)}</td>
                    <td className="p-2">{t.from_location}</td>
                    <td className="p-2">{t.to_location}</td>
                    <td className="p-2">{t.distance_km} km</td>
                    <td className="p-2">
                      ₹{(t.total_charged ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2">
                      ₹{(t.amount_received ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-red-700">
                      ₹{(t.pending_amount ?? 0).toFixed(2)}
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
