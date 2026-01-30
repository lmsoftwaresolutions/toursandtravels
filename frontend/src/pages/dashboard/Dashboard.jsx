import { useEffect, useState } from "react";
import api from "../../services/api";
import { authService } from "../../services/auth";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    if (isAdmin) {
      api.get("/dashboard")
        .then(res => setData(res.data))
        .catch(() => alert("Failed to load dashboard"))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.get("/vehicles"),
        api.get("/trips"),
        api.get("/drivers")
      ])
        .then(([vehiclesRes, tripsRes, driversRes]) => {
          setVehicles(vehiclesRes.data || []);
          setTrips(tripsRes.data || []);
          setDrivers(driversRes.data || []);
        })
        .catch(() => alert("Failed to load dashboard"))
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  if (isAdmin && !data) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KPI title="Trips" value={data.trips} note="Completed trips" />
          <KPI title="Income" value={`₹ ${data.income.toFixed(2)}`} note="Total revenue" />
          <KPI title="Expenses" value={`₹ ${data.expenses.toFixed(2)}`} note="Fuel + Maintenance" />
          <KPI
            title="Profit / Loss"
            value={`₹ ${data.profit.toFixed(2)}`}
            note={data.profit >= 0 ? "Business is profitable" : "Business running in loss"}
            highlight={data.profit >= 0 ? "green" : "red"}
          />
          <KPI
            title="Total Dues"
            value={`₹ ${data.total_due?.toFixed(2) || "0.00"}`}
            note="Pending from customers"
            highlight={data.total_due > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* ================= TRIP SCHEDULE ================= */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Trip Schedule</h2>

          <button
            onClick={() => window.dispatchEvent(new Event("open-add-note"))}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
          >
            + Add Note
          </button>
        </div>

        <TripScheduleChart vehicles={isAdmin ? data.vehicles : vehicles} />
      </div>
    </div>
  );
}

/* ================= KPI CARD ================= */
function KPI({ title, value, note, highlight }) {
  return (
    <div className="bg-white p-5 rounded shadow">
      <p className="text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${
        highlight === "green" ? "text-green-600" :
        highlight === "red" ? "text-red-600" : ""
      }`}>
        {value}
      </p>
      <p className="text-sm text-gray-400 mt-1">{note}</p>
    </div>
  );
}

/* ================= TRIP SCHEDULE ================= */
function TripScheduleChart({ vehicles }) {
  const [trips, setTrips] = useState([]);
  const [notesByDate, setNotesByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);

  /* ✅ ADD NOTE STATES */
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");

  /* ✅ MONTH SORT STATE (NEW) */
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  useEffect(() => {
    api.get("/trips").then(res => {
      setTrips(res.data.sort((a, b) =>
        new Date(a.trip_date) - new Date(b.trip_date)
      ));
    });
  }, []);

  /* ✅ LOAD NOTES BASED ON MONTH (UPDATED) */
  useEffect(() => {
    api.get("/vehicle-notes/", {
      params: {
        vehicle_id: vehicles?.[0]?.id ?? 1,
        month: selectedMonth
      }
    }).then(res => {
      const grouped = {};
      res.data.forEach(n => {
        if (!grouped[n.note_date]) grouped[n.note_date] = [];
        grouped[n.note_date].push(n);
      });
      setNotesByDate(grouped);
    });
  }, [vehicles, selectedMonth]);

  /* ✅ LISTEN TO ADD NOTE BUTTON */
  useEffect(() => {
    const open = () => setShowAddNote(true);
    window.addEventListener("open-add-note", open);
    return () => window.removeEventListener("open-add-note", open);
  }, []);

  const tripsByDate = {};
  trips.forEach(t => {
    if (!tripsByDate[t.trip_date]) tripsByDate[t.trip_date] = [];
    tripsByDate[t.trip_date].push(t);
  });

  /* ✅ GENERATE DATES FROM SELECTED MONTH (NEW) */
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    `${selectedMonth}-${String(i + 1).padStart(2, "0")}`
  );

  const vehicleList = vehicles?.length ? vehicles : [];

  return (
    <>
      {/* ✅ MONTH PICKER UI (NEW) */}
      <div className="flex justify-end mb-3">
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3">Date</th>
              {vehicleList.map(v => (
                <th key={v.vehicle_number} className="border p-3">
                  {v.vehicle_number}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {dates.map(date => (
              <tr key={date}>
                <td
                  className={`border p-3 font-medium cursor-pointer ${
                    notesByDate[date] ? "bg-yellow-100" : "bg-gray-50"
                  }`}
                  onClick={() => notesByDate[date] && setSelectedDate(date)}
                >
                  {date}
                  {notesByDate[date] && (
                    <span className="ml-2 text-xs text-yellow-700">• Notes</span>
                  )}
                </td>

                {vehicleList.map(v => (
                  <td key={v.vehicle_number} className="border p-3">
                    {(tripsByDate[date] || [])
                      .filter(t => t.vehicle_number === v.vehicle_number)
                      .map(t => (
                        <div key={t.id} className="bg-blue-50 p-2 rounded text-sm mb-1">
                          {t.customer_id} → {t.to_location}
                        </div>
                      ))}

                    {notesByDate[date] && (
                      <div className="text-xs italic text-gray-600">
                        {notesByDate[date][0].note}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ VIEW NOTES MODAL */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-[480px]">
            <h3 className="font-semibold mb-3">Notes for {selectedDate}</h3>
            {notesByDate[selectedDate].map(n => (
              <div key={n.id} className="border-b mb-2 pb-1 text-sm">
                {n.note}
              </div>
            ))}
            <button
              onClick={() => setSelectedDate(null)}
              className="mt-3 px-4 py-2 bg-gray-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ✅ ADD NOTE MODAL */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-[420px]">
            <h3 className="font-semibold mb-3">Add Note</h3>

            <input
              type="date"
              className="w-full border p-2 mb-2"
              value={noteDate}
              onChange={e => setNoteDate(e.target.value)}
            />

            <textarea
              className="w-full border p-2 mb-3"
              placeholder="Enter note"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddNote(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  api.post("/vehicle-notes/", {
                    vehicle_id: vehicles?.[0]?.id ?? 1,
                    note: noteText,
                    note_date: noteDate
                  }).then(() => window.location.reload());
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
