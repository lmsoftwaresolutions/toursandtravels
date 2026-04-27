import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { authService } from "../../services/auth";
import Pagination from "../../components/common/Pagination";

const CATEGORY_OPTIONS = [
  { value: "fuel", label: "Fuel" },
  { value: "spare_parts", label: "Spare Parts" },
  { value: "mechanic", label: "Mechanic" },
  { value: "oil", label: "Oil" },
];

const formatCategoryLabel = (category) => {
  if (category === "mechanic") return "Mechanic";
  return String(category || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function VendorList() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const isAdmin = user?.role === "admin";
  const canWrite = !authService.hasLimitedAccess();
  const [allVendors, setAllVendors] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [form, setForm] = useState({ name: "", phone: "", category: "fuel" });
  const [editingVendor, setEditingVendor] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", category: "fuel" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  const pageConfig = useMemo(() => {
    if (location.pathname === "/vendors/fuel") {
      return { pageTitle: "Fuel Vendors", lockedCategory: "fuel" };
    }
    if (location.pathname === "/vendors/other") {
      return { pageTitle: "Other (Spare Parts) Vendors", lockedCategory: "spare_parts" };
    }
    return { pageTitle: "All Vendors", lockedCategory: "" };
  }, [location.pathname]);

  const effectiveFilterCategory = location.pathname === "/vendors"
    ? filterCategory
    : pageConfig.lockedCategory;
  const activeFormCategory = location.pathname === "/vendors"
    ? form.category
    : pageConfig.lockedCategory || form.category;

  const categoryTabs = useMemo(() => {
    const customTabs = Array.from(
      new Set(
        allVendors
          .map((vendor) => String(vendor.category || "").trim())
          .filter(Boolean)
      )
    )
      .filter((category) => !CATEGORY_OPTIONS.some((option) => option.value === category))
      .map((category) => ({ value: category, label: formatCategoryLabel(category) }));

    return [...CATEGORY_OPTIONS, ...customTabs];
  }, [allVendors]);

  const loadVendors = useCallback(async () => {
    const res = await api.get("/vendors");
    const vendorRows = res.data || [];
    setAllVendors(vendorRows);
    setVendors(
      effectiveFilterCategory
        ? vendorRows.filter((vendor) => vendor.category === effectiveFilterCategory)
        : vendorRows
    );
  }, [effectiveFilterCategory]);

  useEffect(() => {
    const init = async () => {
      await loadVendors();
    };
    init();
  }, [loadVendors]);

  useEffect(() => {
    setCurrentPage(1);
  }, [vendors.length, filterCategory, location.pathname]);

  const paginatedVendors = vendors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const normalizeIndianPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits;
  };

  const isValidIndianPhone = (value) => /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const normalizedPhone = normalizeIndianPhone(form.phone);
    if (form.phone && !isValidIndianPhone(form.phone)) {
      alert("Phone number must be a valid 10-digit Indian mobile number.");
      return;
    }

    const payload = {
      ...form,
      category: activeFormCategory,
      phone: form.phone ? normalizedPhone : ""
    };
    try {
      await api.post("/vendors", payload);
      setForm({ name: "", phone: "", category: activeFormCategory || "fuel" });
      loadVendors();
    } catch (err) {
      alert("Error creating vendor: " + (err.response?.data?.detail || err.message));
    }
  };

  const deleteVendor = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await api.delete(`/vendors/${id}`);
      loadVendors();
    } catch (err) {
      alert("Error deleting vendor: " + (err.response?.data?.detail || err.message));
    }
  };

  const startEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setEditForm({
      name: vendor.name || "",
      phone: vendor.phone || "",
      category: vendor.category || "fuel",
    });
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditingVendor(null);
    setEditForm({ name: "", phone: "", category: "fuel" });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitVendorEdit = async (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    if (!editForm.name.trim()) return;

    const normalizedPhone = normalizeIndianPhone(editForm.phone);
    if (editForm.phone && !isValidIndianPhone(editForm.phone)) {
      alert("Phone number must be a valid 10-digit Indian mobile number.");
      return;
    }

    const payload = {
      name: editForm.name.trim(),
      phone: editForm.phone ? normalizedPhone : "",
      category: editForm.category || "fuel",
    };

    try {
      setSavingEdit(true);
      await api.put(`/vendors/${editingVendor.id}`, payload);
      await loadVendors();
      closeEditModal();
    } catch (err) {
      alert("Error updating vendor: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{pageConfig.pageTitle}</h1>
          <p className="text-slate-500 font-medium mt-1">Manage vendors and payments</p>
        </div>
      </div>

      {/* TABS - Only show on main vendors page */}
      {location.pathname === "/vendors" && (
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
          <button
            onClick={() => setFilterCategory("")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCategory === ""
              ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            All Vendors
          </button>
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterCategory(tab.value)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCategory === tab.value
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="glass-card p-8 rounded-3xl border-l-4 border-l-blue-600">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Add Vendor
        </h2>
        <form
          className="grid gap-4 md:grid-cols-[2fr_1.5fr_1fr_auto]"
          onSubmit={submit}
        >
          <div className="relative group">
            <input
              name="name"
              placeholder="Vendor Name"
              value={form.name}
              onChange={handleChange}
              className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          <div className="relative group">
            <input
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
              className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <select
                name="category"
                value={activeFormCategory}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all appearance-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="h-12 px-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
            Register
          </button>
        </form>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden min-h-[400px]">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 font-black">Vendor</th>
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 font-black">Phone</th>
              <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 font-black">Category</th>
              <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 font-black">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {vendors.length === 0 ? (
              <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No vendor records found</td></tr>
            ) : (
              paginatedVendors.map(v => (
                <tr key={v.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs uppercase group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {v.name.charAt(0)}
                      </div>
                      <span className="text-base font-black text-slate-800 tracking-tight">{v.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-bold text-slate-500">
                    {v.phone || "-"}
                  </td>
                  <td className="p-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      {v.category || "General"}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => navigate(`/vendors/${v.id}`)}
                        className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                      >
                        Open
                      </button>
                      {canWrite && (
                        <button
                          onClick={() => startEditVendor(v)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="Edit Vendor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => deleteVendor(v.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Vendor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={vendors.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {editingVendor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vendor Profile</p>
                <h3 className="text-2xl font-black text-slate-900">Edit Vendor</h3>
              </div>
              <button
                onClick={closeEditModal}
                className="h-10 w-10 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                aria-label="Close edit vendor modal"
                disabled={savingEdit}
              >
                x
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitVendorEdit}>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</label>
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  className="w-full h-12 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all appearance-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-11 px-5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Update Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
