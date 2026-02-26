import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_NAME } from "../../constants/company";

export default function PaymentHistory() {
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    trip_id: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: "cash",
    amount: "",
    notes: ""
  });
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripsRes, customersRes, paymentsRes] = await Promise.all([
        api.get("/trips"),
        api.get("/customers"),
        api.get("/payments")
      ]);
      setTrips(tripsRes.data);
      setCustomers(customersRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
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

  const handleSubmit = async e => {
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
      await api.post("/payments", {
        trip_id: Number(form.trip_id),
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: Number(form.amount),
        notes: form.notes || null
      });
      alert("Payment recorded successfully");
      setShowAddModal(false);
      setForm({
        trip_id: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: "cash",
        amount: "",
        notes: ""
      });
      setSelectedTrip(null);
      loadData();
    } catch (error) {
      alert("Error recording payment: " + (error.response?.data?.detail || error.message));
    }
  };
  const formatDate = (dateStr) => formatDateDDMMYYYY(dateStr);


  const handlePrint = (payment, trip, customer) => {
    if (!payment || !trip) return;

    const invoiceLabel =
      trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`;

    const printWindow = window.open("", "_blank", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt ${invoiceLabel}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
              background: #f3f4f6;
            }
            .card {
              background: #fff;
              max-width: 860px;
              margin: 0 auto;
              padding: 28px;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              height: 42px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
            }
            .subtle {
              color: #6b7280;
              font-size: 12px;
            }
            .section {
              margin-bottom: 18px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 14px;
            }
            .label {
              font-size: 12px;
              color: #6b7280;
            }
            .value {
              font-weight: 600;
              margin-top: 4px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            .summary .item {
              padding: 12px;
              border-radius: 8px;
            }
            .bg-blue { background: #eff6ff; }
            .bg-green { background: #ecfdf3; }
            .bg-red { background: #fef2f2; }
            .footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>

        <body>
          <div class="card">
            <div class="header">
              <div class="brand">
                <img src="${NathkrupaLogo}" class="logo" alt="Nathkrupa Logo" />
                <div>
                  <div class="title">PAYMENT RECEIPT</div>
                  <div class="subtle">Invoice Number: ${invoiceLabel}</div>
                </div>
              </div>
              <div style="text-align:right">
                <div class="subtle">Payment Date</div>
                <div class="value">${formatDate(payment.payment_date)}</div>
              </div>
            </div>

            <div class="section grid">
              <div>
                <div class="label">FROM</div>
                <div class="value">${COMPANY_NAME}</div>
                <div class="subtle">${COMPANY_ADDRESS}</div>
                <div class="subtle">${COMPANY_CONTACT}</div>
              </div>
              <div>
                <div class="label">BILL TO</div>
                <div class="value">${customer?.name || "N/A"}</div>
                <div class="subtle">${customer?.email || ""}</div>
                <div class="subtle">${customer?.phone || ""}</div>
              </div>
            </div>

            <div class="section box">
              <div class="grid">
                <div>
                  <div class="label">Route</div>
                  <div class="value">${trip.from_location} →  ${trip.to_location}</div>
                </div>
                <div>
                  <div class="label">Vehicle</div>
                  <div class="value">${trip.vehicle_number}</div>
                </div>
                <div>
                  <div class="label">Trip Date</div>
                  <div class="value">${formatDate(trip.trip_date)}</div>
                </div>
                <div>
                  <div class="label">Payment Mode</div>
                  <div class="value">${payment.payment_mode}</div>
                </div>
              </div>
            </div>

            <div class="section summary">
              <div class="item bg-blue">
                <div class="label">Amount Charged</div>
                <div class="value">₹  ${(trip.total_charged || 0).toFixed(2)}</div>
              </div>
              <div class="item bg-green">
                <div class="label">Amount Paid (This Receipt)</div>
                <div class="value">₹  ${payment.amount.toFixed(2)}</div>
              </div>
              <div class="item bg-red">
                <div class="label">Remaining Balance</div>
                <div class="value">₹  ${(trip?.pending_amount || 0).toFixed(2)}</div>
              </div>
            </div>

            ${payment.notes ? `
              <div class="section">
                <div class="label">Notes</div>
                <div class="value">${payment.notes}</div>
              </div>
            ` : ""}

            <div class="footer">
              Thank you for your business! This is a computer-generated document.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };


  const filteredTrips = filterCustomer
    ? trips.filter(t => t.customer_id === Number(filterCustomer))
    : trips;

  const totalCharges = filteredTrips.reduce((sum, t) => sum + (t.total_charged || 0), 0);
  const totalReceived = filteredTrips.reduce((sum, t) => sum + (t.amount_received || 0), 0);
  const totalPending = filteredTrips.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add Payment
        </button>
      </div>

      {/* ADD PAYMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Select Invoice:</label>

                <select
                  value={form.trip_id}
                  onChange={e => handleTripChange(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                >
                  <option value="">-- Select Invoice --</option>
                  {trips
                    .filter(t => (t.pending_amount || 0) > 0)
                    .map(trip => {
                      const customer = customers.find(c => c.id === trip.customer_id);
                      return (
                        <option key={trip.id} value={trip.id}>
                          {trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`} - {customer?.name || "N/A"} - Pending: ₹{(trip.pending_amount || 0).toFixed(2)}
                        </option>
                      );
                    })}
                </select>
              </div>

              {selectedTrip && (
                <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Charged:</span>
                    <span className="font-semibold">₹ {(selectedTrip.total_charged || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Already Received:</span>
                    <span className="font-semibold">₹ {(selectedTrip.amount_received || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <span className="font-semibold text-red-600">₹ {(selectedTrip.pending_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <input
                type="date"
                name="payment_date"
                value={form.payment_date}
                onChange={handleChange}
                className="w-full border p-2 rounded text-sm"
                required
              />

              <select
                name="payment_mode"
                value={form.payment_mode}
                onChange={handleChange}
                className="w-full border p-2 rounded text-sm"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="online">Online Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>

              <input
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                name="amount"
                placeholder="Payment Amount"
                value={form.amount}
                onChange={handleChange}
                max={selectedTrip?.pending_amount || 0}
                step="0.01"
                required
                className="w-full border p-2 rounded text-sm"
              />
              {selectedTrip && (
                <p className="text-xs text-gray-500">Max: ₹{(selectedTrip.pending_amount || 0).toFixed(2)}</p>
              )}

              <textarea
                name="notes"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={handleChange}
                className="w-full border p-2 rounded text-sm"
                rows="2"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm font-medium"
                >
                  Save Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTrip(null);
                    setForm({
                      trip_id: "",
                      payment_date: new Date().toISOString().split('T')[0],
                      payment_mode: "cash",
                      amount: "",
                      notes: ""
                    });
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Charged</p>
          <p className="text-2xl font-bold">₹ {totalCharges.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Received</p>
          <p className="text-2xl font-bold text-green-600">₹ {totalReceived.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Pending</p>
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

      {/* PAYMENT RECORDS TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Invoice Number </th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Payment Date</th>
              <th className="p-2 text-left">Mode</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Remaining</th>
              <th className="p-2 text-left">Action</th>

            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No payment records found
                </td>
              </tr>
            ) : (
              payments
                .filter(p => {
                  const trip = trips.find(t => t.id === p.trip_id);
                  if (!trip) return false;
                  if (filterCustomer && trip.customer_id !== Number(filterCustomer)) return false;
                  return true;
                })
                .map(payment => {
                  const trip = trips.find(t => t.id === payment.trip_id);
                  const customer = customers.find(c => c.id === trip?.customer_id);
                  return (
                    <tr key={payment.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-semibold">{payment.invoice_number || trip?.invoice_number || `INV-${String(trip?.id || payment.trip_id).padStart(4, "0")}`}</td>
                      <td className="p-2">{customer?.name || "N/A"}</td>
                      <td className="p-2">{formatDate(payment.payment_date)}</td>
                      <td className="p-2 capitalize">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {payment.payment_mode}
                        </span>
                      </td>
                      <td className="p-2 font-semibold text-green-600">₹ {payment.amount.toFixed(2)}</td>
                      <td className="p-2 text-red-600">
                        ₹ {(trip?.pending_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => handlePrint(payment, trip, customer)}
                          className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black"
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

      {/* TRIPS TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Invoice Number</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Route</th>
              <th className="p-2 text-left">Charged</th>
              <th className="p-2 text-left">Received</th>
              <th className="p-2 text-left">Pending</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No trip records found
                </td>
              </tr>
            ) : (
              filteredTrips.map(trip => {
                const customer = customers.find(c => c.id === trip.customer_id);
                return (
                  <tr key={trip.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}</td>
                    <td className="p-2">{customer?.name || "N/A"}</td>
                    <td className="p-2">{formatDateDDMMYYYY(trip.trip_date)}</td>
                    <td className="p-2 text-sm">{trip.from_location} → {trip.to_location}</td>
                    <td className="p-2">₹ {(trip.total_charged || 0).toFixed(2)}</td>
                    <td className="p-2 text-green-600">₹ {(trip.amount_received || 0).toFixed(2)}</td>
                    <td className="p-2 font-semibold" style={{ color: trip.pending_amount > 0 ? "#dc2626" : "#16a34a" }}>
                      ₹ {(trip.pending_amount || 0).toFixed(2)}
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
