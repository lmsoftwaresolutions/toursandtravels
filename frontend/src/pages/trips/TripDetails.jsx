import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driversLookup, setDriversLookup] = useState({});
  const [vehiclesLookup, setVehiclesLookup] = useState({});
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canWrite = !authService.hasLimitedAccess();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);

        const [paymentsRes, expensesRes, vehiclesRes, driversRes] = await Promise.all([
          api.get(`/payments/trip/${id}`).catch(() => ({ data: [] })),
          api.get(`/driver-expenses/trip/${id}`).catch(() => ({ data: [] })),
          api.get("/vehicles").catch(() => ({ data: [] })),
          api.get("/drivers").catch(() => ({ data: [] })),
        ]);

        setPayments(paymentsRes.data || []);
        setDriverExpenses(expensesRes.data || []);

        const nextVehiclesLookup = {};
        (vehiclesRes.data || []).forEach((vehicle) => {
          if (vehicle?.vehicle_number) {
            nextVehiclesLookup[String(vehicle.vehicle_number)] = vehicle;
          }
        });
        setVehiclesLookup(nextVehiclesLookup);

        const nextDriversLookup = {};
        (driversRes.data || []).forEach((driver) => {
          if (driver?.id != null) {
            nextDriversLookup[String(driver.id)] = driver;
          }
        });
        setDriversLookup(nextDriversLookup);

        if (res.data.customer_id) {
          api.get(`/customers/${res.data.customer_id}`)
            .then((r) => setCustomerName(r.data.name))
            .catch(() => {});
        }

        if (res.data.driver_id) {
          const matchedDriver = nextDriversLookup[String(res.data.driver_id)];
          if (matchedDriver?.name) {
            setDriverName(matchedDriver.name);
          } else {
            api.get(`/drivers/${res.data.driver_id}`)
              .then((r) => setDriverName(r.data.name || r.data.id))
              .catch(() => {});
          }
        }
      } catch (e) {
        setError("Unable to load trip");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const tripVehicles = useMemo(() => {
    if (!trip) return [];

    if (Array.isArray(trip.vehicles) && trip.vehicles.length) {
      return trip.vehicles.map((entry, index) => {
        const vehicleMeta = vehiclesLookup[entry.vehicle_number || ""] || {};
        const driverMeta = driversLookup[String(entry.driver_id || "")] || {};
        const pricingType = entry.pricing_type || trip.pricing_type || "per_km";

        return {
          key: entry.id || `${entry.vehicle_number || "vehicle"}-${index}`,
          vehicleNumber: entry.vehicle_number || "---",
          vehicleType: entry.bus_type || entry.vehicle_type || vehicleMeta.vehicle_type || "---",
          seatCount: entry.seat_count ?? vehicleMeta.seat_count ?? null,
          driverName: entry.driver?.name || driverMeta.name || (entry.driver_id ? `Driver #${entry.driver_id}` : "---"),
          startKm: entry.start_km,
          endKm: entry.end_km,
          distanceKm: entry.distance_km,
          pricingType,
          rateValue:
            pricingType === "package"
              ? Number(entry.package_amount ?? trip.package_amount ?? 0)
              : Number(entry.cost_per_km ?? trip.cost_per_km ?? 0),
          fuelVendor: entry.fuel_vendor || trip.vendor || "In-House",
          fuelCost: Number(entry.fuel_cost || 0),
          tollAmount: Number(entry.toll_amount || 0),
          parkingAmount: Number(entry.parking_amount || 0),
          otherExpenses: Number(entry.other_expenses || 0),
        };
      });
    }

    const vehicleMeta = vehiclesLookup[trip.vehicle_number || ""] || {};
    return [
      {
        key: "primary-vehicle",
        vehicleNumber: trip.vehicle_number || "---",
        vehicleType: trip.bus_type || trip.bus_detail || vehicleMeta.vehicle_type || "---",
        seatCount: vehicleMeta.seat_count ?? null,
        driverName: driverName || "---",
        startKm: trip.start_km,
        endKm: trip.end_km,
        distanceKm: trip.distance_km,
        pricingType: trip.pricing_type || "per_km",
        rateValue: trip.pricing_type === "package" ? Number(trip.package_amount || 0) : Number(trip.cost_per_km || 0),
        fuelVendor: trip.vendor || "In-House",
        fuelCost: Number((trip.diesel_used || 0) + (trip.petrol_used || 0)),
        tollAmount: Number(trip.toll_amount || 0),
        parkingAmount: Number(trip.parking_amount || 0),
        otherExpenses: Number(trip.other_expenses || 0),
      },
    ].filter((entry) => entry.vehicleNumber !== "---");
  }, [trip, vehiclesLookup, driversLookup, driverName]);

  const vehicleSummaryLabel = tripVehicles.length
    ? tripVehicles.map((entry) => entry.vehicleNumber).join(", ")
    : (trip?.vehicle_number || "---");

  if (loading) return <div className="p-6">Loading trip...</div>;
  if (error || !trip) return <div className="p-6 text-red-600">{error || "Trip not found"}</div>;

  const totalCharged = trip.total_charged ?? 0;
  const pending = trip.pending_amount ?? 0;
  const received = trip.amount_received ?? 0;
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pricingLabel = trip.pricing_type === "package" ? "Package" : "Per KM";
  const extraReceived = Math.max(Number(received || 0) - Number(totalCharged || 0), 0);
  const fuelTotal = (trip.vehicles || []).reduce((sum, v) => sum + Number(v.fuel_cost || 0), 0);
  const fuelVendors = Array.from(new Set((trip.vehicles || []).map((v) => v.fuel_vendor).filter(Boolean)));
  const fuelVendorLabel = fuelVendors.length ? fuelVendors.join(", ") : (trip.vendor || "In-House");

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Trip {trip.invoice_number || trip.id}</h1>
            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${pending === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
              {pending === 0 ? "Settled" : "Outstanding"}
            </div>
          </div>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Digital Dispatch Manifest • Trip ID: {trip.id}</p>
        </div>

        <div className="flex gap-3">
          {canWrite ? (
            <button
              onClick={() => navigate(`/trips/edit/${trip.id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Edit Trip
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            Trip Info
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <RowItem label="Trip Date" value={formatDateDDMMYYYY(trip.trip_date)} />
            <RowItem label="Vehicle" value={vehicleSummaryLabel} />
            <RowItem label="Trip Start" value={trip.departure_datetime ? formatDateDDMMYYYY(trip.departure_datetime) : "---"} />
            <RowItem label="Trip End" value={trip.return_datetime ? formatDateDDMMYYYY(trip.return_datetime) : "---"} />
            <div className="col-span-2 flex items-center gap-4 py-4 px-6 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">From</p>
                <p className="text-sm font-black text-slate-700">{trip.from_location}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-px bg-slate-200 relative">
                  <div className="absolute -top-1 right-0 w-2 h-2 border-t border-r border-slate-400 rotate-45" />
                </div>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">To</p>
                <p className="text-sm font-black text-slate-700">{trip.to_location}</p>
              </div>
            </div>
            <RowItem label="Driver" value={driverName || "N/A"} />
            <RowItem label="Customer" value={customerName || "N/A"} />
            <RowItem label="Distance" value={trip.distance_km != null ? `${trip.distance_km} km` : "---"} highlight />
            <RowItem label="Fuel Vendor" value={fuelVendorLabel} />
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
            Billing Summary
          </h2>
          <div className="grid grid-cols-2 gap-6 pb-8 border-b border-slate-100">
            <RowItem label="Pricing Type" value={pricingLabel} />
            <RowItem label="Rate per KM" value={`Rs. ${trip.cost_per_km}/KM`} />
            <RowItem label="Customer Toll" value={`Rs. ${trip.charged_toll_amount}`} />
            <RowItem label="Customer Parking" value={`Rs. ${trip.charged_parking_amount}`} />
          </div>
          <div className="pt-8 space-y-4">
            <div className="flex justify-between items-center group/row">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Charged</span>
              <span className="text-3xl font-black text-slate-800 tracking-tighter group-hover:scale-105 transition-transform">Rs. {totalCharged.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Received</span>
              <span className="text-lg font-black text-emerald-600 tracking-tight">Rs. {received.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between items-center p-4 rounded-2xl ${pending > 0 ? "bg-rose-50 ring-1 ring-rose-100" : "bg-emerald-50 ring-1 ring-emerald-100"} transition-colors`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${pending > 0 ? "text-rose-500" : "text-emerald-500"}`}>Pending</span>
              <span className={`text-xl font-black tracking-tighter ${pending > 0 ? "text-rose-600" : "text-emerald-600"}`}>Rs. {pending.toLocaleString()}</span>
            </div>
            {extraReceived > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Extra Received</span>
                <span className="text-lg font-black text-amber-600 tracking-tight">Rs. {extraReceived.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          Vehicle Details
        </h2>
        {tripVehicles.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            No vehicle details found
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {tripVehicles.map((entry, index) => (
              <div key={entry.key} className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle {index + 1}</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">{entry.vehicleNumber}</h3>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      {[entry.vehicleType, entry.seatCount ? `${entry.seatCount} Seat` : ""].filter(Boolean).join(" • ") || "---"}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    {entry.pricingType === "package" ? "Package" : "Per KM"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RowItem label="Driver" value={entry.driverName} />
                  <RowItem
                    label={entry.pricingType === "package" ? "Package Amount" : "Rate per KM"}
                    value={`Rs. ${Number(entry.rateValue || 0).toLocaleString()}`}
                  />
                  <RowItem label="Start KM" value={entry.startKm ?? "---"} />
                  <RowItem label="End KM" value={entry.endKm ?? "---"} />
                  <RowItem label="Distance" value={entry.distanceKm != null ? `${entry.distanceKm} km` : "---"} highlight />
                  <RowItem label="Fuel Vendor" value={entry.fuelVendor} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <CostChip label="Fuel" value={entry.fuelCost} color="orange" />
                  <CostChip label="Toll" value={entry.tollAmount} color="slate" />
                  <CostChip label="Parking" value={entry.parkingAmount} color="emerald" />
                  <CostChip label="Other" value={entry.otherExpenses} color="rose" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
            Payment History
          </h2>
          {payments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No payments found</div>
          ) : (
            <div className="space-y-4">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.payment_mode}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{formatDateDDMMYYYY(p.payment_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-emerald-600 tracking-tighter">Rs. {Number(p.amount).toLocaleString()}</p>
                    {p.notes && <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">{p.notes}</p>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-6 px-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Payments</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tighter">Rs. {totalPayments.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
            Trip Expenses
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <CostChip label="Fuel" value={fuelTotal} color="orange" />
            <CostChip label="Toll" value={trip.toll_amount} color="slate" />
            <CostChip label="Parking" value={trip.parking_amount} color="slate" />
            <CostChip label="Other Expenses" value={trip.other_expenses} color="rose" />
            <CostChip label="Driver Allowance" value={trip.driver_bhatta} color="blue" />
            <div className="col-span-2 mt-4 p-6 bg-slate-900 rounded-[2rem] flex justify-between items-center group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Trip Expenses</p>
                <p className="text-2xl font-black text-white tracking-tighter">Rs. {Number(trip.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center relative z-10">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowItem({ label, value, highlight }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-base font-black ${highlight ? "text-blue-600" : "text-slate-800"} tracking-tight`}>{value || "---"}</p>
    </div>
  );
}

function CostChip({ label, value, color }) {
  const colorClasses = {
    orange: "bg-orange-50/50 border-orange-100",
    slate: "bg-slate-50/50 border-slate-100",
    emerald: "bg-emerald-50/50 border-emerald-100",
    rose: "bg-rose-50/50 border-rose-100",
    blue: "bg-blue-50/50 border-blue-100",
  };

  return (
    <div className={`p-4 rounded-2xl border flex flex-col ${colorClasses[color] || colorClasses.slate}`}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <span className="text-sm font-black text-slate-800 tracking-tighter">Rs. {Number(value || 0).toLocaleString()}</span>
    </div>
  );
}
