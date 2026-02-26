import { useEffect, useState } from "react";
import api from "../services/api";
import { formatDateDDMMYYYY } from "../utils/date";

export default function VehicleNotes({ vehicleNumber }) {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/vehicle-notes/", {
        params: { vehicle_number: vehicleNumber, month },
      });
      setNotes(res.data);
    } catch (err) {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [month, vehicleNumber]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Vehicle Notes</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>

      {loading && <p className="text-gray-500">Loading notes...</p>}
      {!loading && notes.length === 0 && (
        <p className="text-gray-500">No notes for this month</p>
      )}

      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="border-b pb-2">
            <p className="text-sm text-gray-600">{formatDateDDMMYYYY(n.note_date)}</p>
            <p className="text-gray-800">{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
