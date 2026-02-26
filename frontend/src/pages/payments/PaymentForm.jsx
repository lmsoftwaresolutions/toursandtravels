import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function PaymentForm() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [form, setForm] = useState({
    trip_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    amount: "",
    notes: ""
  });

  useEffect(() => {
    loadTrips();
    loadCustomers();
  }, []);

  const loadTrips = async () => {
  try {
    const res = await api.get("/trips");

    const pendingTrips = res.data.filter(t => {
      const totalCharged = Number(t.total_charged || 0);
      const received = Number(t.amount_received || 0);

      // Fallback if pending_amount is missing or stale
      const pending = Number(t.pending_amount ?? (totalCharged - received));

      return pending > 0;
    });

    setTrips(pendingTrips);
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

  const handleTripChange = (tripId) => {
    const trip = trips.find(t => t.id === Number(tripId));
    setSelectedTrip(trip);
    setForm({ ...form, trip_id: tripId });
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();

    if (!selectedTrip) {
      alert("Please select a trip");
      return;
    }

    if (Number(form.amount) > selectedTrip.pending_amount) {
      alert(
        `Amount cannot exceed pending amount (₹${selectedTrip.pending_amount.toFixed(2)})`
      );
      return;
    }

    try {
      // ✅ CORRECT FLOW: CREATE PAYMENT
      await api.post("/payments", {
        trip_id: Number(form.trip_id),
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: Number(form.amount),
        notes: form.notes || null
      });

      alert("Payment recorded successfully");
      navigate("/payments");
    } catch (error) {
      alert(
        "Error recording payment: " +
        (error.response?.data?.detail || error.message)
      );
    }
  };

  return (
    <div className="p-6 max-w-2xl bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Record Payment</h1>

      <form className="space-y-4" onSubmit={submit}>

        {/* SELECT TRIP */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Invoice (Trip):
          </label>
          <select
            value={form.trip_id}
            onChange={e => handleTripChange(e.target.value)}
            required
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select Invoice --</option>
            {trips.map(trip => {
              const customer = customers.find(
                c => c.id === trip.customer_id
              );
              return (
                <option key={trip.id} value={trip.id}>
                  {trip.invoice_number} — {customer?.name || "N/A"} — Pending ₹
                  {(trip.pending_amount || 0).toFixed(2)}
                </option>
              );
            })}
          </select>
        </div>

        {/* TRIP SUMMARY */}
        {selectedTrip && (
          <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
            <p>
              <b>Invoice Number:</b> {selectedTrip.invoice_number}
            </p>
            <p>
              <b>Trip Date:</b> {formatDateDDMMYYYY(selectedTrip.trip_date)}
            </p>
            <p>
              <b>Customer:</b>{" "}
              {customers.find(c => c.id === selectedTrip.customer_id)?.name || "N/A"}
            </p>
            <p>
              <b>Total Charged:</b> ₹ {(selectedTrip.total_charged || 0).toFixed(2)}
            </p>
            <p>
              <b>Already Received:</b> ₹ {(selectedTrip.amount_received || 0).toFixed(2)}
            </p>
            <p className="text-red-600">
              <b>Pending Amount:</b> ₹ {(selectedTrip.pending_amount || 0).toFixed(2)}
            </p>
          </div>
        )}

        {/* PAYMENT DATE */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Date:</label>
          <input
            type="date"
            name="payment_date"
            value={form.payment_date}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        {/* PAYMENT MODE */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Mode:</label>
          <select
            name="payment_mode"
            value={form.payment_mode}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* AMOUNT */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Amount:</label>
          <input
            name="amount"
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Enter payment amount"
            value={form.amount}
            onChange={handleChange}
            max={selectedTrip?.pending_amount || 0}
            step="0.01"
            required
            className="w-full border p-2 rounded"
          />
        </div>

        {/* NOTES */}
        <div>
          <label className="block text-sm font-medium mb-2">Notes (optional):</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows="2"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Record Payment
          </button>
          <button
            type="button"
            onClick={() => navigate("/payments")}
            className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}
