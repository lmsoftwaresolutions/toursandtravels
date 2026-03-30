import { useState } from "react";
import api from "../../services/api";

export default function AddTrip() {
  const [form, setForm] = useState({
    vehicle_number: "",
    customer_name: "",
    distance_km: "",
  });

  const normalizeVehicleNumber = (value) =>
    String(value || "").trim().toUpperCase().replace(/[\s-]/g, "");

  const isValidVehicleNumber = (value) =>
    /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(normalizeVehicleNumber(value));

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const saveTrip = async () => {
    const normalizedVehicleNumber = normalizeVehicleNumber(form.vehicle_number);
    if (!normalizedVehicleNumber) {
      alert("Vehicle number is required.");
      return;
    }
    if (!isValidVehicleNumber(form.vehicle_number)) {
      alert("Vehicle number must follow format like MH12AB1234.");
      return;
    }
    if (!form.customer_name.trim()) {
      alert("Customer name is required.");
      return;
    }
    if (!form.distance_km || Number(form.distance_km) <= 0) {
      alert("Distance must be greater than 0.");
      return;
    }

    await api.post("/trips", {
      vehicle_number: normalizedVehicleNumber,
      customer_name: form.customer_name.trim(),
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
          onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })}
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
