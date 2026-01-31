import { useState } from "react";
import api from "../../services/api";

export default function VehicleForm() {
  const [vehicleNumber, setVehicleNumber] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", {
        vehicle_number: vehicleNumber,
      });
      alert("Vehicle added successfully");
      setVehicleNumber("");
    } catch (err) {
      alert("Vehicle already exists");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Add Vehicle</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 md:p-6 rounded shadow w-full max-w-md"
      >
        <label className="block text-sm font-medium mb-1">
          Vehicle Number
        </label>

        <input
          className="border p-2 w-full mb-4 rounded"
          placeholder="MH12AB1234"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          required
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full sm:w-auto"
        >
          Save
        </button>
      </form>
    </div>
  );
}
