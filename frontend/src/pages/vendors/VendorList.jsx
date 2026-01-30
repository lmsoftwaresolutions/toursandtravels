import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../services/api";

const CATEGORY_OPTIONS = [
  { value: "fuel", label: "Fuel" },
  { value: "spare", label: "Spare Parts" },
  { value: "both", label: "Both" }
];

export default function VendorList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ name: "", category: "fuel" });
  const [filterCategory, setFilterCategory] = useState("fuel");
  const [pageTitle, setPageTitle] = useState("All Vendors");

  // Determine initial filter from URL path
  useEffect(() => {
    if (location.pathname === "/vendors/fuel") {
      setFilterCategory("fuel");
      setPageTitle("Fuel Vendors");
      setForm({ name: "", category: "fuel" });
    } else if (location.pathname === "/vendors/other") {
      setFilterCategory("spare");
      setPageTitle("Other (Spare Parts) Vendors");
      setForm({ name: "", category: "spare" });
    } else {
      setFilterCategory("");
      setPageTitle("All Vendors");
    }
  }, [location.pathname]);

  useEffect(() => {
    loadVendors();
  }, [filterCategory]);

  const loadVendors = async () => {
    const res = await api.get("/vendors", {
      params: filterCategory ? { category: filterCategory } : {}
    });
    setVendors(res.data);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim()) return;

    await api.post("/vendors", form);
    setForm({ name: "", category: form.category });
    loadVendors();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{pageTitle}</h1>

      {/* TABS - Only show on main vendors page */}
      {location.pathname === "/vendors" && (
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setFilterCategory("")}
            className={`px-4 py-2 font-medium border-b-2 ${
              filterCategory === ""
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterCategory("fuel")}
            className={`px-4 py-2 font-medium border-b-2 ${
              filterCategory === "fuel"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            Fuel
          </button>
          <button
            onClick={() => setFilterCategory("spare")}
            className={`px-4 py-2 font-medium border-b-2 ${
              filterCategory === "spare"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            Spare Parts
          </button>
        </div>
      )}

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Add Vendor</h2>
        <form 
          className="grid gap-3 md:grid-cols-[2fr_1fr_auto]" 
          onSubmit={submit}
        >
          <input
            name="name"
            placeholder="Vendor Name"
            value={form.name}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save
          </button>
        </form>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  No vendors found
                </td>
              </tr>
            ) : (
              vendors.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{v.name}</td>
                  <td className="p-2 capitalize">{v.category || "-"}</td>
                  <td className="p-2">
                    <button
                      onClick={() => navigate(`/vendors/${v.id}`)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
