import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";
import Modal from "../../components/common/Modal";

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${formatDateDDMMYYYY(dateStr)} ${dayName}`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = authService.isAdmin();
  const canWrite = !authService.hasLimitedAccess();
  const canWrite = !authService.hasLimitedAccess();
  const today = new Date();
  const [dashboardMonth, setDashboardMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const showModal = (title, message, type = "error") => setModal({ isOpen: true, title, message, type });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  useEffect(() => {
    if (isAdmin) {
      api.get("/dashboard", { params: { month: dashboardMonth } })
        .then(res => setData(res.data))
        .catch(() => showModal("Error", "Failed to load dashboard data"))
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
        .catch(() => showModal("Error", "Failed to load dashboard data"))
        .finally(() => setLoading(false));
    }
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
            type="button"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <KPI title="Total Trips" value={data.trips} note="This month" />
          <KPI title="Total Revenue" value={`₹${data.income.toLocaleString()}`} note="Invoice total" />
          <KPI title="Operating Expense" value={`₹${data.expenses.toLocaleString()}`} note="Fuel + spare + maintenance + toll + parking" />
          <KPI
            title="Net Profit"
            value={`₹${data.profit.toLocaleString()}`}
            note="Revenue minus operating expense"
            highlight={data.profit >= 0 ? "green" : "red"}
          />
          <KPI
            title="Balance Due"
            value={`₹${(data.total_due || 0).toLocaleString()}`}
            note="Not yet collected"
            highlight={data.total_due > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* ================= TRIP SCHEDULE ================= */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[500px]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/40">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Trip Schedule</h2>
            <p className="text-slate-500 text-sm font-medium">Which vehicle is assigned to which trip</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="p-2">
          <TripScheduleChart
            vehicles={isAdmin ? data.vehicles : vehicles}
            scheduleMonth={dashboardMonth}
            canWrite={canWrite}
          />
        </div>
      </div>
      {/* MODAL */}
      <Modal 
        isOpen={modal.isOpen} 
        onClose={closeModal} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
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
  scheduleMonth,
  canWrite
}) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [notesByCell, setNotesByCell] = useState({});

  /* ✅ NOTE MODAL STATES */
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [noteVehicleId, setNoteVehicleId] = useState(null);
  const [noteVehicleNumber, setNoteVehicleNumber] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  const loadTrips = () => {
    api.get("/trips").then(res => {
      setTrips(
        (res.data || []).sort(
          (a, b) => {
            const dateA = new Date(a.departure_datetime || a.trip_date);
            const dateB = new Date(b.departure_datetime || b.trip_date);
            return dateA - dateB;
          }
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
  }, []);

  useEffect(() => {
    loadNotes();
  }, [vehicles, scheduleMonth]);

  useEffect(() => {
    const open = () => {
      const firstVehicle = (vehicles || [])[0];
      const todayStr = new Date().toISOString().split("T")[0];
      setNoteText("");
      setNoteDate(todayStr);
      setNoteVehicleId(firstVehicle?.id || null);
      setNoteVehicleNumber(firstVehicle?.vehicle_number || "");
      setEditingNoteId(null);
      setShowNoteModal(true);
    };
    window.addEventListener("open-add-note", open);
    return () => window.removeEventListener("open-add-note", open);
  }, [vehicles]);

  const tripsByDate = useMemo(() => {
    const grouped = {};
    trips.forEach(t => {
      // Priority: departure_datetime > trip_date
      let effectiveDate = t.trip_date;
      if (t.departure_datetime) {
        effectiveDate = t.departure_datetime.split("T")[0];
      }

      if (effectiveDate && effectiveDate.startsWith(scheduleMonth)) {
        if (!grouped[effectiveDate]) grouped[effectiveDate] = [];
        grouped[effectiveDate].push(t);
      }
    });
    return grouped;
  }, [trips, scheduleMonth]);

  const getTripVehicleNumbers = (trip) => {
    const list = [];
    if (trip?.vehicle_number) list.push(trip.vehicle_number);
    if (Array.isArray(trip?.vehicles)) {
      trip.vehicles.forEach(v => {
        if (v?.vehicle_number) list.push(v.vehicle_number);
      });
    }
    return Array.from(new Set(list));
  };

  /* ✅ GENERATE DATES FROM SELECTED MONTH (NEW) */
  const [year, month] = scheduleMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    `${scheduleMonth}-${String(i + 1).padStart(2, "0")}`
  );

  const vehicleList = vehicles?.length ? vehicles : [];

  const openAddNote = (date, vehicle) => {
    if (!canWrite) return;
    setEditingNoteId(null);
    setNoteText("");
    setNoteDate(date || "");
    setNoteVehicleId(vehicle?.id || null);
    setNoteVehicleNumber(vehicle?.vehicle_number || "");
    setShowNoteModal(true);
  };

  const openEditNote = (note) => {
    if (!canWrite) return;
    const vehicleId = note?.vehicle_id;
    const vehicle = (vehicleList || []).find(v => v.id === vehicleId);
    setEditingNoteId(note?.id || null);
    setNoteText(note?.note || "");
    setNoteDate(note?.note_date || "");
    setNoteVehicleId(vehicleId || null);
    setNoteVehicleNumber(vehicle?.vehicle_number || "");
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!canWrite) return;
    if (!noteDate || !noteVehicleId || !noteText.trim()) {
      alert("Please select date, vehicle, and enter a note.");
      return;
    }
    try {
      const payload = {
        vehicle_id: Number(noteVehicleId),
        note: noteText.trim(),
        note_date: noteDate,
      };
      if (editingNoteId) {
        await api.put(`/vehicle-notes/${editingNoteId}`, payload);
      } else {
        await api.post("/vehicle-notes", payload);
      }
      setShowNoteModal(false);
      setEditingNoteId(null);
      loadNotes();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!canWrite || !noteId) return;
    try {
      await api.delete(`/vehicle-notes/${noteId}`);
      loadNotes();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete note");
    }
  };


  return (
    <>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
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
              <tr key={date} className="group hover:bg-slate-50/40 transition-colors">
                <td className="p-6 font-bold text-slate-600 text-sm whitespace-nowrap bg-white sticky left-0 z-10 border-r border-slate-50 group-hover:bg-slate-50">
                  {formatDateWithDay(date)}
                </td>

                {vehicleList.map(v => (
                  <td
                    key={v.vehicle_number}
                    className="p-4 align-top cursor-pointer border-r border-slate-50 last:border-r-0"
                    onClick={() => openAddNote(date, v)}
                  >
                    <div className="min-h-[60px] flex flex-col gap-2">
                      {(tripsByDate[date] || [])
                        .filter(t => getTripVehicleNumbers(t).includes(v.vehicle_number))
                        .map(t => (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/trips/${t.id}`);
                            }}
                            className="w-full text-left bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100/50 hover:shadow-md hover:border-blue-200 transition-all group/item"
                          >
                            <div className="font-extrabold text-blue-900 text-xs truncate">
                              {t.invoice_number || `INV-${String(t.id).padStart(4, "0")}`}
                            </div>
                            <div className="text-[10px] text-blue-600 font-bold mt-1 opacity-70 group-hover/item:opacity-100">
                              → {t.to_location}
                            </div>
                          </div>
                        ))}

                      {notesByCell[`${date}|${v.id}`] && (
                        <div className="space-y-2 mt-1">
                          {notesByCell[`${date}|${v.id}`].map((n) => (
                            <div key={n.id} className="group/note flex flex-col bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 hover:bg-amber-50 hover:border-amber-300 transition-all">
                              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                                {n.note}
                              </div>
                              {canWrite ? (
                                <div className="flex justify-end gap-3 mt-2 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-800"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditNote(n);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNote(n.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex-1 min-h-[20px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-black text-slate-300 uppercase">+ Add Note</span>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingNoteId ? "Edit Note" : "Add New Note"}</h2>
              <p className="text-slate-500 font-medium text-sm">Update the schedule details for {noteVehicleNumber}</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Note Date</label>
                <input
                  type="date"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  value={noteDate}
                  onChange={e => setNoteDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Vehicle</label>
                <div className="relative group">
                  <select
                    className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all appearance-none"
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
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Your Note</label>
                <textarea
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all resize-none"
                  placeholder="What happened on this day?"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveNote}
                  className="flex-1 h-14 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  {editingNoteId ? "Update Note" : "Save Note"}
                </button>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setEditingNoteId(null);
                  }}
                  className="px-8 h-14 bg-white text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
