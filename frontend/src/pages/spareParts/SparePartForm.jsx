import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function SparePartForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // 👈 detect edit mode

  const [vehicles, setVehicles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorCategory, setVendorCategory] = useState("spare"); // Track selected category
  const [form, setForm] = useState({
    vehicle_number: "",
    part_name: "",
    cost: "",
    quantity: 1,
    vendor: "",
    replaced_date: ""
  });

  /* ---------- LOAD VEHICLES ---------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, []);

  /* ---------- LOAD VENDORS BY CATEGORY ---------- */
  useEffect(() => {
    if (vendorCategory) {
      api
        .get("/vendors", { params: { category: vendorCategory } })
        .then(res => setVendors(res.data));
    }
  }, [vendorCategory]);

  /* ---------- LOAD EXISTING DATA (EDIT MODE) ---------- */
  useEffect(() => {
    if (id) {
      api.get(`/spare-parts/${id}`).then(res => {
        setForm({
          vehicle_number: res.data.vehicle_number,
          part_name: res.data.part_name,
          cost: res.data.cost,
          quantity: res.data.quantity,
          vendor: res.data.vendor || "",
          replaced_date: res.data.replaced_date
        });
      });
    }
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();

    const payload = {
      ...form,
      cost: Number(form.cost),
      quantity: Number(form.quantity)
    };

    if (id) {
      // ✏️ EDIT
      await api.put(`/spare-parts/${id}`, payload);
      alert("Spare part updated successfully");
    } else {
      // ➕ ADD
      await api.post("/spare-parts", payload);
      alert("Spare part added successfully");
    }

    navigate("/spare-parts");
  };

  return (
    <div className="p-6 max-w-xl bg-white rounded shadow">
      <h1 className="text-xl font-semibold mb-4">
        {id ? "Edit Spare Part" : "Add Spare Part"}
      </h1>

      <form className="grid gap-3" onSubmit={submit}>
        <select
          name="vehicle_number"
          value={form.vehicle_number}
          onChange={handleChange}
          required
          className="border p-2"
        >
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.vehicle_number} value={v.vehicle_number}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        <input
          name="part_name"
          placeholder="Part Name"
          value={form.part_name}
          onChange={handleChange}
          required
          className="border p-2"
        />

        <input
          name="cost"
          type="number"
          placeholder="Cost"
          value={form.cost}
          onChange={handleChange}
          required
          className="border p-2"
        />

        <input
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={handleChange}
          className="border p-2"
        />

        {/* VENDOR CATEGORY DROPDOWN */}
        <select
          value={vendorCategory}
          onChange={e => setVendorCategory(e.target.value)}
          className="border p-2"
        >
          <option value="spare">Spare Part Vendor</option>
          <option value="fuel">Fuel Vendor</option>
          <option value="both">Both</option>
        </select>

        <div className="flex gap-2">
          <select
            name="vendor"
            value={form.vendor}
            onChange={handleChange}
            className="border p-2 w-full"
          >
            <option value="">Select Vendor</option>
            {vendors.map(v => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => navigate("/vendors")}
            className="bg-gray-200 px-3 rounded"
          >
            + Vendor
          </button>
        </div>

        <input
          name="replaced_date"
          type="date"
          value={form.replaced_date}
          onChange={handleChange}
          required
          className="border p-2"
        />

        <button className="bg-blue-600 text-white py-2 rounded">
          {id ? "Update Spare Part" : "Save Spare Part"}
        </button>
      </form>
    </div>
  );
}
