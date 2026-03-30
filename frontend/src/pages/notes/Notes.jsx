import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";
import { authService } from "../../services/auth";

export default function Notes() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const canWrite = !authService.hasLimitedAccess();

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");

  useEffect(() => {
    setLoading(false);
  }, []);

  const loadNotes = () => {
    if (!selectedMonth) return;
    api.get("/dashboard-notes", {
      params: {
        month: selectedMonth
      }
    })
      .then(res => {
        setNotes(res.data || []);
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to load notes");
      });
  };

  useEffect(() => {
    loadNotes();
  }, [selectedMonth]);

  const openAddNote = () => {
    setEditingNote(null);
    setNoteText("");
    setNoteDate(`${selectedMonth}-01`);
    setShowNoteModal(true);
  };

  const openEditNote = (note) => {
    if (!canWrite) return;
    setEditingNote(note);
    setNoteText(note.note || "");
    setNoteDate(note.note_date || "");
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (!noteDate || !noteText.trim()) return;
    if (editingNote && !canWrite) return;

    const noteMonth = noteDate.slice(0, 7);
    const payload = {
      note: noteText.trim(),
      note_date: noteDate
    };

    const request = editingNote
      ? api.put(`/dashboard-notes/${editingNote.id}`, {
          note: payload.note,
          note_date: payload.note_date
        })
      : api.post("/dashboard-notes", payload);

    request
      .then(() => {
        setShowNoteModal(false);
        setEditingNote(null);
        setNoteText("");
        setNoteDate("");
        if (noteMonth !== selectedMonth) {
          setSelectedMonth(noteMonth);
        } else {
          loadNotes();
        }
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to save note");
      });
  };

  const handleDeleteNote = (noteId) => {
    if (!noteId) return;
    api.delete(`/dashboard-notes/${noteId}`)
      .then(() => {
        loadNotes();
      })
      .catch(err => {
        alert(err?.response?.data?.detail || "Failed to delete note");
      });
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading notes...</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Notes</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Centralized Tactical Observations & Directives</p>
        </div>
        <button
          onClick={openAddNote}
          className="h-12 px-8 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          New Notes
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm font-black text-slate-700 outline-none focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-100 bg-white shadow-2xl shadow-slate-200/50">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Date</th>
              <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Content</th>
              <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {notes.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Data Add Yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              notes.map(n => (
                <tr key={n.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <span className="text-sm font-black text-slate-400 tabular-nums">{formatDateDDMMYYYY(n.note_date)}</span>
                  </td>
                  <td className="p-6">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-xl">{n.note}</p>
                  </td>
                  <td className="p-6">
                    {canWrite ? (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditNote(n)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] w-[500px] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8">
              {editingNote ? "Refine Intelligence" : "Broadcast Directive"}
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observation Timestamp</label>
                <input
                  type="date"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  value={noteDate}
                  onChange={e => setNoteDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Intel Metadata (Note Text)</label>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 min-h-[150px] resize-none"
                  placeholder="Enter detailed observation data..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
                }}
                className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-slate-900/20 active:scale-[0.98]"
              >
                Seal Directive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
