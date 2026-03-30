import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import BookingReceiptLayout from "../../components/print/BookingReceiptLayout";
import NathkrupaBus from "../../assets/nathkrupa-bus.png";

const getTripDuration = (start, end) => {
  if (!start || !end) return { text: "-", totalDays: null };
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { text: "-", totalDays: null };
  }
  if (endDate < startDate) return { text: "-", totalDays: null };
  const diffMs = endDate - startDate;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (mins || parts.length === 0) parts.push(`${mins} min${mins !== 1 ? "s" : ""}`);

  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const dayDiff = Math.floor((endDay - startDay) / 86400000);
  const totalDays = dayDiff + 1;
  return { text: parts.join(" "), totalDays };
};

const getBookingType = (bookingLabel) => {
  const label = String(bookingLabel || "").toLowerCase();
  if (label.includes("third")) return "Third Party";
  if (label.includes("self")) return "Self";
  return "Self";
};

const ReceiptField = ({ label, value, className = "" }) => (
  <div className={`flex items-baseline gap-2 mb-[6px] py-[2px] ${className}`}>
    <span className="whitespace-nowrap font-bold text-[12px] uppercase tracking-tight text-red-600">{label}</span>
    <span className="flex-grow border-b-[1.5px] border-gray-600 border-dashed text-left text-black font-bold px-2 inline-block min-h-[16px] leading-[16px] text-[13px] whitespace-pre-line">
      {value}
    </span>
  </div>
);

export default function BookingReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trip, setTrip] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [tripRes, customersRes, paymentsRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get("/customers"),
        api.get(`/payments/trip/${id}`),
      ]);
      setTrip(tripRes.data);
      setCustomer(customersRes.data.find((c) => c.id === tripRes.data.customer_id));
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error("Error loading booking receipt:", error);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshOnFocus = () => loadData();
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [loadData]);

  const bookingLabel = trip?.booking_id || trip?.invoice_number || `BKG-${id}`;
  const bookingType = getBookingType(bookingLabel);

  const { text: travelTime, totalDays } = getTripDuration(
    trip?.departure_datetime,
    trip?.return_datetime
  );

  const vehicleAssigned = Boolean(trip?.vehicle_number || (trip?.vehicles || []).length);
  const vehicleList = Array.isArray(trip?.vehicles) ? trip.vehicles : [];
  const vehicleNumberList = vehicleList
    .map((v) => v?.vehicle_number || v?.registration_number || v?.vehicle_name)
    .filter(Boolean);
  const vehicleNumber = "-";
  const vehicleType =
    trip?.bus_type ||
    vehicleList?.[0]?.bus_type ||
    vehicleList?.[0]?.vehicle_type ||
    (vehicleList?.[0]?.seat_count ? `${vehicleList[0].seat_count} Seat` : "-");

  const totalAdvance = useMemo(() => {
    const paymentSum = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return paymentSum || Number(trip?.advance_payment || 0);
  }, [payments, trip]);

  const paymentModeText = useMemo(() => {
    const modes = [...new Set(payments.map((p) => p.payment_mode).filter(Boolean))];
    if (!modes.length) return "-";
    return modes.join(", ");
  }, [payments]);

  const paymentNotes = useMemo(() => {
    const notes = payments.map((p) => p.notes).filter(Boolean);
    if (!notes.length) return "-";
    return notes.join(" | ");
  }, [payments]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    if (searchParams.get("print") === "true" && trip && customer) {
      setTimeout(() => handlePrint(), 150);
    }
  }, [searchParams, trip, customer]);

  if (!trip || !customer) {
    return <div className="p-4 md:p-6">Loading booking receipt...</div>;
  }

  const ReceiptContent = () => (
    <div className="receipt w-full overflow-hidden box-border p-2 sm:p-4 bg-white break-inside-avoid shadow-sm print:shadow-none mb-4">
      <BookingReceiptLayout>
        <div className="flex justify-between items-center mb-6 px-4">
          <div className="flex items-baseline gap-2">
            <span className="print-heading font-bold text-[14px] mr-1 uppercase text-red-600">Invoice No.</span>
            <span className="text-[22px] text-black font-normal font-serif leading-none tracking-wide">
              {trip.invoice_number || `INV-${String(trip.id).padStart(4, "0")}`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="print-heading font-bold text-[14px] uppercase text-red-600">Booking Date</span>
            <span className="font-normal font-serif text-black border-b-[1.5px] border-gray-600 border-dashed inline-block min-w-[100px] text-left px-1 leading-[16px] text-[14px]">
              {formatDateDDMMYYYY(trip.trip_date)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 flex-grow pr-4 pl-4 text-red-600">
          <ReceiptField label="Customer Name" value={customer?.name || "-"} className="col-span-2" />
          
          <ReceiptField label="Phone Number" value={trip.customer_phone || customer?.phone || "-"} />
          <ReceiptField label="Booking Type" value={bookingType} />
          
          <ReceiptField label="Customer Address" value={trip.customer_address || customer?.address || "-"} className="col-span-2" />
          
          <ReceiptField label="Pickup Location" value={trip.from_location || "-"} />
          <ReceiptField label="Drop Location" value={trip.to_location || "-"} />
          
          <ReceiptField label="Route / Notes" value={trip.route_details || trip.route_notes || trip.notes || "-"} className="col-span-2" />
          
          <ReceiptField label="Trip Start" value={trip.departure_datetime ? formatDateDDMMYYYY(trip.departure_datetime) : "-"} />
          <ReceiptField label="Trip End" value={trip.return_datetime ? formatDateDDMMYYYY(trip.return_datetime) : "-"} />
          
          <ReceiptField label="Vehicle Type" value={vehicleType} />
          <ReceiptField label="Vehicle Details" value={vehicleNumber} />
          
          <ReceiptField label="Travel Time" value={travelTime} />
          <ReceiptField label="Total Days" value={totalDays || "-"} />
          
          <ReceiptField label="Total Fare" value={trip.total_amount ? `₹${trip.total_amount}` : (trip.rate_per_km ? `₹${trip.rate_per_km} / km` : "-")} />
          <ReceiptField label="Advance Paid" value={`₹${Number(totalAdvance || 0).toFixed(2)}`} />
          
          <ReceiptField label="Payment Mode(s)" value={paymentModeText} />
          <ReceiptField label="Reference / Nts" value={paymentNotes} />
        </div>

        <div className="flex justify-between items-end mt-auto pt-8 px-4 pb-4 text-red-600">
          <div className="flex items-center justify-start h-[60px] w-[180px]">
            <img src={NathkrupaBus} alt="Bus Logo" className="h-[50px] object-contain opacity-80" />
          </div>
          <div className="flex flex-col items-center justify-end h-[60px] w-[180px]">
            <span className="text-[12px] font-bold uppercase drop-shadow-sm border-t-[1.5px] border-black border-dashed w-full text-center pt-1.5 text-black">Customer Signature</span>
          </div>
          <div className="flex flex-col items-center justify-end h-[60px] w-[180px]">
            <span className="text-[12px] font-bold uppercase drop-shadow-sm border-t-[1.5px] border-black border-dashed w-full text-center pt-1.5 text-black">Authorized Signatory</span>
          </div>
        </div>
      </BookingReceiptLayout>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 no-print print:hidden bg-slate-100/50 p-6 rounded-[2rem] border border-slate-100">
        <button
          onClick={() => navigate("/booking-receipts")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          Back to Booking Receipts
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print Booking Receipt
        </button>
      </div>

      <div className="booking-receipt-print-area bg-white print:p-0">
        <ReceiptContent />
      </div>
    </div>
  );
}
