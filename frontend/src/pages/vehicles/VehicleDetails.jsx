import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function VehicleDetails() {
  const { vehicle_number } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    api
      .get(`/vehicles/${vehicle_number}/summary`)
      .then(res => setSummary(res.data))
      .catch(() => alert("Failed to load vehicle summary"));
  }, [vehicle_number]);

  if (!summary) {
    return <LoadingSpinner fullScreen message="Loading vehicle details..." />;
  }

    const formatMoney = (value) => Number(value || 0).toFixed(2);

return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/vehicles")}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Vehicles
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Vehicle {summary.vehicle_number}</h1>
            <p className="text-gray-600">Comprehensive Vehicle Analytics</p>
          </div>
          <button
            onClick={() => navigate(`/vehicles/${vehicle_number}/edit`)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow"
          >
            Edit Vehicle
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-3 border-b">
          {[
            { key: "overview", label: "Overview" },
            { key: "fuel", label: "Fuel History" },
            { key: "spares", label: `Spare Parts (${summary.spare_parts?.length || 0})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Total Trips</p>
                <p className="text-3xl font-bold">{summary.total_trips}</p>
                <p className="text-xs opacity-75 mt-2">All time</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Total Distance</p>
                <p className="text-3xl font-bold">{summary.total_km} km</p>
                <p className="text-xs opacity-75 mt-2">Traveled</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Trip Revenue</p>
                <p className="text-3xl font-bold">₹ {formatMoney(summary.trip_cost)}</p>
                <p className="text-xs opacity-75 mt-2">Earnings</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Fuel Cost</p>
                <p className="text-3xl font-bold">₹ {formatMoney(summary.total_fuel_cost)}</p>
                <p className="text-xs opacity-75 mt-2">Consumed</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Maintenance Cost</p>
                <p className="text-3xl font-bold">₹ {formatMoney(summary.maintenance_cost)}</p>
                <p className="text-xs opacity-75 mt-2">Repairs</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-6 rounded-xl shadow-lg">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg w-fit mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm opacity-90 mb-1">Total Vehicle Cost</p>
                <p className="text-3xl font-bold">₹ {formatMoney(summary.total_vehicle_cost)}</p>
                <p className="text-xs opacity-75 mt-2">Overall</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customers Served</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.customers_served}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average km per Trip</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {summary.total_trips > 0 ? (summary.total_km / summary.total_trips).toFixed(2) : 0} km
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cost per km</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ₹ {summary.total_km > 0 ? (summary.total_vehicle_cost / summary.total_km).toFixed(2) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fuel Tab */}
        {activeTab === "fuel" && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 bg-gray-100 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Fuel Cost Breakdown</h2>
            </div>
            {!summary.fuel_costs || Object.keys(summary.fuel_costs).length === 0 ? (
              <div className="p-6 text-center text-gray-500">No fuel records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Fuel Type</th>
                      <th className="p-3 text-right text-sm font-semibold text-gray-700">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.fuel_costs).map(([type, cost]) => (
                      <tr key={type} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-700 capitalize">{type}</td>
                        <td className="p-3 text-sm text-right font-bold text-orange-600">₹ {formatMoney(cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Spare Parts Tab */}
        {activeTab === "spares" && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 bg-gray-100 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Spare Parts History</h2>
            </div>
            {!summary.spare_parts || summary.spare_parts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No spare parts used</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Part Name</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Vendor</th>
                      <th className="p-3 text-right text-sm font-semibold text-gray-700">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.spare_parts.map(sp => (
                      <tr key={sp.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-700">{formatDateDDMMYYYY(sp.replaced_date)}</td>
                        <td className="p-3 text-sm font-semibold text-gray-800">{sp.part_name}</td>
                        <td className="p-3 text-sm text-gray-700">{sp.quantity}</td>
                        <td className="p-3 text-sm text-gray-700">{sp.vendor}</td>
                        <td className="p-3 text-sm text-right font-bold text-red-600">₹ {formatMoney(sp.cost)}</td>
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
