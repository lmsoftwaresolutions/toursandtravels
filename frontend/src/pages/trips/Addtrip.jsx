import { useState } from "react";
import api from "../../services/api";

export default function AddTrip() {
  const [form, setForm] = useState({
    vehicle_number: "",
    customer_name: "",
    distance_km: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const saveTrip = async () => {
    await api.post("/trips", {
      vehicle_number: form.vehicle_number,
      customer_name: form.customer_name,
      distance_km: Number(form.distance_km),
    });
    alert("Trip added successfully");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Add Trip</h2>

      <div className="bg-white rounded-lg shadow p-6 w-[420px] space-y-4">
        <input
          name="vehicle_number"
          placeholder="Vehicle Number (MH12AB1234)"
          className="border w-full px-3 py-2 rounded"
          onChange={handleChange}
        />

        <input
          name="customer_name"
          placeholder="Customer Name"
          className="border w-full px-3 py-2 rounded"
          onChange={handleChange}
        />

        <input
          name="distance_km"
          placeholder="Distance (KM)"
          className="border w-full px-3 py-2 rounded"
          onChange={handleChange}
        />

        <button
          onClick={saveTrip}
          className="bg-blue-600 text-white px-5 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}
