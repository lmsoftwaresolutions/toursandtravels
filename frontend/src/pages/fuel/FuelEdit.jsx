import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function FuelEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    vehicle_number: "",
    fuel_type: "",
    quantity: "",
    rate_per_litre: "",
    filled_date: ""
  });

  /* ---------- LOAD VEHICLES ---------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  /* ---------- LOAD FUEL DATA ---------- */
  useEffect(() => {
    api.get(`/fuel/${id}`).then(res => {
      setForm({
        vehicle_number: res.data.vehicle_number,
        fuel_type: res.data.fuel_type,
        quantity: res.data.quantity,
        rate_per_litre: res.data.rate_per_litre,
        filled_date: res.data.filled_date
      });
    });
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();

    await api.put(`/fuel/${id}`, {
      ...form,
      quantity: Number(form.quantity),
      rate_per_litre: Number(form.rate_per_litre)
    });

    alert("Fuel updated successfully");
    navigate("/fuel/history");
  };

  return (
    <div className="p-6 max-w-xl bg-white shadow rounded">
      <h1 className="text-xl font-semibold mb-4">Edit Fuel Entry</h1>

      <form onSubmit={submit} className="grid gap-3">
        <select
          name="vehicle_number"
          value={form.vehicle_number}
          onChange={handleChange}
          className="border p-2"
          required
        >
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <select
          name="fuel_type"
          value={form.fuel_type}
          onChange={handleChange}
          className="border p-2"
          required
        >
          <option value="">Fuel Type</option>
          <option value="diesel">Diesel</option>
          <option value="petrol">Petrol</option>
        </select>

        <input
          type="number"
          name="quantity"
          placeholder="Quantity (Litres)"
          value={form.quantity}
          onChange={handleChange}
          className="border p-2"
          required
        />

        <input
          type="number"
          name="rate_per_litre"
          placeholder="Rate per litre"
          value={form.rate_per_litre}
          onChange={handleChange}
          className="border p-2"
          required
        />

        <input
          type="date"
          name="filled_date"
          value={form.filled_date}
          onChange={handleChange}
          className="border p-2"
          required
        />



        <button className="bg-blue-600 text-white py-2 rounded">
          Update Fuel
        </button>
      </form>
    </div>
  );
}
