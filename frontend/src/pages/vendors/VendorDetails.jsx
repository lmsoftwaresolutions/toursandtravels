import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [fuelHistory, setFuelHistory] = useState([]);
  const [spareHistory, setSpareHistory] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("fuel");
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ amount: "", paid_on: "", notes: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [modalType, setModalType] = useState(null); // 'fuel' or 'spare'
  
  // Fuel form state
  const [fuelForm, setFuelForm] = useState({
    vehicle_number: "",
    fuel_type: "diesel",
    quantity: "",
    rate_per_litre: "",
    filled_date: ""
  });

  // Spare parts form state
  const [spareForm, setSpareForm] = useState({
    vehicle_number: "",
    part_name: "",
    cost: "",
    quantity: 1,
    replaced_date: ""
  });

  useEffect(() => {
    loadVendorData();
    api.get("/vehicles").then(res => setVehicles(res.data));
  }, [id]);

  const loadVendorData = async () => {
    try {
      // Get vendor details
      const vendorRes = await api.get(`/vendors`);
      const vendorData = vendorRes.data.find(v => v.id === Number(id));
      setVendor(vendorData);

      if (!vendorData) return;

      // Set default tab based on vendor category
      if (vendorData.category === "fuel") {
        setActiveTab("fuel");
      } else if (vendorData.category === "spare") {
        setActiveTab("spare");
      }

      // Payments
      const payRes = await api.get(`/vendor-payments/vendor/${id}`);
      setPayments(payRes.data);

      // Only load fuel history for fuel vendors
      if (vendorData.category === "fuel" || vendorData.category === "both") {
        // Get separate fuel entries
        const fuelRes = await api.get("/fuel");
        const fuelEntries = fuelRes.data.filter(f => f.vendor === vendorData.name);

        // Get trips with fuel for this vendor and convert to fuel entries
        const tripRes = await api.get("/trips");
        const tripFuelEntries = tripRes.data
          .filter(t => t.vendor === vendorData.name && (t.diesel_used > 0 || t.petrol_used > 0))
          .map(t => ({
            id: `trip-${t.id}`,
            filled_date: t.trip_date,
            vehicle_number: t.vehicle_number,
            fuel_type: t.diesel_used > 0 ? "diesel" : "petrol",
            quantity: t.diesel_used > 0 ? t.diesel_used : t.petrol_used,
            rate_per_litre: 0,
            total_cost: t.diesel_used > 0 ? t.diesel_used : t.petrol_used,
            vendor: vendorData.name,
            trip_id: t.id
          }));

        // Combine both fuel entries
        setFuelHistory([...fuelEntries, ...tripFuelEntries]);

        // Also set trip history for trips tab
        setTripHistory(tripRes.data.filter(t => t.vendor === vendorData.name));
      }

      // Only load spare parts history for spare vendors
      if (vendorData.category === "spare" || vendorData.category === "both") {
        const spareRes = await api.get("/spare-parts");
        setSpareHistory(spareRes.data.filter(s => s.vendor === vendorData.name));
      }
    } catch (error) {
      console.error("Error loading vendor data:", error);
    }
  };

  const totalFuelCost = fuelHistory.reduce((sum, f) => sum + (Number(f.total_cost) || 0), 0);
  const totalSpareCost = spareHistory.reduce((sum, s) => sum + (Number(s.cost) * Number(s.quantity) || 0), 0);
  const totalOwed = totalFuelCost + totalSpareCost;
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingAmount = Math.max(0, totalOwed - totalPaid);

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.paid_on) return;
    const payload = {
      vendor_id: Number(id),
      amount: Number(payForm.amount),
      paid_on: payForm.paid_on,
      notes: payForm.notes || undefined,
    };
    try {
      await api.post("/vendor-payments", payload);
      alert("Payment recorded successfully");
      const payRes = await api.get(`/vendor-payments/vendor/${id}`);
      setPayments(payRes.data);
      setPayForm({ amount: "", paid_on: "", notes: "" });
    } catch (err) {
      console.error("Payment submit error:", err);
      alert("Error recording payment: " + (err.response?.data?.detail || err.message));
    }
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await api.delete(`/vendor-payments/${paymentId}`);
      const payRes = await api.get(`/vendor-payments/vendor/${id}`);
      setPayments(payRes.data);
    } catch (err) {
      console.error("Delete payment error:", err);
      alert("Error deleting payment: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setModalType(null);
    setFuelForm({
      vehicle_number: "",
      fuel_type: "diesel",
      quantity: "",
      rate_per_litre: "",
      filled_date: ""
    });
    setSpareForm({
      vehicle_number: "",
      part_name: "",
      cost: "",
      quantity: 1,
      replaced_date: ""
    });
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_number: fuelForm.vehicle_number,
        vendor: vendor.name,
        fuel_type: fuelForm.fuel_type,
        quantity: Number(fuelForm.quantity),
        rate_per_litre: Number(fuelForm.rate_per_litre),
        total_cost: Number(fuelForm.quantity) * Number(fuelForm.rate_per_litre),
        filled_date: fuelForm.filled_date
      };
      await api.post("/fuel", payload);
      alert("Fuel entry added successfully");
      handleCloseModal();
      loadVendorData();
    } catch (error) {
      alert("Error adding fuel entry: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleSpareSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_number: spareForm.vehicle_number,
        vendor: vendor.name,
        part_name: spareForm.part_name,
        cost: Number(spareForm.cost),
        quantity: Number(spareForm.quantity),
        replaced_date: spareForm.replaced_date
      };
      await api.post("/spare-parts", payload);
      alert("Spare part entry added successfully");
      handleCloseModal();
      loadVendorData();
    } catch (error) {
      alert("Error adding spare part: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleAddEntryClick = (type) => {
    if (type === "fuel") {
      navigate("/fuel/add");
    } else if (type === "spare") {
      navigate("/spare-parts/add");
    }
    setShowAddModal(false);
  };

  if (!vendor) {
    return (
      <div className="p-6">
        <p>Loading vendor details...</p>
      </div>
    );
  }

  const totalTripFuelCost = tripHistory.reduce((sum, t) => sum + (t.diesel_used || 0) + (t.petrol_used || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/vendors")}
            className="text-blue-600 mb-2 text-sm"
          >
            ← Back to Vendors
          </button>
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <p className="text-gray-600 capitalize">{vendor.category || "N/A"}</p>
        </div>
        <button
          onClick={() => {
            if (vendor.category === "fuel") {
              handleOpenModal("fuel");
            } else if (vendor.category === "spare") {
              handleOpenModal("spare");
            } else if (vendor.category === "both") {
              setShowAddModal(true);
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Entry
        </button>
      </div>

      {/* ADD ENTRY MODAL */}
      {showAddModal && !modalType && vendor.category === "both" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg space-y-3 max-w-sm">
            <h2 className="text-lg font-semibold">Add Entry</h2>
            <p className="text-gray-600 text-sm">Select what you want to add:</p>
            
            <div className="space-y-2">
              <button
                onClick={() => handleOpenModal("fuel")}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Fuel Entry
              </button>
              
              <button
                onClick={() => handleOpenModal("spare")}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Spare Part Entry
              </button>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FUEL ENTRY FORM MODAL */}
      {showAddModal && modalType === "fuel" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add Fuel Entry</h2>
            <form onSubmit={handleFuelSubmit} className="space-y-3">
              <select
                value={fuelForm.vehicle_number}
                onChange={e => setFuelForm({ ...fuelForm, vehicle_number: e.target.value })}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_number} value={v.vehicle_number}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>

              <select
                value={fuelForm.fuel_type}
                onChange={e => setFuelForm({ ...fuelForm, fuel_type: e.target.value })}
                className="w-full border p-2 rounded"
              >
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
              </select>

              <input
                type="number"
                placeholder="Quantity (Litres)"
                value={fuelForm.quantity}
                onChange={e => setFuelForm({ ...fuelForm, quantity: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="number"
                placeholder="Rate per Litre"
                value={fuelForm.rate_per_litre}
                onChange={e => setFuelForm({ ...fuelForm, rate_per_litre: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="date"
                value={fuelForm.filled_date}
                onChange={e => setFuelForm({ ...fuelForm, filled_date: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPARE PART FORM MODAL */}
      {showAddModal && modalType === "spare" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add Spare Part Entry</h2>
            <form onSubmit={handleSpareSubmit} className="space-y-3">
              <select
                value={spareForm.vehicle_number}
                onChange={e => setSpareForm({ ...spareForm, vehicle_number: e.target.value })}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.vehicle_number} value={v.vehicle_number}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Part Name"
                value={spareForm.part_name}
                onChange={e => setSpareForm({ ...spareForm, part_name: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="number"
                placeholder="Cost"
                value={spareForm.cost}
                onChange={e => setSpareForm({ ...spareForm, cost: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <input
                type="number"
                placeholder="Quantity"
                value={spareForm.quantity}
                onChange={e => setSpareForm({ ...spareForm, quantity: e.target.value })}
                className="w-full border p-2 rounded"
              />

              <input
                type="date"
                value={spareForm.replaced_date}
                onChange={e => setSpareForm({ ...spareForm, replaced_date: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-4" style={{gridTemplateColumns: `repeat(${vendor.category === "both" ? 4 : 3}, minmax(250px, 1fr))`}}>
        {(vendor.category === "fuel" || vendor.category === "both") && (
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600">Total Fuel Expenses</p>
            <p className="text-2xl font-bold">₹ {totalFuelCost.toFixed(2)}</p>
          </div>
        )}
        {(vendor.category === "spare" || vendor.category === "both") && (
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600">Total Spare Parts</p>
            <p className="text-2xl font-bold">₹ {totalSpareCost.toFixed(2)}</p>
          </div>
        )}
        {(vendor.category === "fuel" || vendor.category === "both") && (
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600">Trip Fuel Costs</p>
            <p className="text-2xl font-bold">₹ {totalTripFuelCost.toFixed(2)}</p>
          </div>
        )}
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-600">Paid / Pending</p>
          <p className="text-lg font-semibold">Paid: ₹ {totalPaid.toFixed(2)}</p>
          <p className="text-lg font-semibold text-red-600">Pending: ₹ {pendingAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b">
        {(vendor.category === "fuel" || vendor.category === "both") && (
          <button
            onClick={() => setActiveTab("fuel")}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === "fuel"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            Fuel Entries ({fuelHistory.length})
          </button>
        )}
        {(vendor.category === "spare" || vendor.category === "both") && (
          <button
            onClick={() => setActiveTab("spare")}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === "spare"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            Spare Parts ({spareHistory.length})
          </button>
        )}
        {(vendor.category === "fuel" || vendor.category === "both") && (
          <button
            onClick={() => setActiveTab("trips")}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === "trips"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600"
            }`}
          >
            Trips ({tripHistory.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === "payments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600"
          }`}
        >
          Payments ({payments.length})
        </button>
      </div>
      {/* PAYMENTS TAB */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Add Payment</h2>
            <form onSubmit={submitPayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Paid On</label>
                <input
                  type="date"
                  value={payForm.paid_on}
                  onChange={(e) => setPayForm({ ...payForm, paid_on: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Invoice #, UPI, etc."
                />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Payment</button>
            </form>
          </div>

          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 text-left">Paid On</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-gray-500">No payments</td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.paid_on}</td>
                      <td className="p-2">₹ {Number(p.amount).toFixed(2)}</td>
                      <td className="p-2 flex items-center justify-between">
                        <span>{p.notes || "-"}</span>
                        <button onClick={() => deletePayment(p.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FUEL TAB */}
      {activeTab === "fuel" && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Vehicle</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Quantity (L)</th>
                <th className="p-2 text-left">Rate</th>
                <th className="p-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {fuelHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No fuel entries
                  </td>
                </tr>
              ) : (
                fuelHistory.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="p-2">{f.filled_date}</td>
                    <td className="p-2">{f.vehicle_number}</td>
                    <td className="p-2 capitalize">{f.fuel_type}</td>
                    <td className="p-2">{f.quantity}</td>
                    <td className="p-2">₹ {f.rate_per_litre}</td>
                    <td className="p-2">₹ {f.total_cost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SPARE PARTS TAB */}
      {activeTab === "spare" && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Vehicle</th>
                <th className="p-2 text-left">Part</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Cost</th>
                <th className="p-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {spareHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No spare parts
                  </td>
                </tr>
              ) : (
                spareHistory.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.replaced_date}</td>
                    <td className="p-2">{s.vehicle_number}</td>
                    <td className="p-2">{s.part_name}</td>
                    <td className="p-2">{s.quantity}</td>
                    <td className="p-2">₹ {s.cost}</td>
                    <td className="p-2">₹ {(s.cost * s.quantity).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TRIPS TAB */}
      {activeTab === "trips" && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Vehicle</th>
                <th className="p-2 text-left">Route</th>
                <th className="p-2 text-left">Distance</th>
                <th className="p-2 text-left">Fuel Cost</th>
              </tr>
            </thead>
            <tbody>
              {tripHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No trips
                  </td>
                </tr>
              ) : (
                tripHistory.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.trip_date}</td>
                    <td className="p-2">{t.vehicle_number}</td>
                    <td className="p-2">
                      {t.from_location} → {t.to_location}
                    </td>
                    <td className="p-2">{t.distance_km} km</td>
                    <td className="p-2">
                      ₹ {((t.diesel_used || 0) + (t.petrol_used || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
