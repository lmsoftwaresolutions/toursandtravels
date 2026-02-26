import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function Notes() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setEditingNote(note);
    setNoteText(note.note || "");
    setNoteDate(note.note_date || "");
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (!noteDate || !noteText.trim()) return;

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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notes</h1>
        <button
          onClick={openAddNote}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
        >
          + Add Note
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">Date</th>
              <th className="border p-3 text-left">Note</th>
              <th className="border p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 && (
              <tr>
                <td className="border p-4 text-sm text-gray-500" colSpan={3}>
                  No notes for this month.
                </td>
              </tr>
            )}

            {notes.map(n => (
              <tr key={n.id}>
                <td className="border p-3 text-sm">{formatDateDDMMYYYY(n.note_date)}</td>
                <td className="border p-3 text-sm">{n.note}</td>
                <td className="border p-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditNote(n)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded w-[420px]">
            <h3 className="font-semibold mb-3">
              {editingNote ? "Edit Note" : "Add Note"}
            </h3>

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
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
                }}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
