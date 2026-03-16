import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.png";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";

export default function PaymentHistory() {
  const navigate = useNavigate();
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
            @page {
              size: A4;
              margin: 12mm;
            }

            body {
              font-family: "Segoe UI", Arial, sans-serif;
              padding: 0;
              margin: 0;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              background: #fff;
              max-width: 186mm;
              margin: 0 auto;
              padding: 0;
              border-radius: 0;
              box-shadow: none;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 18px;
              padding-bottom: 14px;
              border-bottom: 1px solid #cbd5e1;
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
              font-size: 20pt;
              font-weight: 700;
              letter-spacing: 0.04em;
            }
            .subtle {
              color: #6b7280;
              font-size: 9pt;
            }
            .section {
              margin-bottom: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
            }
            .label {
              font-size: 8.5pt;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .value {
              font-weight: 600;
              margin-top: 4px;
              font-size: 10.5pt;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            .summary .item {
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #dbe4ef;
            }
            .bg-blue { background: #eff6ff; }
            .bg-green { background: #ecfdf3; }
            .bg-red { background: #fef2f2; }
            .footer {
              border-top: 1px solid #cbd5e1;
              padding-top: 10px;
              margin-top: 20px;
              text-align: center;
              font-size: 9pt;
              color: #6b7280;
            }
            @media print {
              .card {
                max-width: 100%;
              }
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
                ${COMPANY_CONTACT ? `<div class="subtle">${COMPANY_CONTACT}</div>` : ""}
                ${COMPANY_EMAIL ? `<div class="subtle">Email: ${COMPANY_EMAIL}</div>` : ""}
              </div>
              <div>
                <div class="label">BILL TO</div>
                <div class="value">${customer?.name || "N/A"}</div>
                ${customer?.email ? `<div class="subtle">${customer.email}</div>` : ""}
                ${customer?.phone ? `<div class="subtle">${customer.phone}</div>` : ""}
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
                <div class="label">Total Charged</div>
                <div class="value">₹  ${(trip.total_charged || 0).toFixed(2)}</div>
              </div>
              <div class="item bg-green">
                <div class="label">Paid Now</div>
                <div class="value">₹  ${payment.amount.toFixed(2)}</div>
              </div>
              <div class="item bg-red">
                <div class="label">Pending Amount</div>
                <div class="value">Rs. ${(trip?.pending_amount || 0).toFixed(2)}</div>
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
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Payment History</h1>
          <p className="text-slate-500 font-medium mt-1">View all payments received and amounts still due</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Reports
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Payment
          </button>
        </div>
      </div>

      {/* ---------- SUMMARY CARDS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <KPI CardTitle="Total Chargeded" CardValue={`₹${totalCharges.toLocaleString()}`} CardNote="Total amount across filtered trips" Color="blue" />
        <KPI CardTitle="Total Received" CardValue={`₹${totalReceived.toLocaleString()}`} CardNote="Payments collected so far" Color="emerald" />
        <KPI CardTitle="Pending Amount" CardValue={`₹${totalPending.toLocaleString()}`} CardNote="Amount still pending" Color="rose" />
      </div>

      {/* ---------- FILTER & SEARCH ---------- */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-100/30 p-4 rounded-3xl border border-slate-100">
        <div className="relative group w-full md:w-80">
          <select
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ---------- MODAL ---------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Add Payment</h2>
              <p className="text-slate-500 font-medium text-sm">Enter the payment details for a trip</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Trip / Invoice</label>
                <div className="relative group">
                  <select
                    value={form.trip_id}
                    onChange={e => handleTripChange(e.target.value)}
                    required
                    className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">-- Select a Trip --</option>
                    {trips
                      .filter(t => (t.pending_amount || 0) > 0)
                      .map(trip => {
                        const customer = customers.find(c => c.id === trip.customer_id);
                        return (
                          <option key={trip.id} value={trip.id}>
                            {trip.invoice_number || "INV-" + trip.id} | {customer?.name} | Due: Rs. {trip.pending_amount}
                          </option>
                        );
                      })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {selectedTrip && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Total Charged</p>
                    <p className="font-black text-slate-800">₹{(selectedTrip.total_charged || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Pending Amount</p>
                    <p className="font-black text-rose-600 tracking-tight">₹{(selectedTrip.pending_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                  <input
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    name="amount"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={handleChange}
                    max={selectedTrip?.pending_amount || 0}
                    step="0.01"
                    required
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Date</label>
                  <input
                    type="date"
                    name="payment_date"
                    value={form.payment_date}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {["cash", "check", "online", "card", "other"].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, payment_mode: mode })}
                      className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.payment_mode === mode
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                        : "bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 h-14 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  Save Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-8 h-14 bg-white text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- PAYMENT LEDGER ---------- */}
      <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
        Payment List
      </h3>
      <div className="glass-card rounded-[2rem] overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 uppercase">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Invoice</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Customer</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Payment Mode</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Amount</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No payments recorded yet</td></tr>
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
                      <tr key={payment.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-6">
                          <div className="text-sm font-black text-blue-600 tracking-tighter">
                            {payment.invoice_number || trip?.invoice_number || `INV-${payment.trip_id}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-1">{formatDate(payment.payment_date)}</div>
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-black text-slate-700">{customer?.name || "N/A"}</div>
                        </td>
                        <td className="p-6">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                            {payment.payment_mode}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="text-base font-black text-emerald-600 tracking-tight">₹{payment.amount.toLocaleString()}</div>
                          <div className="text-[9px] text-rose-500 font-bold uppercase mt-1">Rs. {(trip?.pending_amount || 0).toLocaleString()} Pending</div>
                        </td>
                        <td className="p-6 text-right">
                          <button
                            onClick={() => handlePrint(payment, trip, customer)}
                            className="p-3 bg-white text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95"
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

      {/* ---------- MASTER TRIP LEDGER ---------- */}
      <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 pt-8">
        <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
        Trip Payment Summary
      </h3>
      <div className="glass-card rounded-[2rem] overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 uppercase">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Trip / Invoice</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Customer</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Total Charged</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Paid</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTrips.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No trips found</td></tr>
              ) : (
                filteredTrips.map(trip => {
                  const customer = customers.find(c => c.id === trip.customer_id);
                  return (
                    <tr key={trip.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-800">{trip.invoice_number || "INV-" + trip.id}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">{trip.from_location} → {trip.to_location}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-700">{customer?.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">{formatDateDDMMYYYY(trip.trip_date)}</div>
                      </td>
                      <td className="p-6 text-right text-sm font-bold text-slate-700">₹{(trip.total_charged || 0).toLocaleString()}</td>
                      <td className="p-6 text-right text-sm font-black text-emerald-600">₹{(trip.amount_received || 0).toLocaleString()}</td>
                      <td className="p-6 text-right">
                        <div className={`text-base font-black tracking-tighter ${trip.pending_amount > 0 ? "text-rose-600" : "text-emerald-500"}`}>
                          ₹{(trip.pending_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] font-black uppercase text-slate-400 mt-1">
                          {trip.pending_amount > 0 ? "Pending" : "Paid"}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ CardTitle, CardValue, CardNote, Color }) {
  const colorClass = Color === "emerald" ? "text-emerald-600" : Color === "rose" ? "text-rose-600" : "text-blue-600";
  const bgClass = Color === "emerald" ? "bg-emerald-50" : Color === "rose" ? "bg-rose-50" : "bg-blue-50";
  const borderClass = Color === "emerald" ? "border-emerald-100" : Color === "rose" ? "border-rose-100" : "border-blue-100";

  return (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{CardTitle}</p>
      <p className={`text-3xl font-black tracking-tighter ${colorClass}`}>{CardValue}</p>
      <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${bgClass} ${colorClass} ${borderClass}`}>
        {CardNote}
      </div>
    </div>
  );
}

