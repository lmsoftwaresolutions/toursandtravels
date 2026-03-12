import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const normalizeVehicleNumber = (value) => String(value || "").trim().toLowerCase();

export default function VehicleDetails() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [fuelEntries, setFuelEntries] = useState([]);
  const [tripFuelEntries, setTripFuelEntries] = useState([]);
  const [spareEntries, setSpareEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);

  const loadVehicleData = useCallback(async () => {
    try {
      const targetVehicleNumber = normalizeVehicleNumber(vehicle_number);
      const [summaryRes, fuelRes, spareRes, maintenanceRes, tripsRes] = await Promise.all([
        api.get(`/vehicles/${vehicle_number}/summary`),
        api.get("/fuel"),
        api.get("/spare-parts"),
        api.get(`/mechanic/vehicle/${vehicle_number}`),
        api.get("/trips"),
      ]);

      setSummary(summaryRes.data);
      setFuelEntries((fuelRes.data || []).filter((entry) => normalizeVehicleNumber(entry.vehicle_number) === targetVehicleNumber));
      setTripFuelEntries(
        (tripsRes.data || []).filter((trip) => normalizeVehicleNumber(trip.vehicle_number) === targetVehicleNumber)
      );
      setSpareEntries((spareRes.data || []).filter((entry) => normalizeVehicleNumber(entry.vehicle_number) === targetVehicleNumber));
      setMaintenanceEntries(maintenanceRes.data || []);
    } catch {
      alert("Failed to load vehicle summary");
    }
  }, [vehicle_number]);

  useEffect(() => {
    const init = async () => {
      await loadVehicleData();
    };
    init();
  }, [loadVehicleData]);

  if (!summary) {
    return <LoadingSpinner fullScreen message="Loading vehicle details..." />;
  }

  const formatMoney = (value) => Number(value || 0).toFixed(2);
  const fuelLogEntries = [
    ...fuelEntries.map((entry) => ({ ...entry, source: "fuel_entry" })),
    ...tripFuelEntries
      .filter((trip) => Number(trip.diesel_used || 0) > 0 || Number(trip.petrol_used || 0) > 0)
      .map((trip) => ({
        id: `trip-${trip.id}`,
        source: "trip_usage",
        filled_date: trip.trip_date,
        fuel_type: Number(trip.diesel_used || 0) > 0 && Number(trip.petrol_used || 0) > 0
          ? "diesel + petrol"
          : Number(trip.diesel_used || 0) > 0
            ? "diesel"
            : "petrol",
        vendor: trip.vendor || "-",
        quantity: "-",
        rate_per_litre: null,
        total_cost: Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0),
        reference: trip.invoice_number || `Trip #${trip.id}`,
      })),
  ].sort((a, b) => new Date(b.filled_date) - new Date(a.filled_date));

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate("/vehicles")}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back to Vehicles
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{summary.vehicle_number}</h1>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">Active Asset</div>
          </div>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Vehicle summary and expense details</p>
        </div>

        <button
          onClick={() => navigate(`/vehicles/${vehicle_number}/edit`)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-black hover:scale-105 transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit Vehicle
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        {[
          { key: "overview", label: "Overview" },
          { key: "fuel", label: `Fuel Details (${fuelLogEntries.length})` },
          { key: "spares", label: `Spare Parts (${spareEntries.length})` },
          { key: "maintenance", label: `Mistry Details (${maintenanceEntries.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "Total Trips", value: summary.total_trips, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "blue", suffix: "Trips" },
                { label: "Odometer Total", value: Number(summary.total_km || 0).toLocaleString(), icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", color: "purple", suffix: "Kilometers" },
                { label: "Trip Income", value: `Rs. ${formatMoney(summary.trip_cost)}`, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "emerald", suffix: "Income" },
                { label: "Fuel Cost", value: `Rs. ${formatMoney(summary.total_fuel_cost)}`, icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", color: "orange", suffix: "Fuel" },
                { label: "Maintenance Cost", value: `Rs. ${formatMoney(summary.maintenance_cost)}`, icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", color: "rose", suffix: "Maintenance" },
                { label: "Total Cost", value: `Rs. ${formatMoney(summary.total_vehicle_cost)}`, icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", color: "indigo", suffix: "Total" },
              ].map((kpi, i) => (
                <div key={i} className="glass-card p-6 rounded-3xl group hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${kpi.color}-50 text-${kpi.color}-600 mb-4 ring-1 ring-${kpi.color}-100`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={kpi.icon} /></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">{kpi.value}</p>
                  <p className={`text-[9px] font-black uppercase tracking-tight text-${kpi.color}-500/80 mt-1`}>{kpi.suffix}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Quick Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Customers</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{summary.customers_served}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Total customers served</p>
                </div>
                <div className="border-l border-slate-100 pl-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Average Distance</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">
                    {summary.total_trips > 0 ? (summary.total_km / summary.total_trips).toFixed(0) : 0}
                    <span className="text-sm font-bold ml-1 text-slate-400">km/trip</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Average km per trip</p>
                </div>
                <div className="border-l border-slate-100 pl-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cost Per Km</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                    Rs. {summary.total_km > 0 ? (summary.total_vehicle_cost / summary.total_km).toFixed(2) : 0}
                    <span className="text-sm font-bold ml-1 text-emerald-400/60">/km</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Total cost divided by total km</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fuel" && (
          <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                Fuel Entries For This Vehicle
              </h3>
            </div>
            {fuelLogEntries.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No Fuel Entries Found</div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Fill Date</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Source</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Fuel Type</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vendor</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Litres</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Rate</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fuelLogEntries.map((entry) => (
                      <tr key={entry.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-6 text-sm font-black text-slate-500">{formatDateDDMMYYYY(entry.filled_date)}</td>
                        <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {entry.source === "trip_usage" ? entry.reference : "Fuel Entry"}
                        </td>
                        <td className="p-6 text-sm font-black text-slate-700 capitalize">{entry.fuel_type}</td>
                        <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.vendor || "-"}</td>
                        <td className="p-6 text-right font-black text-slate-700">
                          {entry.source === "trip_usage" ? "-" : Number(entry.quantity || 0).toFixed(2)}
                        </td>
                        <td className="p-6 text-right font-black text-slate-500">
                          {entry.source === "trip_usage" ? "-" : `Rs. ${formatMoney(entry.rate_per_litre)}`}
                        </td>
                        <td className="p-6 text-right font-black text-orange-600">Rs. {formatMoney(entry.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "spares" && (
          <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
                Spare Parts For This Vehicle
              </h3>
            </div>
            {spareEntries.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No Spare Parts Found</div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Installation Date</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Part</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vendor</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Quantity</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Unit Cost</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {spareEntries.map((sp) => (
                      <tr key={sp.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-6 text-sm font-black text-slate-500">{formatDateDDMMYYYY(sp.replaced_date)}</td>
                        <td className="p-6">
                          <div className="text-sm font-black text-slate-800 tracking-tight">{sp.part_name}</div>
                        </td>
                        <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{sp.vendor || "-"}</td>
                        <td className="p-6 text-right font-black text-slate-700">{Number(sp.quantity || 0)}</td>
                        <td className="p-6 text-right font-black text-slate-500">Rs. {formatMoney(sp.cost)}</td>
                        <td className="p-6 text-right font-black text-rose-600">Rs. {formatMoney(Number(sp.cost || 0) * Number(sp.quantity || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                Mistry Work For This Vehicle
              </h3>
            </div>
            {maintenanceEntries.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No Mistry Or Maintenance Records Found</div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Service Date</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Work Description</th>
                      <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vendor</th>
                      <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {maintenanceEntries.map((entry) => (
                      <tr key={entry.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-6 text-sm font-black text-slate-500">{formatDateDDMMYYYY(entry.service_date)}</td>
                        <td className="p-6 text-sm font-black text-slate-800 tracking-tight">{entry.work_description || "-"}</td>
                        <td className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.vendor || "-"}</td>
                        <td className="p-6 text-right font-black text-emerald-600">Rs. {formatMoney(entry.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
