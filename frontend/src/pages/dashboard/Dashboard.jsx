import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${formatDateDDMMYYYY(dateStr)} ${dayName}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = authService.isAdmin();
  const today = new Date();
  const [dashboardMonth, setDashboardMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const today = new Date();
  const [dashboardMonth, setDashboardMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  useEffect(() => {
    if (isAdmin) {
      api.get("/dashboard", { params: { month: dashboardMonth } })
      api.get("/dashboard", { params: { month: dashboardMonth } })
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
  }, [isAdmin, dashboardMonth]);
  }, [isAdmin, dashboardMonth]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  if (isAdmin && !data) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">A quick look at how the business is doing this month</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <input
              type="month"
              value={dashboardMonth}
              onChange={e => setDashboardMonth(e.target.value)}
              className="border-none bg-transparent px-4 py-2 text-sm font-bold text-slate-700 focus:ring-0"
            />
          </div>
          <button
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        </div>
      )}

      {/* ================= TRIP SCHEDULE ================= */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Trip Schedule</h2>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={dashboardMonth}
              onChange={e => setDashboardMonth(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            />
            <button
              onClick={() => navigate("/notes")}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
            >
              + Add Note
            </button>
          </div>
        </div>

        <TripScheduleChart
          vehicles={isAdmin ? data.vehicles : vehicles}
          scheduleMonth={dashboardMonth}
        />
      </div>
    </div>
  );
}

/* ================= KPI CARD ================= */
function KPI({ title, value, note, highlight }) {
  const color = highlight === "green" ? "text-emerald-600" : highlight === "red" ? "text-rose-600" : "text-blue-600";
  const bg = highlight === "green" ? "bg-emerald-50" : highlight === "red" ? "bg-rose-50" : "bg-blue-50";

  return (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
      <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${highlight === "green" ? "bg-emerald-50 text-emerald-500 border-emerald-100" :
        highlight === "red" ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-blue-50 text-blue-500 border-blue-100"
        }`}>
        {note}
      </div>
    </div>
  );
}

/* ================= TRIP SCHEDULE ================= */
function TripScheduleChart({
  vehicles,
  scheduleMonth
}) {
  const navigate = useNavigate();
function TripScheduleChart({
  vehicles,
  scheduleMonth
}) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [notesByCell, setNotesByCell] = useState({});
  const [notesByCell, setNotesByCell] = useState({});

  /* ✅ NOTE MODAL STATES */
  const [showNoteModal, setShowNoteModal] = useState(false);
  /* ✅ NOTE MODAL STATES */
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [noteVehicleId, setNoteVehicleId] = useState(null);
  const [noteVehicleNumber, setNoteVehicleNumber] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteVehicleId, setNoteVehicleId] = useState(null);
  const [noteVehicleNumber, setNoteVehicleNumber] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  const loadTrips = () => {
  const loadTrips = () => {
    api.get("/trips").then(res => {
      setTrips(
        (res.data || []).sort(
          (a, b) => new Date(a.trip_date) - new Date(b.trip_date)
        )
      );
      setTrips(
        (res.data || []).sort(
          (a, b) => new Date(a.trip_date) - new Date(b.trip_date)
        )
      );
    });
  };

  const loadNotes = () => {
    const vehicleList = vehicles?.length ? vehicles : [];
    if (!vehicleList.length) {
      setNotesByCell({});
      return;
    }

    Promise.all(
      vehicleList.map(v =>
        api.get("/vehicle-notes", {
          params: {
            vehicle_id: v.id,
            month: scheduleMonth
          }
        })
      )
    )
      .then(responses => {
        const grouped = {};
        responses.forEach((res, idx) => {
          const vehicleId = vehicleList[idx].id;
          (res.data || []).forEach(n => {
            const key = `${n.note_date}|${vehicleId}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(n);
          });
        });
        setNotesByCell(grouped);
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to load notes");
      });
  };

  useEffect(() => {
    loadTrips();
  };

  const loadNotes = () => {
    const vehicleList = vehicles?.length ? vehicles : [];
    if (!vehicleList.length) {
      setNotesByCell({});
      return;
    }

    Promise.all(
      vehicleList.map(v =>
        api.get("/vehicle-notes", {
          params: {
            vehicle_id: v.id,
            month: scheduleMonth
          }
        })
      )
    )
      .then(responses => {
        const grouped = {};
        responses.forEach((res, idx) => {
          const vehicleId = vehicleList[idx].id;
          (res.data || []).forEach(n => {
            const key = `${n.note_date}|${vehicleId}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(n);
          });
        });
        setNotesByCell(grouped);
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to load notes");
      });
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [vehicles, scheduleMonth]);
    loadNotes();
  }, [vehicles, scheduleMonth]);

  useEffect(() => {
    const open = () => {
      setNoteText("");
      setNoteDate("");
      setNoteVehicleId(null);
      setNoteVehicleNumber("");
      setEditingNoteId(null);
      setShowNoteModal(true);
    };
    const open = () => {
      setNoteText("");
      setNoteDate("");
      setNoteVehicleId(null);
      setNoteVehicleNumber("");
      setEditingNoteId(null);
      setShowNoteModal(true);
    };
    window.addEventListener("open-add-note", open);
    return () => window.removeEventListener("open-add-note", open);
  }, []);

  const tripsByDate = useMemo(() => {
    const filteredTrips = trips.filter(t => t.trip_date?.startsWith(scheduleMonth));
    const grouped = {};
    filteredTrips.forEach(t => {
      if (!grouped[t.trip_date]) grouped[t.trip_date] = [];
      grouped[t.trip_date].push(t);
    });
    return grouped;
  }, [trips, scheduleMonth]);
  const tripsByDate = useMemo(() => {
    const filteredTrips = trips.filter(t => t.trip_date?.startsWith(scheduleMonth));
    const grouped = {};
    filteredTrips.forEach(t => {
      if (!grouped[t.trip_date]) grouped[t.trip_date] = [];
      grouped[t.trip_date].push(t);
    });
    return grouped;
  }, [trips, scheduleMonth]);

  /* ✅ GENERATE DATES FROM SELECTED MONTH (NEW) */
  const [year, month] = scheduleMonth.split("-").map(Number);
  const [year, month] = scheduleMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    `${scheduleMonth}-${String(i + 1).padStart(2, "0")}`
    `${scheduleMonth}-${String(i + 1).padStart(2, "0")}`
  );

  const vehicleList = vehicles?.length ? vehicles : [];

  const openAddNote = (date, vehicle) => {
    setNoteText("");
    setNoteDate(date);
    setNoteVehicleId(vehicle?.id ?? null);
    setNoteVehicleNumber(vehicle?.vehicle_number ?? "");
    setEditingNoteId(null);
    setShowNoteModal(true);
  };

  const openEditNote = (note) => {
    setNoteText(note.note || "");
    setNoteDate(note.note_date || "");
    setNoteVehicleId(note.vehicle_id || null);
    setNoteVehicleNumber(
      (vehicles || []).find(v => v.id === note.vehicle_id)?.vehicle_number || ""
    );
    setEditingNoteId(note.id);
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (!noteDate || !noteText.trim()) return;
    if (!noteVehicleId) return;

    const payload = {
      vehicle_id: noteVehicleId,
      note: noteText.trim(),
      note_date: noteDate
    };

    const request = editingNoteId
      ? api.put(`/vehicle-notes/${editingNoteId}`, payload)
      : api.post("/vehicle-notes", payload);

    request
      .then(() => {
        setShowNoteModal(false);
        setNoteText("");
        setNoteDate("");
        setNoteVehicleId(null);
        setNoteVehicleNumber("");
        setEditingNoteId(null);
        loadNotes();
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to save note");
      });
  };

  const handleDeleteNote = (noteId) => {
    if (!noteId) return;
    if (!window.confirm("Delete this note?")) return;
    api.delete(`/vehicle-notes/${noteId}`)
      .then(() => loadNotes())
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to delete note");
      });
  };

  const openAddNote = (date, vehicle) => {
    setNoteText("");
    setNoteDate(date);
    setNoteVehicleId(vehicle?.id ?? null);
    setNoteVehicleNumber(vehicle?.vehicle_number ?? "");
    setEditingNoteId(null);
    setShowNoteModal(true);
  };

  const openEditNote = (note) => {
    setNoteText(note.note || "");
    setNoteDate(note.note_date || "");
    setNoteVehicleId(note.vehicle_id || null);
    setNoteVehicleNumber(
      (vehicles || []).find(v => v.id === note.vehicle_id)?.vehicle_number || ""
    );
    setEditingNoteId(note.id);
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (!noteDate || !noteText.trim()) return;
    if (!noteVehicleId) return;

    const payload = {
      vehicle_id: noteVehicleId,
      note: noteText.trim(),
      note_date: noteDate
    };

    const request = editingNoteId
      ? api.put(`/vehicle-notes/${editingNoteId}`, payload)
      : api.post("/vehicle-notes", payload);

    request
      .then(() => {
        setShowNoteModal(false);
        setNoteText("");
        setNoteDate("");
        setNoteVehicleId(null);
        setNoteVehicleNumber("");
        setEditingNoteId(null);
        loadNotes();
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to save note");
      });
  };

  const handleDeleteNote = (noteId) => {
    if (!noteId) return;
    if (!window.confirm("Delete this note?")) return;
    api.delete(`/vehicle-notes/${noteId}`)
      .then(() => loadNotes())
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to delete note");
      });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[120px]">Date</th>
              {vehicleList.map(v => (
                <th key={v.vehicle_number} className="border-b border-slate-100 p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[180px]">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-800 text-sm mb-1">{v.vehicle_number}</span>
                    <span className="text-blue-500 opacity-60">Vehicle</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {dates.map(date => (
              <tr key={date}>
                <td className="border p-3 font-medium bg-gray-50">
                  {formatDateDDMMYYYY(date)}
                </td>

                {vehicleList.map(v => (
                  <td
                    key={v.vehicle_number}
                    className="border p-3 align-top cursor-pointer hover:bg-gray-50"
                    onClick={() => openAddNote(date, v)}
                    title="Click to add note for this date/vehicle"
                  >
                    {(tripsByDate[date] || [])
                      .filter(t => t.vehicle_number === v.vehicle_number)
                      .map(t => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trips/${t.id}`);
                          }}
                          className="w-full text-left bg-blue-50 p-2 rounded text-sm mb-1 hover:bg-blue-100"
                          title="Open trip details"
                        >
                          <div className="font-medium">
                            {t.customer_id} → {t.to_location}
                          </div>
                          <div className="text-xs text-gray-600">
                            Invoice: {t.invoice_number || "—"}
                          </div>
                        </button>
                      ))}

                    {notesByCell[`${date}|${v.id}`] && (
                      <div className="text-xs text-gray-700 mt-2 space-y-1">
                        {notesByCell[`${date}|${v.id}`].map((n) => (
                          <div key={n.id} className="flex items-start justify-between gap-2 bg-yellow-50 border border-yellow-100 rounded p-2">
                            <div className="flex-1">
                              <div className="italic">{n.note}</div>
                            </div>
                            <div className="flex gap-2 text-[11px]">
                              <button
                                type="button"
                                className="text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditNote(n);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(n.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ ADD NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-[420px]">
            <h3 className="font-semibold mb-3">
              {editingNoteId ? "Edit Note" : "Add Note"}
            </h3>

            <input
              type="date"
              className="w-full border p-2 mb-2"
              value={noteDate}
              onChange={e => setNoteDate(e.target.value)}
            />
            <select
              className="w-full border p-2 mb-3"
              value={noteVehicleId || ""}
              onChange={e => {
                const value = Number(e.target.value);
                const v = (vehicles || []).find(x => x.id === value);
                setNoteVehicleId(value || null);
                setNoteVehicleNumber(v?.vehicle_number || "");
              }}
            >
              <option value="">Select vehicle</option>
              {(vehicles || []).map(v => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>

            <textarea
              className="w-full border p-2 mb-3"
              placeholder="Enter note"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNoteId(null);
                }}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveNote}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                {editingNoteId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
