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
    driver_name: "", // For Autocomplete
    customer_id: "",
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

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pricingItems, setPricingItems] = useState([]);
  const [chargeItems, setChargeItems] = useState([]);
  const [driverChanges, setDriverChanges] = useState([]);
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [vehicleEntries, setVehicleEntries] = useState([createVehicleEntry()]);

  const [newExpense, setNewExpense] = useState({ description: "", amount: "", notes: "" });
  const [newPricingItem, setNewPricingItem] = useState({ description: "", amount: "" });
  const [newChargeItem, setNewChargeItem] = useState({ description: "", amount: "" });
  const [newDriverChange, setNewDriverChange] = useState({ driver_id: "", start_time: "", end_time: "", notes: "" });
  const [newAdvance, setNewAdvance] = useState({ payment_date: "", payment_mode: "Cash", amount: "", notes: "" });
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: "", phone: "", category: "fuel" });
  const [savingVendor, setSavingVendor] = useState(false);

  /* ---------------- LOAD DROPDOWNS ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/drivers").then(res => setDrivers(res.data));
    api.get("/customers").then(res => setCustomers(res.data));
    api.get("/vendors").then(res => setVendors(res.data));
  }, []);

  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerList, setShowCustomerList] = useState(false);

  useEffect(() => {
    if (form.customer_name) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(form.customer_name.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [form.customer_name, customers]);

  useEffect(() => {
    const count = Math.max(1, Number(form.number_of_vehicles) || 1);
    setVehicleEntries((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push(createVehicleEntry());
      }
      return next.slice(0, count);
    });
  }, [form.number_of_vehicles]);

  /* ---------------- LOAD TRIP (EDIT MODE) ---------------- */
  useEffect(() => {
    if (isEdit) {
      api.get(`/trips/${id}`).then(res => {
        const data = res.data;

        const customer = customers.find(c => String(c.id) === String(data.customer_id));
        const primaryDriver = drivers.find(d => String(d.id) === String(data.driver_id));
        const incomingVehicles = (data.vehicles?.length ? data.vehicles : [{
          vehicle_number: data.vehicle_number,
          driver_id: data.driver_id,
          start_km: data.start_km,
          end_km: data.end_km,
          distance_km: data.distance_km,
          driver_bhatta: data.driver_bhatta,
        }]).map((entry) => {
          const driver = drivers.find(d => String(d.id) === String(entry.driver_id));
          return {
            vehicle_number: entry.vehicle_number || "",
            driver_id: entry.driver_id ? String(entry.driver_id) : "",
            driver_name: driver?.name || "",
            start_km: entry.start_km ?? "",
            end_km: entry.end_km ?? "",
            distance_km: entry.distance_km ?? "",
            driver_bhatta: entry.driver_bhatta ?? "",
          };
        });

        setForm({
          trip_date: data.trip_date,
          departure_datetime: data.departure_datetime ? data.departure_datetime.slice(0, 16) : "",
          return_datetime: data.return_datetime ? data.return_datetime.slice(0, 16) : "",
          from_location: data.from_location,
          to_location: data.to_location,
          route_details: data.route_details || "",
          vehicle_number: incomingVehicles[0]?.vehicle_number || "",
          driver_id: incomingVehicles[0]?.driver_id || "",
          driver_name: incomingVehicles[0]?.driver_name || primaryDriver?.name || "",
          customer_id: String(data.customer_id),
          distance_km: data.distance_km,
          fuel_cost: (data.diesel_used || data.petrol_used || ""),
          fuel_litres: data.fuel_litres || "",
          toll_amount: data.toll_amount || "",
          parking_amount: data.parking_amount || "",
          other_expenses: data.other_expenses || "",
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
    setForm({ ...form, [name]: value });
  };

  const handleVehicleEntryChange = (index, field, value) => {
    setVehicleEntries((prev) => prev.map((entry, entryIndex) => {
      if (entryIndex !== index) {
        return entry;
      }
      return { ...entry, [field]: value };
    }));
  };

  const saveNewVendor = async () => {
    if (!newVendorForm.name.trim()) {
      alert("Please enter a vendor name.");
      return;
    }

    setSavingVendor(true);
    try {
      const res = await api.post("/vendors", {
        name: newVendorForm.name.trim(),
        phone: newVendorForm.phone.trim() || null,
        category: newVendorForm.category,
      });
      setVendors((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, vendor: res.data.name }));
      setShowNewVendorForm(false);
      setNewVendorForm({ name: "", phone: "", category: "fuel" });
    } catch (error) {
      alert("Error creating vendor: " + (error.response?.data?.detail || error.message));
    } finally {
      setSavingVendor(false);
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

    let customer_id = form.customer_id;

    if (!customer_id && form.customer_name) {
      try {
        const res = await api.post("/customers", { name: form.customer_name.trim(), phone: "N/A" });
        customer_id = res.data.id;
        setCustomers(prev => [...prev, res.data]);
      } catch (err) {
        alert("Error creating customer: " + (err.response?.data?.detail || err.message));
        return;
      }
    }

    const vendorName = form.vendor ? String(form.vendor).trim() : "";

    const computedFuelCost = Number(form.fuel_litres || 0) * Number(form.fuel_rate || 0);
    const fuelCostTotal = computedFuelCost || Number(form.fuel_cost || 0);
    const resolvedVehicleEntries = [];
    const createdDrivers = [];

    for (const entry of vehicleEntries) {
      if (!entry.vehicle_number) {
        alert("Please select a vehicle for every vehicle section.");
        return;
      }

      let resolvedDriverId = entry.driver_id;
      if (!resolvedDriverId && entry.driver_name) {
        try {
          const res = await api.post("/drivers", {
            name: entry.driver_name.trim(),
            phone: "N/A",
            license_number: "N/A",
            joining_date: new Date().toISOString().split("T")[0],
            monthly_salary: 0
          });
          resolvedDriverId = String(res.data.id);
          createdDrivers.push(res.data);
        } catch (err) {
          alert("Error creating driver: " + (err.response?.data?.detail || err.message));
          return;
        }
      }

      if (!resolvedDriverId) {
        alert("Please select or enter a driver for every vehicle section.");
        return;
      }

      const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
      const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
      const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : null;
      const distanceKmValue = entry.distance_km !== "" ? Number(entry.distance_km) : derivedDistance;

      resolvedVehicleEntries.push({
        vehicle_number: entry.vehicle_number,
        driver_id: Number(resolvedDriverId),
        start_km: startKm,
        end_km: endKm,
        distance_km: distanceKmValue,
        driver_bhatta: Number(entry.driver_bhatta || 0),
      });
    }

    if (createdDrivers.length) {
      setDrivers(prev => [...prev, ...createdDrivers]);
    }

    const primaryVehicle = resolvedVehicleEntries[0];
    const totalDistanceKm = resolvedVehicleEntries.reduce(
      (sum, entry) => sum + Number(entry.distance_km || 0),
      0
    );
    const totalDriverBhatta = resolvedVehicleEntries.reduce(
      (sum, entry) => sum + Number(entry.driver_bhatta || 0),
      0
    );

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
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      diesel_used: Number(form.fuel_cost || 0),
      petrol_used: 0,
      fuel_litres: Number(form.fuel_litres || 0),
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
            driver_id: primaryVehicle?.driver_id,
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

  const totalBillValue =
    form.pricing_type === "package"
      ? Number(form.package_amount || 0)
      : Number(form.distance_km || 0) * Number(form.cost_per_km || 0);

  const totalBill = totalBillValue.toFixed(2);
  const pending = Math.max(totalBillValue - Number(form.amount_received || 0), 0).toFixed(2);

  /* ---------------- UI ---------------- */
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button
            onClick={() => navigate("/trips")}
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            All Trips
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{isEdit ? "Edit Trip" : "Add New Trip"}</h1>
            {isEdit && <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">Editing</div>}
          </div>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Fill in the details below to manage your trip</p>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Invoice Number</label>
          <input
            type="text"
            name="invoice_number"
            value={form.invoice_number}
            onChange={handleChange}
            placeholder="INV-XXXXXX"
            required
            className="h-14 px-6 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-900/20 outline-none focus:ring-4 focus:ring-blue-500/30 transition-all placeholder:text-slate-700 text-right"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <div className="w-full">

          {/* SECTION: JOURNEY PARAMETERS */}
          <div className="space-y-8">
            <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>

              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-10">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Trip Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Date</label>
                  <input
                    type="date"
                    name="trip_date"
                    value={form.trip_date}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer / Party Name</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={form.customer_name}
                    onChange={(e) => {
                      setForm({ ...form, customer_name: e.target.value, customer_id: "" });
                      setShowCustomerList(true);
                    }}
                    onFocus={() => setShowCustomerList(true)}
                    autoComplete="off"
                    placeholder="Search or Enter New Customer"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    required
                  />
                  {showCustomerList && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setForm({ ...form, customer_name: c.name, customer_id: String(c.id) });
                            setShowCustomerList(false);
                          }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {showCustomerList && form.customer_name && filteredCustomers.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs font-bold text-blue-600">
                      + New Customer Detected
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Departure Time</label>
                  <input
                    type="datetime-local"
                    name="departure_datetime"
                    value={form.departure_datetime}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Return Time</label>
                  <input
                    type="datetime-local"
                    name="return_datetime"
                    value={form.return_datetime}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">From (Start Point)</label>
                  <input
                    name="from_location"
                    value={form.from_location}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                    required
                    placeholder="Enter start location"
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">To (End Point)</label>
                  <input
                    name="to_location"
                    value={form.to_location}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                    required
                    placeholder="Enter destination"
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Number of Vehicles</label>
                  <input
                    type="number"
                    name="number_of_vehicles"
                    value={form.number_of_vehicles}
                    onChange={handleChange}
                    min="1"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Type (Bus/AC/Non-AC)</label>
                  <input
                    type="text"
                    name="bus_type"
                    value={form.bus_type}
                    onChange={handleChange}
                    placeholder="e.g. 45 Seater AC"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Route Details</label>
                <textarea
                  name="route_details"
                  value={form.route_details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
                  placeholder="Enter route details, stops, etc..."
                />
              </div>
            </div>

            {vehicleEntries.map((entry, index) => {
              const matchingDrivers = entry.driver_name
                ? drivers.filter((d) => d.name.toLowerCase().includes(entry.driver_name.toLowerCase()))
                : [];
              const startKmValue = entry.start_km !== "" ? Number(entry.start_km) : null;
              const endKmValue = entry.end_km !== "" ? Number(entry.end_km) : null;
              const derivedDistanceValue =
                startKmValue !== null && endKmValue !== null ? Math.max(endKmValue - startKmValue, 0) : null;
              const distanceValue = entry.distance_km !== "" ? entry.distance_km : (derivedDistanceValue ?? "");

              return (
                <div key={index} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Vehicle {index + 1}</h3>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per vehicle details</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Vehicle <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={entry.vehicle_number}
                        onChange={(e) => handleVehicleEntryChange(index, "vehicle_number", e.target.value)}
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

                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Driver <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={entry.driver_name}
                        onChange={(e) => {
                          handleVehicleEntryChange(index, "driver_name", e.target.value);
                          handleVehicleEntryChange(index, "driver_id", "");
                        }}
                        autoComplete="off"
                        placeholder="Search or Enter New Driver"
                        className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {matchingDrivers.length > 0 && !entry.driver_id && (
                        <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {matchingDrivers.map(d => (
                            <div
                              key={d.id}
                              className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
                              onClick={() => {
                                handleVehicleEntryChange(index, "driver_name", d.name);
                                handleVehicleEntryChange(index, "driver_id", String(d.id));
                              }}
                            >
                              {d.name}
                            </div>
                          ))}
                        </div>
                      )}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start KM
                      </label>
                      <input
                        type="number"
                        onWheel={stopWheel}
                        step="0.1"
                        min="0"
                        value={entry.start_km}
                        onChange={(e) => handleVehicleEntryChange(index, "start_km", e.target.value)}
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
                        min="0"
                        value={entry.end_km}
                        onChange={(e) => handleVehicleEntryChange(index, "end_km", e.target.value)}
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
                        min="0"
                        value={entry.driver_bhatta}
                        onChange={(e) => handleVehicleEntryChange(index, "driver_bhatta", e.target.value)}
                        className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Rs 0.00"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-13c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg>
              </div>

              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-10">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Pricing Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pricing Model</label>
                  <select
                    name="pricing_type"
                    value={form.pricing_type}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="per_km">Per Kilometer Rate</option>
                    <option value="package">Fix Rate (Package)</option>
                  </select>
                </div>

                {form.pricing_type === "per_km" ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Rate (₹/KM)</label>
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      name="cost_per_km"
                      min="0"
                      value={form.cost_per_km}
                      onChange={handleChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                      required
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Package Yield (₹)</label>
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      name="package_amount"
                      min="0"
                      value={form.package_amount}
                      onChange={handleChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                      required
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Direct Remittance (Received)</label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="amount_received"
                    min="0"
                    value={form.amount_received}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-emerald-200"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
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
                    onWheel={stopWheel}
                    step="0.01"
                    min="0"
                    className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 text-right"
                    placeholder="Amount"
                    value={newPricingItem.amount}
                    onChange={e => setNewPricingItem({ ...newPricingItem, amount: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={addPricingItem}
                    className="h-11 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                  >
                    Append Entry
                  </button>
                </div>

                {pricingItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {pricingItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-white backdrop-blur-sm group hover:border-blue-100 transition-all">
                        <span className="text-xs font-bold text-slate-600">{item.description}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-slate-800 tracking-tight">₹ {Number(item.amount || 0).toFixed(2)}</span>
                          <button type="button" onClick={() => removePricingItem(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-10">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                Expenses
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Energy Rate (₹/L)</label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="fuel_rate"
                    min="0"
                    value={form.fuel_rate}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* EXPENSES */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Expense Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Cost
                  </label>
                  <input
                    type="number"
                    onWheel={stopWheel}
                    step="0.01"
                    name="fuel_cost"
                    value={form.fuel_cost}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                    placeholder="0.00"
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

            <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-2">
                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                Driver Paid Expenses
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Expenses paid by the driver during the trip</p>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      placeholder="Expense Allocation (e.g. State Tolls)"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all placeholder:text-slate-300 w-full"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      min="0"
                      placeholder="Debit Amount"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all placeholder:text-slate-300 w-full text-right"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      placeholder="Audit Notes"
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                      className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all placeholder:text-slate-300 w-full"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={addDriverExpense}
                      className="h-11 w-full bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                      <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {driverExpenses.length > 0 && (
                <div className="space-y-3">
                  {driverExpenses.map((exp, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group hover:border-red-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 leading-none">{exp.description}</p>
                          {exp.notes && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{exp.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-xs font-black text-red-600">₹ {Number(exp.amount).toFixed(2)}</p>
                        <button type="button" onClick={() => removeDriverExpense(idx)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-red-400 rounded-xl transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-6 bg-red-50 rounded-2xl border border-red-100 mt-6">
                    <p className="text-[10px] font-black text-red-800 uppercase tracking-widest">Total Driver Expenses</p>
                    <p className="text-xl font-black text-red-600 tracking-tight">₹ {totalDriverExpenses.toFixed(2)}</p>
                  </div>
                </div>
              )}
              {/* SECTION: ADVANCE PAYMENTS (RESTORED) */}
              <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  Advance Payments
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Record advance payments received for this trip</p>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <input
                        type="date"
                        value={newAdvance.payment_date}
                        onChange={(e) => setNewAdvance({ ...newAdvance, payment_date: e.target.value })}
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all w-full"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <select
                        value={newAdvance.payment_mode}
                        onChange={(e) => setNewAdvance({ ...newAdvance, payment_mode: e.target.value })}
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all w-full appearance-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online / UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        onWheel={stopWheel}
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={newAdvance.amount}
                        onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all w-full text-right"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        placeholder="Reference/Notes"
                        value={newAdvance.notes}
                        onChange={(e) => setNewAdvance({ ...newAdvance, notes: e.target.value })}
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all w-full"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={addAdvancePayment}
                        className="h-11 w-full bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                      >
                        <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {advancePayments.length > 0 && (
                  <div className="space-y-3">
                    {advancePayments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 group hover:border-emerald-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 leading-none">{p.payment_mode} Payment</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                              {formatDateDDMMYYYY(p.payment_date)} {p.notes && `• ${p.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="text-xs font-black text-emerald-600">₹ {Number(p.amount).toFixed(2)}</p>
                          <button type="button" onClick={() => removeAdvancePayment(idx)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-red-400 rounded-xl transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total Advance Received</p>
                      <p className="text-xl font-black text-emerald-600 tracking-tight">₹ {totalAdvancePayments.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BILLING SUMMARY */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-300">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Billing Summary</h3>
              <p className="text-xs text-gray-600 mb-3">
                Note: Toll & parking paid on spot are not included in total bill
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

                  <div className="space-y-6 px-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Other Extra Expenses</label>
                      <input
                        type="number"
                        onWheel={stopWheel}
                        step="0.01"
                        name="other_expenses"
                        min="0"
                        value={form.other_expenses}
                        onChange={handleChange}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Toll Yield</label>
                        <input
                          type="number"
                          onWheel={stopWheel}
                          step="0.01"
                          name="charged_toll_amount"
                          min="0"
                          value={form.charged_toll_amount}
                          onChange={handleChange}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Parking Yield</label>
                        <input
                          type="number"
                          onWheel={stopWheel}
                          step="0.01"
                          name="charged_parking_amount"
                          min="0"
                          value={form.charged_parking_amount}
                          onChange={handleChange}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98] mt-4"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      {isEdit ? "Update Trip" : "Save Trip"}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/trips")}
                      className="w-full h-14 bg-white text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

