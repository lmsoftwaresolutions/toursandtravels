import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function PaymentForm() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    trip_id: "",
    amount: "",
    payment_date: ""
  });
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    loadTrips();
    loadCustomers();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips");
      // Filter trips with pending amount
      const pendingTrips = res.data.filter(t => (t.pending_amount || 0) > 0);
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
      alert(`Amount cannot exceed pending amount (₹${selectedTrip.pending_amount.toFixed(2)})`);
      return;
    }

    try {
      const updatedAmount = selectedTrip.amount_received + Number(form.amount);
      await api.put(`/trips/${form.trip_id}`, {
        ...selectedTrip,
        amount_received: updatedAmount
      });
      alert("Payment recorded successfully");
      navigate("/payments");
    } catch (error) {
      alert("Error recording payment: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="p-6 max-w-2xl bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Record Payment</h1>

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-2">Select Trip with Pending Payment:</label>
          <select
            value={form.trip_id}
            onChange={e => handleTripChange(e.target.value)}
            required
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select Trip --</option>
            {trips.map(trip => {
              const customer = customers.find(c => c.id === trip.customer_id);
              return (
                <option key={trip.id} value={trip.id}>
                  #{trip.id} - {customer?.name || "N/A"} - Pending: ₹{(trip.pending_amount || 0).toFixed(2)}
                </option>
              );
            })}
          </select>
        </div>

        {selectedTrip && (
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Trip Date</p>
                <p className="font-semibold">{selectedTrip.trip_date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold">{customers.find(c => c.id === selectedTrip.customer_id)?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Charged</p>
                <p className="font-semibold">₹ {(selectedTrip.total_charged || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Already Received</p>
                <p className="font-semibold">₹ {(selectedTrip.amount_received || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="font-semibold text-red-600">₹ {(selectedTrip.pending_amount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Payment Amount:</label>
          <input
            name="amount"
            type="number"
            placeholder="Enter payment amount"
            value={form.amount}
            onChange={handleChange}
            max={selectedTrip?.pending_amount || 0}
            step="0.01"
            required
            className="w-full border p-2 rounded"
          />
          {selectedTrip && (
            <p className="text-xs text-gray-500 mt-1">Max: ₹{(selectedTrip.pending_amount || 0).toFixed(2)}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Payment Date:</label>
          <input
            name="payment_date"
            type="date"
            value={form.payment_date}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

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
