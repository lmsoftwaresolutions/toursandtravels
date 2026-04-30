import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import api from "../../services/api";

const getTodayISO = () => new Date().toISOString().split("T")[0];

const makeEmptyRow = () => ({
  vehicle_number: "",
  particular_name: "",
  liters: "",
  rate: "",
  note: "",
});

const calculateRowTotal = (row) => Number(row.liters || 0) * Number(row.rate || 0);

export default function OilBillForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [vendors, setVendors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    vendor_id: "",
    bill_number: "",
    bill_date: getTodayISO(),
    payment_status: "unpaid",
    payment_mode: "",
    overall_note: "",
    entries: [makeEmptyRow()],
  });

  useEffect(() => {
    const loadBase = async () => {
      const [vendorRes, vehicleRes] = await Promise.all([
        api.get("/vendors", { params: { category: "oil" } }),
        api.get("/vehicles"),
      ]);
      setVendors(vendorRes.data || []);
      setVehicles(vehicleRes.data || []);

      const vendorIdFromQuery = Number(searchParams.get("vendor_id"));
      if (!isEdit && Number.isFinite(vendorIdFromQuery) && vendorIdFromQuery > 0) {
        setForm((prev) => ({ ...prev, vendor_id: String(vendorIdFromQuery) }));
      }
    };

    loadBase().catch(() => {
      alert("Failed to load form data");
    });
  }, [isEdit, searchParams]);

  useEffect(() => {
    if (!isEdit) return;
    const loadBill = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/oil-bills/${id}`);
        const bill = res.data || {};
        setForm({
          vendor_id: String(bill.vendor_id || ""),
          bill_number: bill.bill_number || "",
          bill_date: bill.bill_date || getTodayISO(),
          payment_status: bill.payment_status || "unpaid",
          payment_mode: bill.payment_mode || "",
          overall_note: bill.overall_note || "",
          entries: (bill.entries || []).length
            ? bill.entries
              .sort((a, b) => Number(a.row_order || 0) - Number(b.row_order || 0))
              .map((entry) => ({
                vehicle_number: entry.vehicle_number || "",
                particular_name: entry.particular_name || "",
                liters: String(entry.liters ?? ""),
                rate: String(entry.rate ?? ""),
                note: entry.note || "",
              }))
            : [makeEmptyRow()],
        });
      } catch {
        alert("Failed to load oil bill");
      } finally {
        setLoading(false);
      }
    };
    loadBill();
  }, [id, isEdit]);

  const grandTotal = useMemo(
    () => form.entries.reduce((sum, row) => sum + calculateRowTotal(row), 0),
    [form.entries]
  );

  const handleMainChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (index, name, value) => {
    setForm((prev) => {
      const updated = [...prev.entries];
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, entries: updated };
    });
  };

  const addRow = () => {
    setForm((prev) => ({ ...prev, entries: [...prev.entries, makeEmptyRow()] }));
  };

  const removeRow = (index) => {
    setForm((prev) => {
      if (prev.entries.length <= 1) return prev;
      return { ...prev, entries: prev.entries.filter((_, idx) => idx !== index) };
    });
  };

  const validate = () => {
    if (!form.vendor_id) return "Vendor is required";
    if (!String(form.bill_number || "").trim()) return "Bill number is required";
    if (!form.bill_date) return "Bill date is required";
    if (!form.entries.length) return "At least one vehicle entry is required";

    for (let i = 0; i < form.entries.length; i += 1) {
      const row = form.entries[i];
      if (!row.vehicle_number) return `Vehicle is required in row ${i + 1}`;
      if (!String(row.particular_name || "").trim()) return `Particular name is required in row ${i + 1}`;
      if (Number(row.liters || 0) <= 0) return `Liters must be greater than zero in row ${i + 1}`;
      if (Number(row.rate || 0) <= 0) return `Rate must be greater than zero in row ${i + 1}`;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    const payload = {
      vendor_id: Number(form.vendor_id),
      bill_number: String(form.bill_number || "").trim(),
      bill_date: form.bill_date,
      payment_status: form.payment_status || "unpaid",
      payment_mode: String(form.payment_mode || "").trim() || null,
      overall_note: String(form.overall_note || "").trim() || null,
      entries: form.entries.map((row) => ({
        vehicle_number: row.vehicle_number,
        particular_name: String(row.particular_name || "").trim(),
        liters: Number(row.liters || 0),
        rate: Number(row.rate || 0),
        note: String(row.note || "").trim() || null,
      })),
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await api.put(`/oil-bills/${id}`, payload);
      } else {
        await api.post("/oil-bills", payload);
      }
      navigate("/oil");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to save oil bill");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading oil bill...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800">{isEdit ? "Edit Oil Bill" : "Create Oil Bill"}</h1>
        <button
          onClick={() => navigate("/oil")}
          className="h-11 px-5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass-card p-8 rounded-3xl border-l-4 border-l-blue-600 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</label>
            <select
              value={form.vendor_id}
              onChange={(e) => handleMainChange("vendor_id", e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              required
            >
              <option value="">Select Oil Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Number</label>
            <input
              value={form.bill_number}
              onChange={(e) => handleMainChange("bill_number", e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Date</label>
            <input
              type="date"
              value={form.bill_date}
              onChange={(e) => handleMainChange("bill_date", e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status</label>
            <select
              value={form.payment_status}
              onChange={(e) => handleMainChange("payment_status", e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              required
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Mode</label>
            <input
              value={form.payment_mode}
              onChange={(e) => handleMainChange("payment_mode", e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              placeholder="Cash / UPI / Bank / Credit"
            />
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overall Note</label>
            <textarea
              value={form.overall_note}
              onChange={(e) => handleMainChange("overall_note", e.target.value)}
              className="w-full min-h-[96px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
              placeholder="Add any overall bill notes..."
            />
          </div>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">Vehicle Entries</h2>
            <button
              type="button"
              onClick={addRow}
              className="h-11 px-5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
            >
              Add More
            </button>
          </div>
          <div className="p-6 space-y-6">
            {form.entries.map((row, index) => {
              const rowTotal = calculateRowTotal(row);
              return (
                <div key={`oil-row-${index}`} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</label>
                      <select
                        value={row.vehicle_number}
                        onChange={(e) => handleRowChange(index, "vehicle_number", e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                        required
                      >
                        <option value="">Select</option>
                        {vehicles.map((v) => (
                          <option key={v.vehicle_number} value={v.vehicle_number}>
                            {v.vehicle_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Particular Name</label>
                      <input
                        value={row.particular_name}
                        onChange={(e) => handleRowChange(index, "particular_name", e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                        placeholder="Engine Oil / Coolant / Grease"
                        required
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liters</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.liters}
                        onChange={(e) => handleRowChange(index, "liters", e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                        required
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rate</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) => handleRowChange(index, "rate", e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                        required
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Row Total</label>
                      <div className="h-11 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-700 flex items-center">
                        Rs. {rowTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Row Note</label>
                      <input
                        value={row.note}
                        onChange={(e) => handleRowChange(index, "note", e.target.value)}
                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                        placeholder="Optional note for this row"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={form.entries.length <= 1}
                      className="h-11 px-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-lg font-black text-slate-800">
            Grand Total Bill Amount: <span className="text-blue-700">Rs. {grandTotal.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="h-12 px-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
          >
            {submitting ? "Saving..." : isEdit ? "Update Bill" : "Save Bill"}
          </button>
        </div>
      </form>
    </div>
  );
}
