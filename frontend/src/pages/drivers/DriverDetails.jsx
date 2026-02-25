
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";

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

  // Group expenses per trip so each trip shows a single row
  const groupedExpenses = Object.values(
    expenses.reduce((acc, exp) => {
      const existing = acc[exp.trip_id] || {
        tripId: exp.trip_id,
        date: exp.created_at,
        total: 0,
        descriptions: [],
        notes: [],
      };

      existing.total += Number(exp.amount || 0);
      existing.date = exp.created_at; // latest entry timestamp
      existing.descriptions.push(exp.description);
      if (exp.notes) existing.notes.push(exp.notes);

      acc[exp.trip_id] = existing;
      return acc;
    }, {})
  );

  useEffect(() => {
    Promise.all([
      api.get(`/drivers/${id}`),
      api.get(`/driver-expenses/driver/${id}`),
      api.get("/trips"),
      api.get(`/driver-salaries/driver/${id}`)
    ]).then(([driverRes, expensesRes, tripsRes, salariesRes]) => {
      setDriver(driverRes.data);
      setExpenses(expensesRes.data);
      setTrips(tripsRes.data.filter(t => t.driver_id === Number(id)));
      setSalaries(salariesRes.data);
      setLoading(false);
    }).catch(error => {
      console.error("Error loading driver details:", error);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!driver) {
    return <div className="p-6">Driver not found</div>;
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow border p-3 mb-4">
          <img src={NathkrupaLogo} alt="Nath Krupa Travels" className="h-10 w-auto" />
        </div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/drivers")}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Drivers
            </button>
            <h1 className="text-3xl font-bold text-gray-800">{driver.name}</h1>
            <p className="text-gray-600">Driver Details & Expenses</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black"
          >
            Print
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <p className="text-sm opacity-90">Total Trips</p>
            <p className="text-3xl font-bold">{trips.length}</p>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
            <p className="text-sm opacity-90">Total Expenses</p>
            <p className="text-3xl font-bold">₹ {totalExpenses.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <p className="text-sm opacity-90">Expense Items</p>
            <p className="text-3xl font-bold">{expenses.length}</p>
          </div>
        </div>

        {/* Driver Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <p className="text-sm text-gray-600">Joining Date</p>
            <p className="text-lg font-semibold text-gray-800">
              {driver.joining_date ? formatDateDDMMYYYY(driver.joining_date) : "-"}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <p className="text-sm text-gray-600">Monthly Salary</p>
            <p className="text-lg font-semibold text-gray-800">
              ₹ {monthlySalary.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <p className="text-sm text-gray-600">Month</p>
            <input
              type="month"
              className="border p-2 rounded w-full mt-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Driver Salary</p>
            <p className="text-2xl font-bold text-blue-700">₹ {monthlySalary.toFixed(2)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-gray-600">Monthly Expenses</p>
            <p className="text-2xl font-bold text-orange-700">₹ {monthlyExpensesTotal.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">Driver Bhatta Only</p>
            <p className="text-2xl font-bold text-purple-700">₹ {monthlyBhattaTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Monthly Payment Calculation */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Monthly Payment Calculation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-600">Total Due</p>
              <p className="text-2xl font-bold text-blue-600">₹ {monthlyTotalDue.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">₹ {monthlySalaryPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-red-600">₹ {monthlyPending.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Driver Salary */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="p-4 bg-gray-100 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Driver Salary</h2>
          </div>
          <div className="p-4">
            <form onSubmit={submitSalaryPayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={salaryForm.amount}
                  onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Paid On</label>
                <input
                  type="date"
                  value={salaryForm.paid_on}
                  onChange={(e) => setSalaryForm({ ...salaryForm, paid_on: e.target.value })}
                  className="border p-2 rounded w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                  className="border p-2 rounded w-full"
                  placeholder="UPI / Cash / Ref"
                />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                Add Salary
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Paid On</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {monthlySalaryPayments.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">
                      No salary payments for this month
                    </td>
                  </tr>
                ) : (
                  monthlySalaryPayments.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 text-sm">{formatDateDDMMYYYY(p.paid_on)}</td>
                      <td className="p-3 text-sm font-semibold">₹ {Number(p.amount).toFixed(2)}</td>
                      <td className="p-3 text-sm">{p.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Monthly Expenses */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="p-4 bg-gray-100 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Driver Monthly Expenses</h2>
          </div>
          {monthlyExpenses.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No expenses for this month</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyExpenses.map((exp) => (
                    <tr key={exp.id} className="border-t">
                      <td className="p-3 text-sm text-gray-600">
                        {exp.created_at ? formatDateDDMMYYYY(exp.created_at) : "-"}
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-800">{exp.description}</td>
                      <td className="p-3 text-sm text-gray-600">{exp.notes || "-"}</td>
                      <td className="p-3 text-sm text-right font-bold text-orange-600">
                        ₹ {Number(exp.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50 border-t-2 border-orange-300">
                    <td colSpan="3" className="p-3 text-right font-bold text-gray-800">
                      Total Monthly Expenses:
                    </td>
                    <td className="p-3 text-right font-bold text-orange-700 text-lg">
                      ₹ {monthlyExpensesTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Driver Bhatta Only */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="p-4 bg-gray-100 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Driver Bhatta Only</h2>
          </div>
          {monthlyBhattaTrips.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No bhatta entries for this month</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Trip</th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-700">Bhatta</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBhattaTrips.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-3 text-sm text-gray-600">{formatDateDDMMYYYY(t.trip_date)}</td>
                      <td className="p-3 text-sm text-gray-700">
                        {t.from_location}→{t.to_location}
                      </td>
                      <td className="p-3 text-sm text-right font-bold text-purple-700">
                        ₹ {Number(t.driver_bhatta || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-purple-50 border-t-2 border-purple-300">
                    <td colSpan="2" className="p-3 text-right font-bold text-gray-800">
                      Total Bhatta:
                    </td>
                    <td className="p-3 text-right font-bold text-purple-700 text-lg">
                      ₹ {monthlyBhattaTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4 bg-gray-100 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Driver Expenses History</h2>
          </div>

          {expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No expenses recorded for this driver
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Invoice Number</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedExpenses.map((group) => {
                    const trip = trips.find(t => t.id === group.tripId);
                    const descLabel =
                      group.descriptions.length === 1
                        ? group.descriptions[0]
                        : `${group.descriptions.length} items`;

                    return (
                      <tr key={group.tripId} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-600">
                          {formatDateDDMMYYYY(group.date)}
                        </td>
                        <td className="p-3 text-sm">
                          <button
                            onClick={() => navigate(`/trips/${group.tripId}`)}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {trip?.invoice_number ? `#${trip.invoice_number}` : "N/A"}
                          </button>
                        </td>
                        <td className="p-3 text-sm font-semibold text-gray-800">
                          {descLabel}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {group.notes.length > 0 ? group.notes.join(", ") : "-"}
                        </td>
                        <td className="p-3 text-sm text-right font-bold text-orange-600">
                          ₹ {Number(group.total).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-orange-50 border-t-2 border-orange-300">
                    <td colSpan="4" className="p-3 text-right font-bold text-gray-800">
                      Total Expenses:
                    </td>
                    <td className="p-3 text-right font-bold text-orange-700 text-lg">
                      ₹ {totalExpenses.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
