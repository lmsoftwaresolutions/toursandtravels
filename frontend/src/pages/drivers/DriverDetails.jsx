import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function DriverDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
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
      api.get("/trips")
    ]).then(([driverRes, expensesRes, tripsRes]) => {
      setDriver(driverRes.data);
      setExpenses(expensesRes.data);
      setTrips(tripsRes.data.filter(t => t.driver_id === Number(id)));
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

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
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
                          {new Date(group.date).toLocaleDateString()}
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
