import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Modal from "../../components/common/Modal";

export default function DriverForm() {
  const { id } = useParams(); // present only on /drivers/:id/edit
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    license_number: "",
    joining_date: "",
    monthly_salary: "",
  });

  const [loadingDriver, setLoadingDriver] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, type = "error", onConfirm = null) =>
    setModal({ isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    api.get(`/drivers/${id}`)
      .then((res) => {
        const d = res.data;
        setForm({
          name: d.name || "",
          phone: d.phone || "",
          license_number: d.license_number || "",
          joining_date: d.joining_date || "",
          monthly_salary: d.monthly_salary != null ? String(d.monthly_salary) : "",
        });
      })
      .catch(() => {
        showModal("Error", "Could not load driver details. Please try again.");
      })
      .finally(() => setLoadingDriver(false));
  }, [id, isEditMode]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ── Validators ──────────────────────────────────────────────
  const normalizeIndianPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits;
  };

  const isValidIndianPhone = (value) =>
    /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));

  const normalizeLicenseNumber = (value) =>
    String(value || "").toUpperCase().replace(/[\s-]/g, "");

  const isValidLicenseNumber = (value) =>
    /^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(normalizeLicenseNumber(value));

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const normalizedPhone = normalizeIndianPhone(form.phone);
    const normalizedLicense = normalizeLicenseNumber(form.license_number);

    if (!trimmedName) {
      showModal("Validation Error", "Driver name is required.");
      return;
    }
    if (!isValidIndianPhone(form.phone)) {
      showModal("Validation Error", "Phone number must be a valid 10-digit Indian mobile number.");
      return;
    }
    if (!isValidLicenseNumber(form.license_number)) {
      showModal("Validation Error", "License number must follow format like MH14 20110012345.");
      return;
    }
    if (!form.joining_date) {
      showModal("Validation Error", "Joining date is required.");
      return;
    }
    if (!form.monthly_salary || Number(form.monthly_salary) < 0) {
      showModal("Validation Error", "Please enter a valid monthly salary.");
      return;
    }

    const payload = {
      ...form,
      name: trimmedName,
      phone: normalizedPhone,
      license_number: normalizedLicense,
      monthly_salary: Number(form.monthly_salary),
    };

    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/drivers/${id}`, payload);
        showModal(
          "Success",
          "Driver details updated successfully!",
          "success",
          () => navigate(`/drivers/${id}`)
        );
      } else {
        await api.post("/drivers", payload);
        showModal(
          "Success",
          "Driver registered successfully!",
          "success",
          () => navigate("/drivers")
        );
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      showModal(
        isEditMode ? "Update Error" : "Registration Error",
        detail || (isEditMode
          ? "Failed to update driver. Please try again."
          : "Failed to register driver. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDriver) {
    return (
      <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-sm">
        Loading driver details...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            {isEditMode ? "Edit Driver" : "Driver Registration"}
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">
            {isEditMode ? "Update existing driver information" : "Register a new driver"}
          </p>
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate(`/drivers/${id}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
          >
            ← Back to Profile
          </button>
        )}
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
        {/* Decorative icon */}
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                placeholder="Driver Name"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                placeholder="9876543210"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Driver License Number <span className="text-rose-500">*</span>
              </label>
              <input
                name="license_number"
                value={form.license_number}
                placeholder="MH14 20110012345"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value.toUpperCase() })
                }
                maxLength={20}
                required
              />
            </div>

            {/* Joining Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Joining Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="joining_date"
                value={form.joining_date}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                onChange={handleChange}
                required
              />
            </div>

            {/* Monthly Salary */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Monthly Salary (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="monthly_salary"
                value={form.monthly_salary}
                placeholder="0.00"
                className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                onChange={handleChange}
                onWheel={(e) => e.currentTarget.blur()}
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(isEditMode ? `/drivers/${id}` : "/drivers")}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {isEditMode ? "Saving..." : "Registering..."}
                </>
              ) : (
                isEditMode ? "Save Changes" : "Save Driver"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.onConfirm ? modal.onConfirm : closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
