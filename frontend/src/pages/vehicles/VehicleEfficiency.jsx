import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function VehicleEfficiency() {
  const [vehicles, setVehicles] = useState([]);
  const [efficiency, setEfficiency] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadVehiclesAndEfficiency();
  }, []);

  const loadVehiclesAndEfficiency = async () => {
    try {
      const res = await api.get("/vehicles");
      setVehicles(res.data);

      // Calculate efficiency for each vehicle using the summary endpoint
      const eff = {};
      for (const v of res.data) {
        try {
          const stats = await api.get(`/vehicles/${v.vehicle_number}/summary`);
          const data = stats.data;
          
          const totalKm = data.total_km || 0;
          const totalCost = data.total_vehicle_cost || 0;
          const fuelCost = data.total_fuel_cost || 0;
          
          eff[v.vehicle_number] = {
            totalKm,
            totalCost,
            fuelCost,
            costPerKm: totalKm > 0 ? (totalCost / totalKm).toFixed(2) : 0,
            fuelCostPerKm: totalKm > 0 ? (fuelCost / totalKm).toFixed(2) : 0,
            trips: data.total_trips || 0,
            maintenance: data.maintenance_cost || 0,
            tripCost: data.trip_cost || 0
          };
        } catch (e) {
          console.error(`Error loading efficiency for ${v.vehicle_number}:`, e);
        }
      }
      setEfficiency(eff);
    } catch (err) {
      console.error("Failed to load vehicles", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading efficiency data...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vehicle Efficiency Report</h1>
        <button
          onClick={() => navigate("/vehicles")}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Back to Vehicles
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Vehicle Number</th>
              <th className="p-3 text-left">Total KM</th>
              <th className="p-3 text-left">Trips</th>
              <th className="p-3 text-left">Cost / KM</th>
              <th className="p-3 text-left">Fuel Cost / KM</th>
              <th className="p-3 text-left">Total Cost</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No vehicles found
                </td>
              </tr>
            ) : (
              vehicles.map(v => {
                const eff = efficiency[v.vehicle_number] || {};
                return (
                  <tr key={v.vehicle_number} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{v.vehicle_number}</td>
                    <td className="p-3">{(eff.totalKm || 0).toLocaleString()} km</td>
                    <td className="p-3">{eff.trips || 0}</td>
                    <td className="p-3 font-semibold text-blue-600">₹{eff.costPerKm || 0}</td>
                    <td className="p-3 text-green-600">₹{eff.fuelCostPerKm || 0}</td>
                    <td className="p-3">₹{(eff.totalCost || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => navigate(`/vehicles/${v.vehicle_number}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded text-sm text-gray-700">
        <p className="font-semibold mb-2">Efficiency Metrics:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Cost / KM:</strong> Total vehicle cost (fuel + trip expenses + maintenance) divided by total km</li>
          <li><strong>Fuel Cost / KM:</strong> Only fuel expenses divided by total km</li>
          <li><strong>Total Cost:</strong> Sum of all expenses (fuel + trip expenses + maintenance)</li>
        </ul>
      </div>
    </div>
  );
}
