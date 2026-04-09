import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.png";
import { COMPANY_ADDRESS, COMPANY_CONTACT, COMPANY_EMAIL, COMPANY_NAME } from "../../constants/company";

export default function DriverDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [salaryForm, setSalaryForm] = useState({ amount: "", paid_on: "", notes: "" });
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/drivers/${id}`),
      api.get(`/driver-expenses/driver/${id}`),
      api.get(`/trips/driver/${id}`),
      api.get(`/driver-salaries/driver/${id}`)
    ]).then(([driverRes, expensesRes, tripsRes, salariesRes]) => {
      setDriver(driverRes.data);
      setExpenses(expensesRes.data);
      setTrips(tripsRes.data || []);
      setSalaries(salariesRes.data || []);
      setLoading(false);
    }).catch(error => {
      console.error("Error loading driver details:", error);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center font-black animate-pulse">LOADING DRIVER DOSSIER...</div>;
  }

  if (!driver) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Driver Not Found</h2>
        <button onClick={() => navigate("/drivers")} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Back to Directory</button>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const isInSelectedMonth = (dateStr) =>
    dateStr && String(dateStr).slice(0, 7) === selectedMonth;

  const monthlyExpenses = expenses.filter(e => isInSelectedMonth(e.created_at));
  const monthlyExpensesTotal = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const monthlyBhattaTrips = trips.filter(t => isInSelectedMonth(t.trip_date));
  const monthlyBhattaTotal = monthlyBhattaTrips.reduce(
    (sum, t) => sum + Number(t.driver_bhatta || 0),
    0
  );

  const monthlySalary = Number(driver.monthly_salary || 0);
  const monthlyTotalDue = monthlySalary + monthlyExpensesTotal + monthlyBhattaTotal;

  const monthlySalaryPayments = salaries.filter(s => isInSelectedMonth(s.paid_on));
  const monthlySalaryPaid = monthlySalaryPayments.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const monthlyPending = Math.max(0, monthlyTotalDue - monthlySalaryPaid);
  const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

  const handlePrint = () => {
    if (!driver) return;
    const printWindow = window.open("", "_blank", "width=1000,height=1200");
    if (!printWindow) return;

    const salaryRows = monthlySalaryPayments.length
      ? monthlySalaryPayments.map((p) => `
          <tr>
            <td>${formatDateDDMMYYYY(p.paid_on)}</td>
            <td>${p.notes || "-"}</td>
            <td class="num">${formatMoney(p.amount)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3" class="empty">No salary payments recorded</td></tr>`;

    const expenseRows = monthlyExpenses.length
      ? monthlyExpenses.map((exp) => `
          <tr>
            <td>${formatDateDDMMYYYY(exp.created_at)}</td>
            <td>${exp.description || "-"}</td>
            <td>${exp.notes || "-"}</td>
            <td class="num">${formatMoney(exp.amount)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="empty">No operational expenses recorded</td></tr>`;

    const tripRows = monthlyBhattaTrips.length
      ? monthlyBhattaTrips.map((t) => `
          <tr>
            <td>${formatDateDDMMYYYY(t.trip_date)}</td>
            <td>${t.from_location || "-"} to ${t.to_location || "-"}</td>
            <td class="num">${Number(t.driver_bhatta || 0).toFixed(2)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3" class="empty">No trip bhatta recorded</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Driver ${driver.name || ""}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #fff; color: #111827; }
            .page { max-width: 190mm; margin: 0 auto; border: 1px solid #cbd5e1; padding: 10mm; }
            .header { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
            .brand { display: flex; gap: 12px; align-items: flex-start; }
            .logo { height: 48px; width: auto; object-fit: contain; }
            .company-name { font-size: 24px; font-weight: 800; }
            .muted { color: #64748b; font-size: 13px; }
            .title { font-size: 20px; font-weight: 800; margin-top: 6px; }
            .section-title { font-size: 14px; font-weight: 700; margin: 18px 0 8px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
            .card { border: 1px solid #cbd5e1; padding: 10px; }
            .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .value { font-size: 18px; font-weight: 800; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
            .num { text-align: right; }
            .empty { text-align: center; color: #94a3b8; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                <img src="${NathkrupaLogo}" class="logo" alt="Logo" />
                <div>
                  <div class="company-name">${COMPANY_NAME}</div>
                  <div class="muted">${COMPANY_ADDRESS}</div>
                  ${COMPANY_EMAIL ? `<div class="muted">Email: ${COMPANY_EMAIL}</div>` : ""}
                  ${COMPANY_CONTACT ? `<div class="muted">Phone: ${COMPANY_CONTACT}</div>` : ""}
                  <div class="title">Driver Statement</div>
                </div>
              </div>
              <div>
                <div class="label">Driver</div>
                <div class="value">${driver.name}</div>
                <div class="label" style="margin-top: 8px;">Month</div>
                <div class="value">${selectedMonth || "-"}</div>
                <div class="label" style="margin-top: 8px;">Printed</div>
                <div class="value">${new Date().toLocaleString()}</div>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <div class="label">Monthly Salary</div>
                <div class="value">${formatMoney(monthlySalary)}</div>
              </div>
              <div class="card">
                <div class="label">Expenses (Month)</div>
                <div class="value">${formatMoney(monthlyExpensesTotal)}</div>
              </div>
              <div class="card">
                <div class="label">Bhatta (Month)</div>
                <div class="value">${formatMoney(monthlyBhattaTotal)}</div>
              </div>
              <div class="card">
                <div class="label">Total Due</div>
                <div class="value">${formatMoney(monthlyTotalDue)}</div>
              </div>
              <div class="card">
                <div class="label">Paid</div>
                <div class="value">${formatMoney(monthlySalaryPaid)}</div>
              </div>
              <div class="card">
                <div class="label">Pending</div>
                <div class="value">${formatMoney(monthlyPending)}</div>
              </div>
            </div>

            <div class="section-title">Salary Payments</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th class="num">Amount</th>
                </tr>
              </thead>
              <tbody>${salaryRows}</tbody>
            </table>

            <div class="section-title">Operational Expenses</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th class="num">Amount</th>
                </tr>
              </thead>
              <tbody>${expenseRows}</tbody>
            </table>

            <div class="section-title">Trip Bhatta</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th class="num">Bhatta</th>
                </tr>
              </thead>
              <tbody>${tripRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };

  const submitSalaryPayment = async (e) => {
    e.preventDefault();
    if (!salaryForm.amount || !salaryForm.paid_on) return;

    try {
      await api.post("/driver-salaries", {
        driver_id: Number(id),
        amount: Number(salaryForm.amount),
        paid_on: salaryForm.paid_on,
        notes: salaryForm.notes || null,
      });
      const res = await api.get(`/driver-salaries/driver/${id}`);
      setSalaries(res.data);
      setSalaryForm({ amount: "", paid_on: "", notes: "" });
    } catch (error) {
      alert("Error recording salary payment: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Driver Information</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Operational performance and financial settlement</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm print:hidden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print 
          </button>
          <button
            onClick={() => navigate("/drivers")}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 transition-all text-sm"
          >
            Drivers
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-8 rounded-[2rem] border border-slate-100 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Driver</p>
          <p className="text-2xl font-black text-slate-800 mt-2 tracking-tight">{driver.name}</p>
          <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
            driver.is_active
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-rose-50 text-rose-600 border-rose-100"
          }`}>
            {driver.is_active ? "Active" : "Inactive"}
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-blue-100 bg-blue-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Total Trips</p>
          <p className="text-4xl font-black text-blue-600 mt-2 tracking-tighter">{trips.length}</p>
          <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-tighter">Total Dispatches</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-orange-100 bg-orange-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Total Expenses</p>
          <p className="text-4xl font-black text-orange-600 mt-2 tracking-tighter">₹ {totalExpenses.toFixed(0)}</p>
          <p className="text-[10px] font-bold text-orange-400 mt-2 uppercase tracking-tighter">Aggregate Expenses</p>
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-emerald-100 bg-emerald-50/30 relative overflow-hidden group">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Monthly Salary</p>
          <p className="text-4xl font-black text-emerald-600 mt-2 tracking-tighter">₹ {monthlySalary.toFixed(0)}</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-tighter">Current Base Wage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Monthly Summary */}
          <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                Salary Summary
              </h3>
              <input
                type="month"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Salary</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₹ {monthlySalary.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TotalExpense </p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₹ {monthlyExpensesTotal.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mission Bhatta</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₹ {monthlyBhattaTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.21 1.87 1.32 0 2.14-.65 2.14-1.44 0-.89-.74-1.28-2.13-1.63-1.66-.4-3.66-.99-3.66-3.21 0-1.85 1.5-3.09 3.27-3.4V5h2.67v1.91c1.47.28 2.7 1.25 2.87 2.9h-1.96c-.17-.89-.74-1.57-1.94-1.57-1.2 0-1.97.56-1.97 1.34 0 .76.62 1.13 2.05 1.51 1.63.43 3.75 1.04 3.75 3.33 0 1.94-1.42 3.19-3.32 3.52z"/></svg>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Due</p>
                  <p className="text-3xl font-black tracking-tight">₹ {monthlyTotalDue.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Salary Paid</p>
                  <p className="text-3xl font-black tracking-tight">₹ {monthlySalaryPaid.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Pending</p>
                  <p className={`text-4xl font-black tracking-tight ${monthlyPending > 0 ? "text-rose-500" : "text-emerald-400"}`}>
                    ₹ {monthlyPending.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Salary Payments */}
          <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              Salary Payments
            </h3>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
              <form onSubmit={submitSalaryPayment} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salaryForm.amount}
                    onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                    required
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={salaryForm.paid_on}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paid_on: e.target.value })}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Transaction Signoff</label>
                  <input
                    type="text"
                    value={salaryForm.notes}
                    onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-300"
                    placeholder="Ref (UPI/Cash/Audit)"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full h-11 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                    Save
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              {monthlySalaryPayments.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  No remittances found for this cycle
                </div>
              ) : (
                monthlySalaryPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group hover:border-emerald-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[10px] uppercase">
                        S
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">{formatDateDDMMYYYY(p.paid_on)}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{p.notes || "Standard Settlement"}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-600 tracking-tight">₹ {Number(p.amount).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Expenses (Monthly) */}
          <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              Operational Overheads (Cycle)
            </h3>
            
            <div className="space-y-3">
              {monthlyExpenses.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  Zero overheads identified
                </div>
              ) : (
                monthlyExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group hover:border-orange-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-[10px] uppercase">
                        X
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">{exp.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          {formatDateDDMMYYYY(exp.created_at)} {exp.notes && `• ${exp.notes}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-orange-600 tracking-tight">₹ {Number(exp.amount).toFixed(2)}</p>
                  </div>
                ))
              )}
              {monthlyExpenses.length > 0 && (
                <div className="flex justify-between items-center p-6 bg-orange-50 rounded-2xl border border-orange-100 mt-6 font-black text-orange-700 tracking-tight">
                  <span className="text-[10px] uppercase tracking-widest">Aggregate Overheads</span>
                  <span className="text-xl">₹ {monthlyExpensesTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Mission Bhatta Ledger */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 bg-white">
            <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
              Mission Bhatta
            </h3>
            <div className="space-y-3">
              {monthlyBhattaTrips.length === 0 ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-100">Silence in registry</p>
              ) : (
                monthlyBhattaTrips.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-slate-800 leading-none uppercase tracking-tighter">
                        {t.from_location} <span className="text-slate-300 mx-1">→</span> {t.to_location}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{formatDateDDMMYYYY(t.trip_date)}</p>
                    </div>
                    <p className="text-xs font-black text-purple-600 tracking-tight">₹ {Number(t.driver_bhatta || 0).toFixed(0)}</p>
                  </div>
                ))
              )}
              {monthlyBhattaTrips.length > 0 && (
                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center font-black text-purple-700 text-sm tracking-tight">
                  <span className="text-[9px] uppercase tracking-widest">Summed Bhatta</span>
                  <span>₹ {monthlyBhattaTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Utilization (Recent Trips) */}
          <div className="glass-card p-8 rounded-[2.5rem] border border-slate-100 bg-white">
            <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
              Trip History
            </h3>
            <div className="space-y-4">
              {trips.slice(0, 5).map((trip) => {
                return (
                  <div key={trip.id} className="group cursor-pointer" onClick={() => navigate(`/trips/${trip.id}`)}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {trip.invoice_number ? `Manifest #${trip.invoice_number}` : "Pending Audit"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-2/3 opacity-30 shadow-sm" />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      {formatDateDDMMYYYY(trip.trip_date)} • {trip.from_location} to {trip.to_location}
                    </p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => navigate("/trips")}
              className="w-full mt-6 py-3 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
            >
              Examine Full Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
