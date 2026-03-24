import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Modal from "../../components/common/Modal";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function PaymentForm() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, type = "error", onConfirm = null) => 
    setModal({ isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const [form, setForm] = useState({
    trip_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    amount: "",
    notes: ""
  });

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips");
      const pendingTrips = res.data.filter((t) => {
        const totalCharged = Number(t.total_charged || 0);
        const received = Number(t.amount_received || 0);
        const pending = Number(t.pending_amount ?? Math.max(totalCharged - received, 0));
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

  useEffect(() => {
    const init = async () => {
      await loadTrips();
      await loadCustomers();
    };
    init();
  }, []);

  const handleTripChange = (tripId) => {
    const trip = trips.find((t) => t.id === Number(tripId));
    setSelectedTrip(trip);
    setForm({ ...form, trip_id: tripId });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedTrip) {
      showModal("Wait!", "Please select a trip first.");
      return;
    }
    const pending = Number(selectedTrip.pending_amount || 0);
    if (Number(form.amount) > pending) {
      showModal("Validation Error", `Amount cannot exceed pending amount (₹ ${pending.toFixed(2)})`);
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
      showModal("Success", "Payment recorded successfully!", "success", () => navigate("/payments"));
    } catch (error) {
      showModal("Error", "Failed to record payment. Please try again.");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Add Payment</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Record payment received for a trip</p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 2.1c-.5-.1-1-.1-1.5 0L3.1 4.5c-.7.2-1.2.9-1.2 1.6V21h17V6.1c0-.7-.5-1.4-1.2-1.6l-7.1-2.4zm5.2 16.9h-10v-2h10v2zm0-4h-10v-2h10v2zm0-4h-10v-2h10v2z"/></svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={submit}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Trip / Invoice</label>
              <select
                value={form.trip_id}
                onChange={(e) => handleTripChange(e.target.value)}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">-- Select Trip --</option>
                {trips.map((trip) => {
                  const customer = customers.find((c) => c.id === trip.customer_id);
                  return (
                    <option key={trip.id} value={trip.id}>
                      {trip.invoice_number} - {customer?.name || "N/A"} - Pending Rs. {(trip.pending_amount || 0).toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedTrip && (
              <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 backdrop-blur-sm space-y-3 animate-in fade-in zoom-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice</p>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{selectedTrip.invoice_number || `INV-${selectedTrip.id}`}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trip Date</p>
                    <p className="text-sm font-bold text-slate-600">{formatDateDDMMYYYY(selectedTrip.trip_date)}</p>
                  </div>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                    <p className="text-sm font-bold text-slate-600">{customers.find((c) => c.id === selectedTrip.customer_id)?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest underline decoration-2 underline-offset-4">Pending Amount</p>
                    <p className="text-xl font-black text-rose-600 tracking-tight">Rs. {(selectedTrip.pending_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  value={form.payment_date}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Mode</label>
                <select
                  name="payment_mode"
                  value={form.payment_mode}
                  onChange={handleChange}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">Rs.</span>
                  <input
                    name="amount"
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleChange}
                    max={selectedTrip?.pending_amount || 0}
                    step="0.01"
                    min="0"
                    required
                    className="w-full h-20 pl-14 pr-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-3xl font-black text-emerald-700 outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-emerald-200 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Add payment notes"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/payments")}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-16 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-emerald-900/20 active:scale-[0.98]"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
      {/* MODAL */}
      <Modal 
        isOpen={modal.isOpen} 
        onClose={modal.onConfirm ? modal.onConfirm : closeModal} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
    </div>
  );
}
