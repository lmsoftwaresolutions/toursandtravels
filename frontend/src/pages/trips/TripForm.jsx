import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

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
  const [pricingItems, setPricingItems] = useState([]);
  const [newPricingItem, setNewPricingItem] = useState({ description: "", amount: "" });
  const [chargeItems, setChargeItems] = useState([]);
  const [newChargeItem, setNewChargeItem] = useState({ description: "", amount: "" });
  const [driverChanges, setDriverChanges] = useState([]);
  const [newDriverChange, setNewDriverChange] = useState({ driver_id: "", start_time: "", end_time: "", notes: "" });
  const [advancePayments, setAdvancePayments] = useState([]);
  const [newAdvance, setNewAdvance] = useState({ payment_date: "", payment_mode: "Cash", amount: "", notes: "" });

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
    start_km: "",
    end_km: "",
    distance_km: "",
    fuel_rate: "",
    fuel_cost: "",
    fuel_litres: "",
    toll_amount: "",
    parking_amount: "",
    other_expenses: "",
    driver_bhatta: "",
    cost_per_km: "",
    charged_toll_amount: "",
    charged_parking_amount: "",
    discount_amount: "",
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
          start_km: data.start_km ?? "",
          end_km: data.end_km ?? "",
          distance_km: data.distance_km,
          fuel_rate: data.fuel_litres
            ? ((data.diesel_used || data.petrol_used || 0) / data.fuel_litres).toFixed(2)
            : "",
          fuel_cost: (data.diesel_used || data.petrol_used || ""),
          fuel_litres: data.fuel_litres || "",
          toll_amount: data.toll_amount || "",
          parking_amount: data.parking_amount || "",
          other_expenses: data.other_expenses || "",
          driver_bhatta: data.driver_bhatta || "",
          cost_per_km: data.cost_per_km || "",
          charged_toll_amount: data.charged_toll_amount || "",
          charged_parking_amount: data.charged_parking_amount || "",
          discount_amount: data.discount_amount || "",
          amount_received: data.amount_received || "",
          pricing_type: data.pricing_type || "per_km",
          package_amount: data.package_amount || "",
          vendor: data.vendor || "",
          invoice_number: data.invoice_number || "",
        });

        const allItems = data.pricing_items || [];
        setPricingItems(allItems.filter(i => i.item_type !== "charge"));
        setChargeItems(allItems.filter(i => i.item_type === "charge"));
        setDriverChanges(data.driver_changes || []);

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

  /* ---------------- PRICING ITEMS ---------------- */
  const addPricingItem = () => {
    if (!newPricingItem.description) {
      alert("Please enter pricing description");
      return;
    }
    setPricingItems([...pricingItems, { ...newPricingItem, id: Date.now() }]);
    setNewPricingItem({ description: "", amount: "" });
  };

  const removePricingItem = (index) => {
    setPricingItems(pricingItems.filter((_, i) => i !== index));
  };

  const addChargeItem = () => {
    if (!newChargeItem.description) {
      alert("Please enter charge description");
      return;
    }
    setChargeItems([...chargeItems, { ...newChargeItem, id: Date.now() }]);
    setNewChargeItem({ description: "", amount: "" });
  };

  const removeChargeItem = (index) => {
    setChargeItems(chargeItems.filter((_, i) => i !== index));
  };

  /* ---------------- DRIVER CHANGES ---------------- */
  const addDriverChange = () => {
    if (!newDriverChange.driver_id) {
      alert("Please select driver");
      return;
    }
    setDriverChanges([...driverChanges, { ...newDriverChange, id: Date.now() }]);
    setNewDriverChange({ driver_id: "", start_time: "", end_time: "", notes: "" });
  };

  const removeDriverChange = (index) => {
    setDriverChanges(driverChanges.filter((_, i) => i !== index));
  };

  /* ---------------- ADVANCE PAYMENTS ---------------- */
  const addAdvancePayment = () => {
    if (!newAdvance.amount) {
      alert("Please enter amount");
      return;
    }
    setAdvancePayments([...advancePayments, { ...newAdvance, id: Date.now() }]);
    setNewAdvance({ payment_date: "", payment_mode: "Cash", amount: "", notes: "" });
  };

  const removeAdvancePayment = (index) => {
    setAdvancePayments(advancePayments.filter((_, i) => i !== index));
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    let vendorName = form.vendor ? String(form.vendor).trim() : "";

    if (showOtherVendor && vendorName) {
      const existing = vendors.find(
        v => String(v.name || "").trim().toLowerCase() === vendorName.toLowerCase()
      );

      if (!existing) {
        try {
          const createRes = await api.post("/vendors", {
            name: vendorName,
            category: "fuel",
          });
          vendorName = createRes.data?.name || vendorName;
          setVendors(prev => [...prev, createRes.data].filter(Boolean));
        } catch (err) {
          const detail = err.response?.data?.detail || err.message;
          alert("Error creating vendor: " + detail);
          return;
        }
      }
    }

    const computedFuelCost = Number(form.fuel_litres || 0) * Number(form.fuel_rate || 0);
    const fuelCostTotal = computedFuelCost || Number(form.fuel_cost || 0);
    const startKm = Number(form.start_km || 0);
    const endKm = Number(form.end_km || 0);
    const derivedDistance = startKm && endKm ? Math.max(endKm - startKm, 0) : null;
    const distanceKmValue =
      form.distance_km !== "" ? Number(form.distance_km) : derivedDistance;

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
      start_km: form.start_km !== "" ? Number(form.start_km) : null,
      end_km: form.end_km !== "" ? Number(form.end_km) : null,
      distance_km: distanceKmValue ?? null,
      diesel_used: fuelCostTotal,
      petrol_used: 0,
      fuel_litres: Number(form.fuel_litres || 0),
      toll_amount: Number(form.toll_amount || 0),
      parking_amount: Number(form.parking_amount || 0),
      other_expenses: Number(form.other_expenses || 0),
      driver_bhatta: Number(form.driver_bhatta || 0),
      pricing_type: form.pricing_type,
      package_amount: Number(form.package_amount || 0),
      cost_per_km: Number(form.cost_per_km || 0),
      charged_toll_amount: Number(form.charged_toll_amount || 0),
      charged_parking_amount: Number(form.charged_parking_amount || 0),
      discount_amount: Number(form.discount_amount || 0),
      amount_received: totalReceived,
      vendor: vendorName || null,
      invoice_number: form.invoice_number || null,
      pricing_items: pricingItems.map(i => ({
        description: i.description,
        quantity: 1,
        rate: 0,
        amount: Number(i.amount || 0),
        item_type: "pricing"
      })),
      charge_items: chargeItems.map(i => ({
        description: i.description,
        quantity: 1,
        rate: 0,
        amount: Number(i.amount || 0),
        item_type: "charge"
      })),
      driver_changes: driverChanges.map(dc => ({
        driver_id: Number(dc.driver_id),
        start_time: dc.start_time || null,
        end_time: dc.end_time || null,
        notes: dc.notes || null
      }))
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

      // Save advance payments (multiple)
      for (const payment of advancePayments) {
        await api.post("/payments", {
          trip_id: Number(tripId),
          payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString() : new Date().toISOString(),
          payment_mode: payment.payment_mode || "Cash",
          amount: Number(payment.amount),
          notes: payment.notes || null,
        });
      }

      navigate("/trips");
    } catch (error) {
      alert("Error saving trip: " + (error.response?.data?.detail || error.message));
    }
  };

  const pricingItemsTotal = pricingItems.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );
  const chargeItemsTotal = chargeItems.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  const basePricing =
    pricingItems.length > 0
      ? pricingItemsTotal
      : (form.pricing_type === "package"
          ? Number(form.package_amount || 0)
          : Number(form.distance_km || 0) * Number(form.cost_per_km || 0));

  const totalChargedValue =
    basePricing +
    Number(form.charged_toll_amount || 0) +
    Number(form.charged_parking_amount || 0) +
    chargeItemsTotal +
    Number(form.other_expenses || 0) -
    Number(form.discount_amount || 0);

  const totalAdvancePayments = advancePayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const totalReceived = Number(form.amount_received || 0) + totalAdvancePayments;

  const displayedFuelCost = Number(form.fuel_litres || 0) * Number(form.fuel_rate || 0);
  const startKmValue = Number(form.start_km || 0);
  const endKmValue = Number(form.end_km || 0);
  const derivedDistanceKm = startKmValue && endKmValue ? Math.max(endKmValue - startKmValue, 0) : null;
  const distanceInputValue = form.distance_km !== "" ? form.distance_km : (derivedDistanceKm ?? "");
  const stopWheel = (e) => e.currentTarget.blur();

  const totalBill = totalChargedValue.toFixed(2);
  const pending = Math.max(totalChargedValue - totalReceived, 0).toFixed(2);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border-t-4 border-blue-600">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
            <div className="flex justify-beflex flex-col md:flex-row md:justify-between md:items-center gap-4">
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
                  className="w-full md:w-auto text-xl md:text-2xl font-bold text-white bg-blue-700 border border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* INVOICE DATE & CUSTOMER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  value={distanceInputValue}
                  onChange={handleChange}
                  onWheel={stopWheel}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={form.pricing_type === "per_km"}
                  placeholder={form.pricing_type === "package" ? "Approx. distance for efficiency tracking" : "0"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start KM
                </label>
                <input
                  type="number"
                  onWheel={stopWheel}
                  step="0.1"
                  name="start_km"
                  value={form.start_km}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End KM
                </label>
                <input
                  type="number"
                  onWheel={stopWheel}
                  step="0.1"
                  name="end_km"
                  value={form.end_km}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Driver Bhatta
                </label>
                <input
                  type="number"
                  onWheel={stopWheel}
                  step="0.01"
                  name="driver_bhatta"
                  value={form.driver_bhatta}
                  onChange={handleChange}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="??? 0.00"
                />
              </div>
            </div>

            {/* PRICING */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3">Pricing Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      onWheel={stopWheel}
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
                      onWheel={stopWheel}
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
                    onWheel={stopWheel}
                    step="0.01"
                    name="amount_received"
                    value={form.amount_received}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-green-50"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>

              {/* PRICING ITEMS */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Pricing Entries</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    className="border border-gray-300 p-2 rounded"
                    placeholder="Description"
                    value={newPricingItem.description}
                    onChange={e => setNewPricingItem({ ...newPricingItem, description: e.target.value })}
                  />
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    className="border border-gray-300 p-2 rounded"
                    placeholder="Amount"
                    value={newPricingItem.amount}
                    onChange={e => setNewPricingItem({ ...newPricingItem, amount: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={addPricingItem}
                    className="px-3 rounded bg-blue-600 text-white"
                  >
                    Add
                  </button>
                </div>

                {pricingItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pricingItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <div>
                          <span className="font-medium">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">â‚¹ {Number(item.amount || 0).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removePricingItem(idx)}
                            className="text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TRIP CHARGES */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Trip Charges</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    className="border border-gray-300 p-2 rounded"
                    placeholder="Description"
                    value={newChargeItem.description}
                    onChange={e => setNewChargeItem({ ...newChargeItem, description: e.target.value })}
                  />
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    className="border border-gray-300 p-2 rounded"
                    placeholder="Amount"
                    value={newChargeItem.amount}
                    onChange={e => setNewChargeItem({ ...newChargeItem, amount: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={addChargeItem}
                    className="px-3 rounded bg-blue-600 text-white"
                  >
                    Add
                  </button>
                </div>

                {chargeItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {chargeItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <div>
                          <span className="font-medium">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">??? {Number(item.amount || 0).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeChargeItem(idx)}
                            className="text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Charged Toll
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
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
                    onWheel={stopWheel}
                    step="0.01"
                    name="charged_parking_amount"
                    value={form.charged_parking_amount}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discount Amount (₹500–₹1000)
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="discount_amount"
                    value={form.discount_amount}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>
              </div>
            </div>

            {/* ADVANCE PAYMENTS */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3">Advance Payments (Multiple)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="datetime-local"
                  className="border border-gray-300 p-2 rounded"
                  value={newAdvance.payment_date}
                  onChange={e => setNewAdvance({ ...newAdvance, payment_date: e.target.value })}
                />
                <select
                  className="border border-gray-300 p-2 rounded"
                  value={newAdvance.payment_mode}
                  onChange={e => setNewAdvance({ ...newAdvance, payment_mode: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                  <option value="Card">Card</option>
                </select>
                <input
                  type="number"
                  onWheel={stopWheel}
                  step="0.01"
                  className="border border-gray-300 p-2 rounded"
                  placeholder="Amount"
                  value={newAdvance.amount}
                  onChange={e => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    className="border border-gray-300 p-2 rounded w-full"
                    placeholder="Notes"
                    value={newAdvance.notes}
                    onChange={e => setNewAdvance({ ...newAdvance, notes: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={addAdvancePayment}
                    className="px-3 rounded bg-blue-600 text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {advancePayments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {advancePayments.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                      <div>
                        <span className="font-medium">{p.payment_mode}</span>
                        <span className="text-gray-500 ml-2">
                          {p.payment_date ? formatDateDDMMYYYY(p.payment_date) : "Now"}
                        </span>
                        {p.notes && <span className="text-gray-500 ml-2">{p.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">₹ {Number(p.amount || 0).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => removeAdvancePayment(idx)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EXPENSES */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Expense Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Rate (per L)
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="fuel_rate"
                    value={form.fuel_rate}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="₹ 0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Litres
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="fuel_litres"
                    value={form.fuel_litres}
                    onChange={handleChange}
                    className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
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
                        add
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
                      <option value="other">Other Vendor</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Cost (Total)
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    value={Number(displayedFuelCost || 0).toFixed(2)}
                    readOnly
                    className="border border-gray-300 p-3 w-full rounded-lg bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Expenses
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
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

            {/* DRIVER CHANGES */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Driver Changes During Trip</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <select
                  className="border border-gray-300 p-2 rounded"
                  value={newDriverChange.driver_id}
                  onChange={e => setNewDriverChange({ ...newDriverChange, driver_id: e.target.value })}
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="border border-gray-300 p-2 rounded"
                  value={newDriverChange.start_time}
                  onChange={e => setNewDriverChange({ ...newDriverChange, start_time: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="border border-gray-300 p-2 rounded"
                  value={newDriverChange.end_time}
                  onChange={e => setNewDriverChange({ ...newDriverChange, end_time: e.target.value })}
                />
                <input
                  className="border border-gray-300 p-2 rounded"
                  placeholder="Notes"
                  value={newDriverChange.notes}
                  onChange={e => setNewDriverChange({ ...newDriverChange, notes: e.target.value })}
                />
                <button
                  type="button"
                  onClick={addDriverChange}
                  className="bg-blue-600 text-white rounded"
                >
                  Add
                </button>
              </div>

              {driverChanges.length > 0 && (
                <div className="mt-3 space-y-2">
                  {driverChanges.map((dc, idx) => (
                    <div key={dc.id || idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                      <div>
                        <span className="font-medium">
                          {drivers.find(d => String(d.id) === String(dc.driver_id))?.name || dc.driver_id}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {dc.start_time || "Start"} → {dc.end_time || "End"}
                        </span>
                        {dc.notes && <span className="text-gray-500 ml-2">{dc.notes}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDriverChange(idx)}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DRIVER EXPENSES */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-gray-800 mb-3">Driver Expenses (Line Items)</h3>
              <p className="text-xs text-gray-600 mb-3">
                Add expenses incurred by driver during the trip (e.g., police fine, road tax, tolls paid by driver)
              </p>
              
              {/* Add New Expense */}
              <div className="bg-white p-3 rounded border border-gray-300 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      placeholder="Description (e.g., Police Fine)"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      placeholder="Amount"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})}
                      className="border border-gray-300 p-2 w-full rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-1">
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
                Note: Toll, parking, trip charges, and other expenses are included in total bill
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Total Bill</p>
                  <p className="text-2xl font-bold text-blue-600">₹ {totalBill}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Advance Payment</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ₹ {totalAdvancePayments.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-1">Pending Balance</p>
                  <p className="text-2xl font-bold text-red-600">₹ {pending}</p>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
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
