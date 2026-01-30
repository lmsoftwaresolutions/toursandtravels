import { useEffect, useState } from "react";
import api from "../../services/api";

export default function FuelForm() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    vehicle_number: "",
    fuel_type: "diesel",
    quantity: "",
    rate_per_litre: "",
    filled_date: ""
  });

  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    await api.post("/fuel", {
      ...form,
      quantity: Number(form.quantity),
      rate_per_litre: Number(form.rate_per_litre)
    });
    alert("Fuel entry added");
  };

  return (
    <div className="p-6 max-w-md bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Fuel</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <select name="vehicle_number" onChange={handleChange} required className="border p-2 w-full">
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <select name="fuel_type" onChange={handleChange} className="border p-2 w-full">
          <option value="diesel">Diesel</option>
          <option value="petrol">Petrol</option>
        </select>

        <input name="quantity" placeholder="Litres" type="number"
          onChange={handleChange} className="border p-2 w-full" required />

        <input name="rate_per_litre" placeholder="Rate / Litre" type="number"
          onChange={handleChange} className="border p-2 w-full" required />

        <input name="filled_date" type="date"
          onChange={handleChange} className="border p-2 w-full" required />

        <button className="bg-blue-600 text-white py-2 w-full rounded">
          Save Fuel
        </button>
      </form>
    </div>
  );
}
