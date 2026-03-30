import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function BookingReceiptList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadTrips();
    loadCustomers();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await api.get("/trips");
      setTrips(res.data || []);
    } catch (error) {
      console.error("Error loading trips:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Booking Receipts</h1>
          <p className="text-slate-500 font-medium mt-1">Preview and print booking confirmations</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row">
          <button
            onClick={() => navigate("/invoices")}
            className="px-6 py-3 bg-white text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Back to Invoices
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 uppercase">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Booking Label</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Customer</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Date</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black tracking-widest text-slate-400">Status</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trips.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No bookings found</td></tr>
              ) : (
                trips.map((trip) => {
                  const customer = customers.find(c => c.id === trip.customer_id);
                  const bookingLabel = trip.booking_id || trip.invoice_number || `BKG-${trip.id}`;
                  const status = trip.vehicle_number ? "Vehicle Assigned" : "Pending Vehicle";

                  return (
                    <tr key={trip.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-800">{bookingLabel}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Invoice: {trip.invoice_number || `INV-${trip.id}`}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-700">{customer?.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{customer?.phone || "No phone"}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-sm font-black text-slate-700">{formatDateDDMMYYYY(trip.trip_date)}</div>
                      </td>
                      <td className="p-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          status === "Pending Vehicle"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/booking-receipts/${trip.id}`)}
                            className="p-3 bg-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                          >
                            View Booking Receipt
                          </button>
                          <button
                            onClick={() => navigate(`/booking-receipts/${trip.id}?print=true`)}
                            className="p-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                          >
                            Print Booking Receipt
                          </button>
                          <button
                            onClick={() => navigate(`/trips/edit/${trip.id}`)}
                            className="p-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                          >
                            Edit Booking
                          </button>
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
