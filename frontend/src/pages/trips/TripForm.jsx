import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function TripForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showOtherVendor, setShowOtherVendor] = useState(false);
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", notes: "" });

  const [form, setForm] = useState({
    trip_date: "",
    departure_datetime: "",
    return_datetime: "",
    from_location: "",
    to_location: "",
    route_details: "",
    vehicle_number: "",
    driver_id: "",
    customer_id: "",
    distance_km: "",
    fuel_cost: "",
    toll_amount: "",
    parking_amount: "",
    other_expenses: "",
    cost_per_km: "",
    charged_toll_amount: "",
    charged_parking_amount: "",
    advance_payment: "",
    amount_received: "",
    pricing_type: "per_km",
    package_amount: "",
    vendor: "",
    invoice_number: "",
  });

  /* ---------------- LOAD DROPDOWNS ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/drivers").then(res => setDrivers(res.data));
    api.get("/customers").then(res => setCustomers(res.data));
    api.get("/vendors", { params: { category: "fuel" } }).then(res => setVendors(res.data));
  }, []);

  /* ---------------- LOAD TRIP (EDIT MODE) ---------------- */
  useEffect(() => {
    if (isEdit) {
      api.get(`/trips/${id}`).then(res => {
        const data = res.data;

        setForm({
          trip_date: data.trip_date,
          departure_datetime: data.departure_datetime ? data.departure_datetime.slice(0, 16) : "",
          return_datetime: data.return_datetime ? data.return_datetime.slice(0, 16) : "",
          from_location: data.from_location,
          to_location: data.to_location,
          route_details: data.route_details || "",
          vehicle_number: data.vehicle_number,
          driver_id: String(data.driver_id),
          customer_id: String(data.customer_id),
          distance_km: data.distance_km,
          fuel_cost: (data.diesel_used || data.petrol_used || ""),
          toll_amount: data.toll_amount || "",
          parking_amount: data.parking_amount || "",
          other_expenses: data.other_expenses || "",
          cost_per_km: data.cost_per_km || "",
          charged_toll_amount: data.charged_toll_amount || "",
          charged_parking_amount: data.charged_parking_amount || "",
          advance_payment: data.advance_payment || "",
          amount_received: data.amount_received || "",
          pricing_type: data.pricing_type || "per_km",
          package_amount: data.package_amount || "",
          vendor: data.vendor || "",
          invoice_number: data.invoice_number || "",
        });

        if (data.vendor && !vendors.find(v => v.name === data.vendor)) {
          setShowOtherVendor(true);
        }
      });

      // Load driver expenses for this trip
      api.get(`/driver-expenses/trip/${id}`).then(res => {
        // Mark existing expenses as saved so they won't be re-saved
        setDriverExpenses(res.data.map(exp => ({ ...exp, saved: true })));
      }).catch(() => {
        setDriverExpenses([]);
      });
    }
  }, [id, isEdit, vendors]);

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "vendor" && value === "other") {
      setShowOtherVendor(true);
      setForm({ ...form, vendor: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  /* ---------------- DRIVER EXPENSE HANDLERS ---------------- */
  const addDriverExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      alert("Please enter description and amount");
      return;
    }
    setDriverExpenses([...driverExpenses, { ...newExpense, id: Date.now() }]);
    setNewExpense({ description: "", amount: "", notes: "" });
  };

  const removeDriverExpense = (index) => {
    setDriverExpenses(driverExpenses.filter((_, i) => i !== index));
  };

  const totalDriverExpenses = driverExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      trip_date: form.trip_date,
      departure_datetime: form.departure_datetime || null,
      return_datetime: form.return_datetime || null,
      from_location: form.from_location,
      to_location: form.to_location,
      route_details: form.route_details || null,
      vehicle_number: form.vehicle_number,
      driver_id: Number(form.driver_id),
      customer_id: Number(form.customer_id),
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      diesel_used: Number(form.fuel_cost || 0),
      petrol_used: 0,
      toll_amount: Number(form.toll_amount || 0),
      parking_amount: Number(form.parking_amount || 0),
      other_expenses: Number(form.other_expenses || 0),
      pricing_type: form.pricing_type,
      package_amount: Number(form.package_amount || 0),
      cost_per_km: Number(form.cost_per_km || 0),
      charged_toll_amount: Number(form.charged_toll_amount || 0),
      charged_parking_amount: Number(form.charged_parking_amount || 0),
      advance_payment: Number(form.advance_payment || 0),
      amount_received: Number(form.amount_received || 0),
      vendor: form.vendor || null,
      invoice_number: form.invoice_number || null,
    };

    try {
      let tripId;
      if (isEdit) {
        await api.put(`/trips/${id}`, payload);
        tripId = id;
        alert("Trip updated successfully");
      } else {
        const res = await api.post("/trips", payload);
        tripId = res.data.id;
        alert("Trip created successfully");
      }

      // Save driver expenses
      for (const expense of driverExpenses) {
        if (!expense.saved) {  // Only save new expenses
          await api.post("/driver-expenses", {
            trip_id: Number(tripId),
            driver_id: Number(form.driver_id),
            description: expense.description,
            amount: Number(expense.amount),
            notes: expense.notes || null,
          });
        }
      }

      navigate("/trips");
    } catch (error) {
      alert("Error saving trip: " + (error.response?.data?.detail || error.message));
    }
  };

  const totalBillValue =
    form.pricing_type === "package"
      ? Number(form.package_amount || 0)
      : Number(form.distance_km || 0) * Number(form.cost_per_km || 0);

  const totalBill = totalBillValue.toFixed(2);
  const pending = Math.max(totalBillValue - Number(form.amount_received || 0), 0).toFixed(2);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border-t-4 border-blue-600">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">TRAVEL INVOICE</h1>
                <p className="text-blue-100 mt-1">Tour & Travel Management</p>
              </div>
              <div className="text-right">
                <label className="text-sm text-blue-100 block">Invoice Number <span className="text-red-300 font-bold">*</span></label>
                <input
                  type="text"
                  name="invoice_number"
                  value={form.invoice_number}
                  onChange={handleChange}
                  placeholder="Enter invoice number"
                  required
                  className="text-2xl font-bold text-white bg-blue-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* INVOICE DATE & CUSTOMER */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="trip_date"
                  value={form.trip_date}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DEPARTURE & RETURN */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Journey Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Departure Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="departure_datetime"
                    value={form.departure_datetime}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Return Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="return_datetime"
                    value={form.return_datetime}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* ROUTE DETAILS */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From Location <span className="text-red-500">*</span>
                </label>
                <input
                  name="from_location"
                  value={form.from_location}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="Starting point"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  To Location <span className="text-red-500">*</span>
                </label>
                <input
                  name="to_location"
                  value={form.to_location}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="Destination"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Route Details / Stops
              </label>
              <textarea
                name="route_details"
                value={form.route_details}
                onChange={handleChange}
                rows="3"
                className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter intermediate stops or route details..."
              />
            </div>

            {/* VEHICLE & DRIVER */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  name="vehicle_number"
                  value={form.vehicle_number}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_number} value={v.vehicle_number}>
                      {v.vehicle_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Driver <span className="text-red-500">*</span>
                </label>
                <select
                  name="driver_id"
                  value={form.driver_id}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Distance (KM) {form.pricing_type === "per_km" && <span className="text-red-500">*</span>}
                  {form.pricing_type === "package" && <span className="text-xs text-gray-500">(optional - for efficiency tracking)</span>}
                </label>
                <input
                  type="number"
                  name="distance_km"
                  value={form.distance_km}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={form.pricing_type === "per_km"}
                  placeholder={form.pricing_type === "package" ? "Approx. distance for efficiency tracking" : "0"}
                />
              </div>
            </div>

            {/* PRICING */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3">Pricing Details</h3>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pricing Type
                  </label>
                  <select
                    name="pricing_type"
                    value={form.pricing_type}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="per_km">Per KM</option>
                    <option value="package">Package Amount</option>
                  </select>
                </div>

                {form.pricing_type === "per_km" ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rate per KM <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="cost_per_km"
                      value={form.cost_per_km}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="₹ 0.00"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Package Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="package_amount"
                      value={form.package_amount}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="₹ 0.00"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount_received"
                    value={form.amount_received}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-green-50"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Advance Payment
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="advance_payment"
                    value={form.advance_payment}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-yellow-50"
                    placeholder="₹ 0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Charged Toll
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="charged_toll_amount"
                    value={form.charged_toll_amount}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Charged Parking
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="charged_parking_amount"
                    value={form.charged_parking_amount}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            {/* EXPENSES */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Expense Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="fuel_cost"
                    value={form.fuel_cost}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Vendor
                  </label>
                  {showOtherVendor ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="vendor"
                        placeholder="Enter vendor name"
                        value={form.vendor}
                        onChange={handleChange}
                        className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtherVendor(false);
                          setForm({ ...form, vendor: "" });
                        }}
                        className="bg-gray-300 hover:bg-gray-400 px-3 rounded-lg text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      name="vendor"
                      value={form.vendor}
                      onChange={handleChange}
                      className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                      <option value="other">Other (Enter manually)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Expenses
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="other_expenses"
                    value={form.other_expenses}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            {/* DRIVER EXPENSES */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-gray-800 mb-3">Driver Expenses (Line Items)</h3>
              <p className="text-xs text-gray-600 mb-3">
                Add expenses incurred by driver during the trip (e.g., police fine, road tax, tolls paid by driver)
              </p>
              
              {/* Add New Expense */}
              <div className="bg-white p-3 rounded border border-gray-300 mb-3">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Description (e.g., Police Fine)"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={addDriverExpense}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 w-full rounded font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* List of Expenses */}
              {driverExpenses.length > 0 && (
                <div className="space-y-2">
                  {driverExpenses.map((exp, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{exp.description}</p>
                        {exp.notes && <p className="text-xs text-gray-500">{exp.notes}</p>}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-bold text-orange-600">₹ {Number(exp.amount).toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => removeDriverExpense(idx)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-orange-100 p-3 rounded border-2 border-orange-300 flex justify-between items-center">
                    <p className="font-bold text-gray-800">Total Driver Expenses:</p>
                    <p className="font-bold text-orange-700 text-lg">₹ {totalDriverExpenses.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* BILLING SUMMARY */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-300">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Billing Summary</h3>
              <p className="text-xs text-gray-600 mb-3">
                Note: Toll & parking paid on spot are not included in total bill
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Total Bill</p>
                  <p className="text-2xl font-bold text-blue-600">₹ {totalBill}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Advance Payment</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ₹ {Number(form.advance_payment || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹ {pending}</p>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/trips")}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 rounded-lg shadow-lg transition duration-200"
              >
                {isEdit ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
