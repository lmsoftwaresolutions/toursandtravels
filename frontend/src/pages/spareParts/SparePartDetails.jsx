import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function SparePartDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sparePart, setSparePart] = useState(null);
  const [allSpareParts, setAllSpareParts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    vehicle_number: "",
    part_name: "",
    cost: "",
    quantity: 1,
    vendor: "",
    replaced_date: ""
  });

  /* ---------- LOAD SPARE PART DATA ---------- */
  useEffect(() => {
    loadSparePartData();
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/vendors", { params: { category: "spare" } }).then(res => setVendors(res.data));
  }, [id]);

  const loadSparePartData = async () => {
    const res = await api.get(`/spare-parts/${id}`);
    setSparePart(res.data);

    // Load all spare parts for this part name to show related entries
    const allRes = await api.get("/spare-parts");
    setAllSpareParts(allRes.data.filter(sp => sp.part_name === res.data.part_name));
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();

    const payload = {
      vehicle_number: newEntry.vehicle_number || sparePart.vehicle_number,
      part_name: sparePart.part_name,
      cost: Number(newEntry.cost),
      quantity: Number(newEntry.quantity),
      vendor: newEntry.vendor || sparePart.vendor,
      replaced_date: newEntry.replaced_date
    };

    try {
      await api.post("/spare-parts", payload);
      alert("New entry added successfully");
      setShowAddForm(false);
      setNewEntry({
        vehicle_number: "",
        part_name: "",
        cost: "",
        quantity: 1,
        vendor: "",
        replaced_date: ""
      });
      loadSparePartData();
    } catch (error) {
      alert("Error adding entry: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/spare-parts/${entryId}`);
      alert("Entry deleted successfully");
      loadSparePartData();
    } catch (error) {
      alert("Error deleting entry");
    }
  };

  if (!sparePart) {
    return (
      <div className="p-6">
        <p>Loading spare part details...</p>
      </div>
    );
  }

  const totalCost = allSpareParts.reduce((sum, sp) => sum + (sp.cost * sp.quantity), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/spare-parts")}
            className="text-blue-600 mb-2 text-sm"
          >
            ← Back to Spare Parts
          </button>
          <h1 className="text-2xl font-bold">{sparePart.part_name}</h1>
          <p className="text-gray-600">Vehicle: {sparePart.vehicle_number}</p>
        </div>
        <button
          onClick={() => navigate("/spare-parts/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add New Spare Part
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(250px, 1fr))" }}>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Entries</p>
          <p className="text-2xl font-bold">{allSpareParts.length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Unit Cost</p>
          <p className="text-2xl font-bold">₹ {sparePart.cost.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Total Cost</p>
          <p className="text-2xl font-bold">₹ {totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* ADD NEW ENTRY BUTTON */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showAddForm ? "Cancel" : "+ Add Entry"}
        </button>
      </div>

      {/* ADD NEW ENTRY FORM */}
      {showAddForm && (
        <div className="bg-white p-6 rounded shadow space-y-3">
          <h2 className="text-lg font-semibold">Add New Entry</h2>
          <form onSubmit={handleAddEntry} className="space-y-3">
            <select
              value={newEntry.vehicle_number}
              onChange={e => setNewEntry({ ...newEntry, vehicle_number: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Vehicle (or use {sparePart.vehicle_number})</option>
              {vehicles.map(v => (
                <option key={v.vehicle_number} value={v.vehicle_number}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Cost"
              value={newEntry.cost}
              onChange={e => setNewEntry({ ...newEntry, cost: e.target.value })}
              required
              className="w-full border p-2 rounded"
            />

            <input
              type="number"
              placeholder="Quantity"
              value={newEntry.quantity}
              onChange={e => setNewEntry({ ...newEntry, quantity: e.target.value })}
              className="w-full border p-2 rounded"
            />

            <select
              value={newEntry.vendor}
              onChange={e => setNewEntry({ ...newEntry, vendor: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Vendor (or use {sparePart.vendor || "None"})</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={newEntry.replaced_date}
              onChange={e => setNewEntry({ ...newEntry, replaced_date: e.target.value })}
              required
              className="w-full border p-2 rounded"
            />

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded"
            >
              Add Entry
            </button>
          </form>
        </div>
      )}

      {/* ENTRIES TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Vehicle</th>
              <th className="p-2 text-left">Cost</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Vendor</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allSpareParts.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No entries found
                </td>
              </tr>
            ) : (
              allSpareParts.map(sp => (
                <tr key={sp.id} className="border-t">
                  <td className="p-2">{formatDateDDMMYYYY(sp.replaced_date)}</td>
                  <td className="p-2">{sp.vehicle_number}</td>
                  <td className="p-2">₹ {sp.cost.toFixed(2)}</td>
                  <td className="p-2">{sp.quantity}</td>
                  <td className="p-2">₹ {(sp.cost * sp.quantity).toFixed(2)}</td>
                  <td className="p-2">{sp.vendor || "-"}</td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => navigate(`/spare-parts/edit/${sp.id}`)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(sp.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
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
