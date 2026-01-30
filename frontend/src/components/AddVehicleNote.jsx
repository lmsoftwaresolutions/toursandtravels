import { useState } from "react";
import api from "../services/api";

export default function AddVehicleNote({ vehicleId, onAdded }) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  const submit = async () => {
    if (!note || !date) {
      alert("Please fill all fields");
      return;
    }

    await api.post("/vehicle-notes/", {
      vehicle_id: Number(vehicleId), // ✅ MUST be number
      note: note,
      note_date: date,               // ✅ YYYY-MM-DD
    });

    setNote("");
    setDate("");
    onAdded && onAdded();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-semibold mb-3">Add Note</h3>

      <input
        type="date"
        className="border px-3 py-2 rounded w-full mb-2"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <textarea
        className="border px-3 py-2 rounded w-full mb-2"
        rows={3}
        placeholder="Enter note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Note
      </button>
    </div>
  );
}
