import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { authService } from "../../services/auth";

const normalizeVehicleNumber = (value) => String(value || "").trim().toLowerCase();

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["active", "paid", "renewed"].includes(normalized)) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (["expired", "overdue", "danger", "inactive"].includes(normalized)) return "bg-rose-50 text-rose-700 border-rose-100";
  if (["expiring_soon", "pending", "warning", "missing"].includes(normalized)) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export default function VehicleDetails() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();
  const canWrite = !authService.hasLimitedAccess();

  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [fuelEntries, setFuelEntries] = useState([]);
  const [tripFuelEntries, setTripFuelEntries] = useState([]);
  const [spareEntries, setSpareEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [oilEntries, setOilEntries] = useState([]);

  const loadVehicleData = useCallback(async () => {
    try {
      const targetVehicleNumber = normalizeVehicleNumber(vehicle_number);
      const [summaryRes, fuelRes, spareRes, maintenanceRes, tripsRes, oilRes] = await Promise.all([
        api.get(`/vehicles/${vehicle_number}/summary`),
        api.get("/fuel"),
        api.get("/spare-parts"),
        api.get(`/mechanic/vehicle/${vehicle_number}`),
        api.get("/trips"),
        api.get("/oil-bills"),
      ]);

      const summaryData = summaryRes.data;
      setSummary(summaryData);

      setFuelEntries((fuelRes.data || []).filter((entry) => normalizeVehicleNumber(entry.vehicle_number) === targetVehicleNumber));
      setTripFuelEntries(
        (tripsRes.data || []).filter((trip) => {
          const directMatch = normalizeVehicleNumber(trip.vehicle_number) === targetVehicleNumber;
          if (directMatch) return true;
          const tripVehicles = Array.isArray(trip.vehicles) ? trip.vehicles : [];
          return tripVehicles.some((v) => normalizeVehicleNumber(v.vehicle_number) === targetVehicleNumber);
        })
      );
      setSpareEntries((spareRes.data || []).filter((entry) => normalizeVehicleNumber(entry.vehicle_number) === targetVehicleNumber));
      setMaintenanceEntries(maintenanceRes.data || []);
      setOilEntries(
        (oilRes.data || []).flatMap((bill) =>
          (bill.entries || [])
            .filter((entry) => normalizeVehicleNumber(entry.vehicle_number) === targetVehicleNumber)
            .map((entry) => ({
              ...entry,
              bill_date: bill.bill_date,
              bill_number: bill.bill_number,
              vendor_name: bill.vendor_name,
            }))
        )
      );
    } catch {
      alert("Failed to load vehicle summary");
    }
  }, [vehicle_number]);

  useEffect(() => {
    loadVehicleData();
  }, [loadVehicleData]);

  const fuelLogEntries = useMemo(() => {
    const targetVehicleNumber = normalizeVehicleNumber(vehicle_number);
    return [
      ...fuelEntries.map((entry) => ({ ...entry, source: "fuel_entry" })),
      ...tripFuelEntries
        .filter((trip) => {
          const hasTripFuel = Number(trip.diesel_used || 0) > 0 || Number(trip.petrol_used || 0) > 0 || Number(trip.fuel_litres || 0) > 0;
          if (hasTripFuel) return true;
          const matchingVehicle = (trip.vehicles || []).find((v) => normalizeVehicleNumber(v.vehicle_number) === targetVehicleNumber);
          return Boolean(
            matchingVehicle &&
              (Number(matchingVehicle.fuel_cost || 0) > 0 || Number(matchingVehicle.fuel_litres || 0) > 0 || Number(matchingVehicle.diesel_used || 0) > 0 || Number(matchingVehicle.petrol_used || 0) > 0)
          );
        })
        .map((trip) => {
          const matchingVehicle = (trip.vehicles || []).find((v) => normalizeVehicleNumber(v.vehicle_number) === targetVehicleNumber);
          const vehicleFuelVendor = matchingVehicle?.fuel_vendor || null;
          const vehicleDiesel = Number(matchingVehicle?.diesel_used || 0);
          const vehiclePetrol = Number(matchingVehicle?.petrol_used || 0);
          const vehicleLitres = Number(matchingVehicle?.fuel_litres || 0);
          const vehicleFuelCost = Number(matchingVehicle?.fuel_cost || 0);
          const vehicleFuelPrice = Number(matchingVehicle?.fuel_price || 0);
          const tripFuelLitres = Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0);
          const hasSingleVehicle = Number(trip.number_of_vehicles || 1) === 1;
          const litresFromVehicleUsage = vehicleDiesel + vehiclePetrol;
          const litresFromCostAndRate = vehicleFuelPrice > 0 && vehicleFuelCost > 0 ? vehicleFuelCost / vehicleFuelPrice : 0;
          const effectiveLitres = vehicleLitres > 0 ? vehicleLitres : litresFromVehicleUsage > 0 ? litresFromVehicleUsage : litresFromCostAndRate > 0 ? litresFromCostAndRate : hasSingleVehicle ? tripFuelLitres : 0;
          const tripFuelCost = Number(trip.diesel_used || 0) + Number(trip.petrol_used || 0);
          const computedRate = effectiveLitres > 0 ? vehicleFuelCost / effectiveLitres : vehicleFuelPrice;
          return {
            id: `trip-${trip.id}`,
            source: "trip_usage",
            filled_date: trip.trip_date,
            fuel_type: vehicleDiesel > 0 ? "diesel" : "petrol",
            vendor: vehicleFuelVendor || trip.vendor || "-",
            quantity: effectiveLitres > 0 ? effectiveLitres : "-",
            rate_per_litre: Number.isFinite(computedRate) ? Number(computedRate.toFixed(2)) : null,
            total_cost: matchingVehicle ? vehicleFuelCost || (hasSingleVehicle ? tripFuelCost : 0) : tripFuelCost,
            reference: trip.invoice_number || `Trip #${trip.id}`,
          };
        }),
    ].sort((a, b) => new Date(b.filled_date) - new Date(a.filled_date));
  }, [fuelEntries, tripFuelEntries, vehicle_number]);

  if (!summary) {
    return <LoadingSpinner fullScreen message="Loading vehicle details..." />;
  }

  const financial = summary.financial_details || {};
  const performance = summary.trip_performance || {};
  const fuel = summary.fuel_management || {};
  const maintenance = summary.maintenance_section || {};
  const driver = summary.driver_details || {};
  const smart = summary.smart_dashboard || {};
  const alerts = summary.alerts_section || [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button onClick={() => navigate("/vehicles")} className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back to Vehicles
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{summary.vehicle_number}</h1>
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusClass(smart.vehicle_active_status || "active")}`}>{smart.vehicle_active_status || "active"}</span>
          </div>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Vehicle summary and expense details</p>
        </div>

        {canWrite ? (
          <button
            onClick={() => navigate(`/vehicles/${vehicle_number}/edit`)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:bg-black hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Vehicle
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        {[
          { key: "overview", label: "Overview" },
          { key: "fuel", label: `Fuel Details (${fuelLogEntries.length})` },
          { key: "spares", label: `Spare Parts (${spareEntries.length})` },
          { key: "maintenance", label: `Mistry Details (${maintenanceEntries.length + oilEntries.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "overview" ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Health Score" value={`${smart.vehicle_health_score || 0}/100`} tone="blue" />
              <KpiCard title="Running Cost / KM" value={formatMoney(smart.running_cost_per_km || 0)} tone="rose" />
              <KpiCard title="Profit / Loss" value={formatMoney(financial.total_profit_loss || 0)} tone={(financial.total_profit_loss || 0) >= 0 ? "green" : "red"} />
              <KpiCard title="ROI" value={`${Number(smart.roi || 0).toFixed(2)}%`} tone="amber" />
            </div>

            <DetailGrid
              title="Financial Details"
              rows={[
                ["Monthly Fixed Cost", formatMoney(financial.monthly_fixed_cost || 0)],
                ["Outstanding Payments", formatMoney(financial.outstanding_payments || 0)],
                ["EMI (Monthly)", formatMoney(financial?.emi_details?.monthly_emi || 0)],
                ["Insurance Status", financial?.insurance_status?.status || "-"],
                ["Tax Status", financial?.tax_expiry?.status || "-"],
              ]}
            />

            <DetailGrid
              title="Trip Performance"
              rows={[
                ["Completed Trips", performance.total_completed_trips || 0],
                ["Upcoming Trips", performance.upcoming_trips || 0],
                ["Cancelled Trips", performance.cancelled_trips || 0],
                ["Most Frequent Route", performance.most_frequent_route || "-"],
                ["Highest Revenue Trip", performance.highest_revenue_trip ? `${performance.highest_revenue_trip.invoice_number} (${formatMoney(performance.highest_revenue_trip.revenue)})` : "-"],
                ["Lowest Revenue Trip", performance.lowest_revenue_trip ? `${performance.lowest_revenue_trip.invoice_number} (${formatMoney(performance.lowest_revenue_trip.revenue)})` : "-"],
                ["Average Revenue / Trip", formatMoney(performance.average_revenue_per_trip || 0)],
                ["Outstanding Payments", formatMoney(financial.outstanding_payments || 0)],
              ]}
            />

            <DetailGrid
              title="Fuel Management"
              rows={[
                ["Average Mileage", `${Number(fuel.average_mileage || 0).toFixed(2)} km/l`],
                ["Fuel Efficiency", `${Number(fuel.fuel_efficiency_km_per_l || 0).toFixed(2)} km/l`],
                ["Last Fuel Entry", fuel.last_fuel_entry?.filled_date ? `${formatDateDDMMYYYY(fuel.last_fuel_entry.filled_date)} | ${formatMoney(fuel.last_fuel_entry.total_cost)}` : "-"],
                ["Trip Fuel Cost", formatMoney(fuel.fuel_expense_comparison?.trip_fuel_cost || 0)],
                ["Direct Fuel Cost", formatMoney(fuel.fuel_expense_comparison?.direct_fuel_cost || 0)],
                ["Total Fuel Cost", formatMoney(fuel.fuel_expense_comparison?.total_fuel_cost || 0)],
              ]}
            />

            <DetailGrid
              title="Maintenance Insights"
              rows={[
                ["Last Service Date", maintenance.last_service_date ? formatDateDDMMYYYY(maintenance.last_service_date) : "-"],
                ["Next Service Due", maintenance.next_service_due ? formatDateDDMMYYYY(maintenance.next_service_due) : "-"],
                ["Spare Parts Replaced", maintenance.spare_parts_replaced || 0],
                ["Oil Entries", maintenance.oil_entries_count || 0],
                ["Oil Total Cost", formatMoney(maintenance.oil_total_cost || 0)],
                ["Breakdown History", (maintenance.breakdown_history || []).length],
                ["Maintenance Alerts", (maintenance.maintenance_alerts || []).length],
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MiniTable
                title="Driver-wise Performance"
                headers={["Driver", "Trips", "Revenue"]}
                rows={(performance.driver_wise_performance || []).slice(0, 6).map((row) => [row.driver_name, row.trips, formatMoney(row.revenue)])}
                emptyText="No driver performance records"
              />
              <MiniTable
                title="Monthly Fuel Trend"
                headers={["Month", "Litres", "Expense"]}
                rows={(fuel.monthly_fuel_trend || []).map((row) => [row.month, Number(row.litres || 0).toFixed(2), formatMoney(row.expense)])}
                emptyText="No fuel trend data"
              />
              <MiniTable
                title="Recent Service History"
                headers={["Date", "Work", "Cost"]}
                rows={(maintenance.service_history || []).slice(0, 6).map((row) => [formatDateDDMMYYYY(row.service_date), row.work_description, formatMoney(row.cost)])}
                emptyText="No service history"
              />
            </div>

            <DetailGrid
              title="Driver Details"
              rows={[
                ["Assigned Driver", driver.assigned_driver?.name || "-"],
                ["License Number", driver.assigned_driver?.license_number || "-"],
                ["Attendance (This Month)", driver.driver_attendance || 0],
                ["Salary Pending", formatMoney(driver.driver_salary_pending || 0)],
                ["Driver Performance Entries", (driver.driver_performance || []).length],
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GraphCard title="Monthly Expense vs Income" rows={smart.monthly_expense_vs_income_graph || []} mode="income_expense" />
              <GraphCard title="Profit Trend" rows={smart.profit_trend_graph || []} mode="profit" />
            </div>

            <div className="glass-card p-6 rounded-[2.5rem] border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-4">Alerts Section</h3>
              {(alerts || []).length === 0 ? (
                <p className="text-sm text-slate-500">No active alerts.</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((item, idx) => (
                    <div key={`${item.type}-${idx}`} className={`p-3 rounded-xl border ${item.severity === "danger" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      <p className="text-[10px] uppercase font-black tracking-widest">{item.type}</p>
                      <p className="text-sm font-semibold mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "fuel" ? (
          <DataTable
            title="Fuel Entries For This Vehicle"
            empty="No Fuel Entries Found"
            headers={["Fill Date", "Source", "Invoice", "Fuel Type", "Vendor", "Litres", "Rate", "Total"]}
            rows={fuelLogEntries.map((entry) => [
              formatDateDDMMYYYY(entry.filled_date),
              entry.source === "trip_usage" || entry.source === "party_fuel" ? entry.reference : "Fuel Entry",
              entry.source === "trip_usage" || entry.source === "party_fuel" ? entry.reference || "-" : "-",
              entry.fuel_type,
              entry.vendor || "-",
              entry.quantity !== null && entry.quantity !== undefined && entry.quantity !== "-" ? Number(entry.quantity || 0).toFixed(2) : "-",
              entry.rate_per_litre !== null && entry.rate_per_litre !== undefined ? formatMoney(entry.rate_per_litre) : "-",
              formatMoney(entry.total_cost),
            ])}
          />
        ) : null}

        {activeTab === "spares" ? (
          <DataTable
            title="Spare Parts For This Vehicle"
            empty="No Spare Parts Found"
            headers={["Installation Date", "Part", "Vendor", "Quantity", "Unit Cost", "Total"]}
            rows={spareEntries.map((sp) => [
              formatDateDDMMYYYY(sp.replaced_date),
              sp.part_name,
              sp.vendor || "-",
              Number(sp.quantity || 0),
              formatMoney(sp.cost),
              formatMoney(Number(sp.cost || 0) * Number(sp.quantity || 0)),
            ])}
          />
        ) : null}

        {activeTab === "maintenance" ? (
          <DataTable
            title="Mistry Work For This Vehicle"
            empty="No Mistry Or Maintenance Records Found"
            headers={["Service Date", "Type", "Work / Particular", "Vendor", "Amount"]}
            rows={[
              ...maintenanceEntries.map((m) => ({
                date: m.service_date,
                row: [
                  formatDateDDMMYYYY(m.service_date),
                  "Mechanic",
                  m.work_description,
                  m.vendor || "-",
                  formatMoney(m.cost ?? m.amount ?? 0),
                ],
              })),
              ...oilEntries.map((o) => ({
                date: o.bill_date,
                row: [
                  formatDateDDMMYYYY(o.bill_date),
                  "Oil",
                  `${o.particular_name} (${Number(o.liters || 0).toFixed(2)} L x ${formatMoney(o.rate || 0)})`,
                  o.vendor_name || "-",
                  formatMoney(o.total_amount || 0),
                ],
              })),
            ]
              .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
              .map((item) => item.row)}
          />
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({ title, value, tone = "blue" }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    red: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <div className={`p-5 rounded-2xl border ${toneMap[tone] || toneMap.blue}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
      <p className="text-2xl font-black tracking-tight mt-1">{value}</p>
    </div>
  );
}

function DetailGrid({ title, rows }) {
  return (
    <div className="glass-card rounded-[2.5rem] border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-5 border-b border-slate-100 md:border-r md:odd:border-r border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-lg font-black text-slate-700 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphCard({ title, rows, mode }) {
  const maxValue = Math.max(
    1,
    ...rows.map((row) => (mode === "profit" ? Math.abs(Number(row.profit || 0)) : Math.max(Number(row.income || 0), Number(row.expense || 0))))
  );

  return (
    <div className="glass-card p-6 rounded-[2.5rem] border border-slate-100">
      <h3 className="text-xl font-black text-slate-800 tracking-tight mb-4">{title}</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.month} className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>{row.month}</span>
              {mode === "profit" ? <span>{formatMoney(row.profit)}</span> : <span>I {formatMoney(row.income)} | E {formatMoney(row.expense)}</span>}
            </div>
            {mode === "profit" ? (
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${Number(row.profit || 0) >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.max((Math.abs(Number(row.profit || 0)) / maxValue) * 100, 2)}%` }} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.max((Number(row.income || 0) / maxValue) * 100, 2)}%` }} /></div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.max((Number(row.expense || 0) / maxValue) * 100, 2)}%` }} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ title, headers, rows, empty }) {
  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100">
      <div className="p-8 bg-slate-50/50 border-b border-slate-100">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">{empty}</div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/30">
                {headers.map((header) => (
                  <th key={header} className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, idx) => (
                <tr key={idx} className="group hover:bg-slate-50/40 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={`${idx}-${cellIdx}`} className="p-6 text-sm font-black text-slate-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniTable({ title, headers, rows, emptyText }) {
  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100">
      <div className="p-5 border-b border-slate-100">
        <h4 className="text-base font-black text-slate-800 tracking-tight">{title}</h4>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="p-3 text-left text-[10px] uppercase tracking-widest font-black text-slate-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  {row.map((cell, cellIdx) => (
                    <td key={`${idx}-${cellIdx}`} className="p-3 text-sm font-semibold text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



