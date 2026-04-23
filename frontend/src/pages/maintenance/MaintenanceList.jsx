import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "emi", label: "EMI" },
  { key: "insurance", label: "Insurance" },
  { key: "tax", label: "Tax" },
];

const badgeClass = (status) => {
  if (status === "paid" || status === "active" || status === "renewed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "overdue" || status === "expired") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
};

export default function MaintenanceList() {
  const navigate = useNavigate();
  const { type } = useParams();
  const activeType = TYPE_TABS.some((t) => t.key === type) ? type : "all";
  const [addType, setAddType] = useState(activeType === "all" ? "emi" : activeType);

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("all_months");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const canWrite = !authService.hasLimitedAccess();

  useEffect(() => {
    if (activeType !== "all") setAddType(activeType);
  }, [activeType]);

  const loadVehicles = async () => {
    const res = await api.get("/vehicles");
    const vehicleList = res.data || [];
    setVehicles(vehicleList);
    if (vehicleList.length > 0) {
      setSelectedVehicle(vehicleList[0].vehicle_number);
    }
  };

  const loadFinance = async (vehicleNumber) => {
    if (!vehicleNumber) {
      setFinance(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/vehicle-finance/vehicle/${vehicleNumber}`);
      setFinance(res.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadVehicles();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      loadFinance(selectedVehicle);
    }
  }, [selectedVehicle]);

  const emi = finance?.emi;
  const insurance = finance?.insurance;
  const tax = finance?.tax;

  const periodMatches = (dateValue) => {
    if (!dateValue) return false;
    if (viewMode === "all_months") return true;
    const normalized = String(dateValue).slice(0, 10);
    if (viewMode === "monthly") return normalized.slice(0, 7) === selectedMonth;
    if (viewMode === "yearly") return normalized.slice(0, 4) === selectedYear;
    return true;
  };

  const periodRange = useMemo(() => {
    if (viewMode === "all_months") return null;
    if (viewMode === "monthly") {
      const [yearPart, monthPart] = selectedMonth.split("-").map(Number);
      const monthStart = `${selectedMonth}-01`;
      const lastDay = new Date(yearPart, monthPart, 0).getDate();
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
      return { start: monthStart, end: monthEnd };
    }
    return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
  }, [selectedMonth, selectedYear, viewMode]);

  const insuranceInPeriod = useMemo(() => {
    if (!insurance) return false;
    if (viewMode === "all_months") return true;
    if (!periodRange) return true;
    const start = String(insurance.start_date || "");
    const end = String(insurance.end_date || "");
    return start <= periodRange.end && end >= periodRange.start;
  }, [insurance, periodRange, viewMode]);

  const taxInPeriod = useMemo(() => {
    if (!tax) return false;
    if (viewMode === "all_months") return true;
    if (!periodRange) return true;
    const start = String(tax.tax_start_date || "");
    const end = String(tax.tax_expiry_date || "");
    return start <= periodRange.end && end >= periodRange.start;
  }, [tax, periodRange, viewMode]);

  const filteredInstallments = useMemo(() => {
    const allInstallments = emi?.installments || [];
    if (viewMode === "all_months") return allInstallments;
    return allInstallments.filter((item) => periodMatches(item.due_date));
  }, [emi, selectedMonth, selectedYear, viewMode]);

  const emiStatusForView = useMemo(() => {
    if (!emi) return "pending";
    const list = filteredInstallments;
    if (!list.length) return "pending";
    const hasOverdue = list.some((item) => item.status === "overdue");
    const allPaid = list.every((item) => item.status === "paid");
    if (hasOverdue) return "overdue";
    if (allPaid) return "paid";
    return "pending";
  }, [emi, filteredInstallments]);

  const allRows = useMemo(
    () => [
      {
        id: "emi",
        type: "EMI",
        amount: viewMode === "yearly"
          ? filteredInstallments.reduce((sum, item) => sum + Number(item.amount_due || 0), 0)
          : emi?.monthly_emi || 0,
        notes: emi
          ? `Loan ${emi.loan_duration_months} months | Remaining Rs. ${Number(emi.total_remaining_balance || 0).toLocaleString()}`
          : "Not configured",
        date: emi?.emi_start_date,
        expiry: emi?.emi_end_date,
        status: emiStatusForView,
      },
      {
        id: "insurance",
        type: "Insurance",
        amount: viewMode === "yearly" ? insurance?.total_insurance_amount || 0 : insurance?.monthly_insurance_cost || 0,
        notes: insurance ? `${insurance.provider_name} | Policy ${insurance.policy_number}` : "Not configured",
        date: insurance?.start_date,
        expiry: insurance?.end_date,
        status: insurance?.status || "pending",
      },
      {
        id: "tax",
        type: "Tax",
        amount: viewMode === "yearly" ? tax?.annual_total_tax || 0 : tax?.monthly_tax_cost || 0,
        notes: tax ? `Annual Rs. ${Number(tax.annual_total_tax || 0).toLocaleString()}` : "Not configured",
        date: tax?.tax_start_date,
        expiry: tax?.tax_expiry_date,
        status: tax?.status || "pending",
      },
    ],
    [emi, emiStatusForView, filteredInstallments, insurance, tax, viewMode]
  );

  const visibleAllRows = useMemo(() => {
    return allRows.filter((row) => {
      if (viewMode === "all_months") return true;
      if (row.id === "emi") return filteredInstallments.length > 0;
      if (row.id === "insurance") return insuranceInPeriod;
      if (row.id === "tax") return taxInPeriod;
      return true;
    });
  }, [allRows, filteredInstallments.length, insuranceInPeriod, taxInPeriod, viewMode]);

  const markInstallmentPaid = async (installmentId, amountDue) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await api.post(`/vehicle-finance/emi-installments/${installmentId}/pay`, { paid_amount: Number(amountDue || 0) });
      await loadFinance(selectedVehicle);
    } finally {
      setSaving(false);
    }
  };

  const editInstallmentPayment = async (installment) => {
    if (!canWrite) return;
    const currentAmount = Number(installment.paid_amount || installment.amount_due || 0);
    const amountInput = window.prompt("Enter paid amount for this month installment:", String(currentAmount));
    if (amountInput === null) return;
    const nextAmount = Number(amountInput);
    if (Number.isNaN(nextAmount) || nextAmount < 0) {
      window.alert("Please enter a valid non-negative amount.");
      return;
    }

    const currentDate = installment.paid_on
      ? String(installment.paid_on).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const dateInput = window.prompt("Enter payment date (YYYY-MM-DD):", currentDate);
    if (dateInput === null) return;

    setSaving(true);
    try {
      await api.post(`/vehicle-finance/emi-installments/${installment.id}/pay`, {
        paid_amount: nextAmount,
        paid_on: dateInput || null,
      });
      await loadFinance(selectedVehicle);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Maintenance Records</h1>
          <p className="text-slate-500 font-medium mt-1">Track EMI, insurance, tax, and other vehicle costs</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeType === "all" && (
            <div className="relative group">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none shadow-sm"
              >
                <option value="emi">EMI</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate(`/maintenance/${addType}/add`)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Record
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/maintenance/${tab.key}`)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeType === tab.key
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Select Vehicle</label>
            <div className="relative group w-full">
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="all_months">All Months</option>
              <option value="monthly">Specific Month</option>
              <option value="yearly">Specific Year</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">
              {viewMode === "yearly" ? "Year Filter" : "Month Filter"}
            </label>
            {viewMode === "yearly" ? (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                {Array.from({ length: 15 }, (_, idx) => String(new Date().getFullYear() - 7 + idx)).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={viewMode !== "monthly"}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
              />
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-20 rounded-3xl text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading records...</div>
      ) : null}

      {!loading && activeType === "all" ? (
        <div className="glass-card rounded-3xl overflow-hidden min-h-[300px]">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Date / Expiry</th>
                  <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleAllRows.map((row) => (
                  <tr key={row.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-black text-slate-700">{row.type}</td>
                    <td className="p-6 text-base font-black text-slate-800 tracking-tighter">Rs.{Number(row.amount || 0).toLocaleString()}</td>
                    <td className="p-6 text-sm text-slate-500 font-medium">{row.notes}</td>
                    <td className="p-6 text-sm text-slate-600">{row.date ? formatDateDDMMYYYY(row.date) : "-"}{row.expiry ? ` -> ${formatDateDDMMYYYY(row.expiry)}` : ""}</td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badgeClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
                {visibleAllRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      No records in selected period
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && activeType === "emi" ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            {canWrite ? (
              <button
                onClick={() => navigate(`/maintenance/emi/add?vehicle=${encodeURIComponent(selectedVehicle)}`)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Edit EMI
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <MiniStat title="Monthly EMI" value={`Rs.${Number(emi?.monthly_emi || 0).toLocaleString()}`} />
            <MiniStat title="Paid Months" value={filteredInstallments.filter((x) => x.status === "paid").length} />
            <MiniStat title="Pending Months" value={filteredInstallments.filter((x) => x.status === "pending").length} />
            <MiniStat title="Overdue" value={filteredInstallments.filter((x) => x.status === "overdue").length} tone={filteredInstallments.some((x) => x.status === "overdue") ? "danger" : "normal"} />
          </div>

          <div className="glass-card rounded-3xl overflow-hidden min-h-[300px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-separate border-spacing-0 min-w-[920px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Month #</th>
                    <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                    <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">EMI Amount</th>
                    <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Principal</th>
                    <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Interest</th>
                    <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Balance</th>
                    <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInstallments.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="p-6 text-sm font-black text-slate-700">{item.installment_number}</td>
                      <td className="p-6 text-sm text-slate-600">{formatDateDDMMYYYY(item.due_date)}</td>
                      <td className="p-6 text-right font-black text-slate-800">Rs.{Number(item.amount_due || 0).toLocaleString()}</td>
                      <td className="p-6 text-right text-slate-600">Rs.{Number(item.principal_component || 0).toLocaleString()}</td>
                      <td className="p-6 text-right text-slate-600">Rs.{Number(item.interest_component || 0).toLocaleString()}</td>
                      <td className="p-6 text-right text-slate-600">Rs.{Number(item.closing_balance || 0).toLocaleString()}</td>
                      <td className="p-6">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badgeClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {canWrite && !item.is_paid ? (
                            <button
                              onClick={() => markInstallmentPaid(item.id, item.amount_due)}
                              disabled={saving}
                              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider disabled:opacity-60"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-black uppercase">{item.paid_on ? `Paid ${formatDateDDMMYYYY(item.paid_on)}` : "-"}</span>
                          )}
                          {canWrite ? (
                            <button
                              onClick={() => editInstallmentPayment(item)}
                              disabled={saving}
                              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider disabled:opacity-60"
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInstallments.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        No EMI installments in selected period
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && activeType === "insurance" ? (
        insuranceInPeriod ? (
          <SingleCard
            title="Insurance Details"
            rows={[
              ["Provider", insurance?.provider_name || "-"],
              ["Policy Number", insurance?.policy_number || "-"],
              ["Type", insurance?.insurance_type || "-"],
              ["Period", insurance?.start_date ? `${formatDateDDMMYYYY(insurance.start_date)} -> ${formatDateDDMMYYYY(insurance.end_date)}` : "-"],
              ["Total Insurance", `Rs.${Number(insurance?.total_insurance_amount || 0).toLocaleString()}`],
              ["Monthly Cost", `Rs.${Number(insurance?.monthly_insurance_cost || 0).toLocaleString()}`],
              ["Remaining Days", insurance ? insurance.remaining_days : "-"],
              ["Renewal Status", insurance?.renewal_status || "-"],
            ]}
            status={insurance?.status || "pending"}
            action={canWrite ? (
              <button
                onClick={() => navigate(`/maintenance/insurance/add?vehicle=${encodeURIComponent(selectedVehicle)}`)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Edit Insurance
              </button>
            ) : null}
          />
        ) : (
          <div className="glass-card p-10 rounded-3xl text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            No insurance record in selected period
          </div>
        )
      ) : null}

      {!loading && activeType === "tax" ? (
        taxInPeriod ? (
          <SingleCard
            title="Tax Details"
            rows={[
              ["Road Tax", `Rs.${Number(tax?.road_tax || 0).toLocaleString()}`],
              ["Permit Tax", `Rs.${Number(tax?.permit_tax || 0).toLocaleString()}`],
              ["Fitness Tax", `Rs.${Number(tax?.fitness_tax || 0).toLocaleString()}`],
              ["Pollution Tax", `Rs.${Number(tax?.pollution_tax || 0).toLocaleString()}`],
              ["State/National Permit Charges", `Rs.${Number(tax?.permit_charges || 0).toLocaleString()}`],
              ["Other Taxes", `Rs.${Number(tax?.other_taxes || 0).toLocaleString()}`],
              ["Annual Total Tax", `Rs.${Number(tax?.annual_total_tax || 0).toLocaleString()}`],
              ["Monthly Tax", `Rs.${Number(tax?.monthly_tax_cost || 0).toLocaleString()}`],
              ["Tax Period", tax?.tax_start_date ? `${formatDateDDMMYYYY(tax.tax_start_date)} -> ${formatDateDDMMYYYY(tax.tax_expiry_date)}` : "-"],
              ["Remaining Days", tax ? tax.remaining_days : "-"],
              ["Renewal Status", tax?.renewal_status || "-"],
            ]}
            status={tax?.status || "pending"}
            action={canWrite ? (
              <button
                onClick={() => navigate(`/maintenance/tax/add?vehicle=${encodeURIComponent(selectedVehicle)}`)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Edit Tax
              </button>
            ) : null}
          />
        ) : (
          <div className="glass-card p-10 rounded-3xl text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            No tax record in selected period
          </div>
        )
      ) : null}
    </div>
  );
}

function MiniStat({ title, value, tone = "normal" }) {
  const cls = tone === "danger" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <p className={`text-2xl font-black tracking-tight mt-1 ${cls}`}>{value}</p>
    </div>
  );
}

function SingleCard({ title, rows, status, action = null }) {
  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-slate-100">
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
        <div className="flex items-center gap-3">
          {action}
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badgeClass(status)}`}>{status}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {rows.map(([label, value]) => (
          <div key={label} className="p-5 border-b border-slate-100 md:border-r md:odd:border-r border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-700 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
