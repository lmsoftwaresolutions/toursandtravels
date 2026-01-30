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
    <>
      <h1 className="text-2xl font-bold mb-4">Add Vehicle</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow w-96"
      >
        <input
          className="border p-2 w-full mb-4"
          placeholder="Vehicle Number (MH12AB1234)"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          required
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Save
        </button>
      </form>
    </>
  );
}
