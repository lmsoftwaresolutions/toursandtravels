import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const TripForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  // --- Main States ---
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    customer_name: "",
    from_location: "",
    to_location: "",
    departure_datetime: "",
    return_datetime: "",
    pricing_type: "per_km",
    cost_per_km: "",
    package_amount: "",
    amount_received: "",
    fuel_rate: "",
    fuel_litres: "",
    vendor: "",
    bus_type: "",
    number_of_vehicles: "1",
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    route_details: "",
    discount_amount: "0",
    other_expenses: "0",
    charged_toll_amount: "0",
    charged_parking_amount: "0"
  });

  const [vehicleEntries, setVehicleEntries] = useState([
    { vehicle_number: "", driver_id: "", driver_name: "", start_km: "", end_km: "", distance_km: "", driver_bhatta: "" }
  ]);

  const [pricingItems, setPricingItems] = useState([]);
  const [chargeItems, setChargeItems] = useState([]);
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [driverChanges, setDriverChanges] = useState([]);

  // --- Dropdown States ---
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // --- UI/Helper States ---
  const [loading, setLoading] = useState(isEdit);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: "", phone: "", category: "fuel" });
  const [savingVendor, setSavingVendor] = useState(false);

  const [newPricingItem, setNewPricingItem] = useState({ description: "", amount: "" });
  const [newChargeItem, setNewChargeItem] = useState({ description: "", amount: "" });
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", notes: "" });
  const [newAdvance, setNewAdvance] = useState({ payment_date: new Date().toISOString().split("T")[0], payment_mode: "Cash", amount: "", notes: "" });
  const [newDriverChange, setNewDriverChange] = useState({ driver_id: "", start_time: "", end_time: "", notes: "" });

  // --- Initial Data Load ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vRes, dRes, cRes, venRes] = await Promise.all([
          api.get("/vehicles"),
          api.get("/drivers"),
          api.get("/customers"),
          api.get("/vendors")
        ]);
        setVehicles(vRes.data);
        setDrivers(dRes.data);
        setCustomers(cRes.data);
        setVendors(venRes.data);

        if (isEdit) {
          const tripRes = await api.get(`/trips/${id}`);
          const trip = tripRes.data;
          
          setForm({
            ...trip,
            trip_date: trip.trip_date ? trip.trip_date.split("T")[0] : "",
            departure_datetime: trip.departure_datetime ? trip.departure_datetime.slice(0, 16) : "",
            return_datetime: trip.return_datetime ? trip.return_datetime.slice(0, 16) : "",
            customer_name: trip.customer?.name || "",
            customer_id: String(trip.customer_id || ""),
            vendor: trip.vendor || ""
          });

          if (trip.vehicle_entries?.length > 0) {
            setVehicleEntries(trip.vehicle_entries.map(ve => ({
              ...ve,
              driver_id: String(ve.driver_id || ""),
              driver_name: ve.driver?.name || ""
            })));
          }
          setPricingItems(trip.pricing_items || []);
          setChargeItems(trip.charge_items || []);
          setAdvancePayments(trip.payments || []);
          setDriverChanges(trip.driver_changes || []);
          
          const expRes = await api.get(`/driver-expenses?trip_id=${id}`);
          setDriverExpenses(expRes.data.map(e => ({ ...e, saved: true })));
        }
      } catch (error) {
        console.error("Error loading trip data:", error);
        alert("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEdit]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleVehicleEntryChange = (index, field, value) => {
    setVehicleEntries(prev => prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  const addPricingItem = () => {
    if (!newPricingItem.description || !newPricingItem.amount) return;
    setPricingItems([...pricingItems, { ...newPricingItem, id: Date.now() }]);
    setNewPricingItem({ description: "", amount: "" });
  };
  const removePricingItem = (idx) => setPricingItems(pricingItems.filter((_, i) => i !== idx));

  const addChargeItem = () => {
    if (!newChargeItem.description || !newChargeItem.amount) return;
    setChargeItems([...chargeItems, { ...newChargeItem, id: Date.now() }]);
    setNewChargeItem({ description: "", amount: "" });
  };
  const removeChargeItem = (idx) => setChargeItems(chargeItems.filter((_, i) => i !== idx));

  const addDriverExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    setDriverExpenses([...driverExpenses, { ...newExpense, saved: false }]);
    setNewExpense({ description: "", amount: "", notes: "" });
  };
  const removeDriverExpense = (idx) => setDriverExpenses(driverExpenses.filter((_, i) => i !== idx));

  const addAdvancePayment = () => {
    if (!newAdvance.amount) return;
    setAdvancePayments([...advancePayments, { ...newAdvance, id: Date.now() }]);
    setNewAdvance({ payment_date: new Date().toISOString().split("T")[0], payment_mode: "Cash", amount: "", notes: "" });
  };
  const removeAdvancePayment = (idx) => setAdvancePayments(advancePayments.filter((_, i) => i !== idx));

  const addDriverChange = () => {
    if (!newDriverChange.driver_id) return;
    setDriverChanges([...driverChanges, { ...newDriverChange, id: Date.now() }]);
    setNewDriverChange({ driver_id: "", start_time: "", end_time: "", notes: "" });
  };
  const removeDriverChange = (idx) => setDriverChanges(driverChanges.filter((_, i) => i !== idx));

  const saveNewVendor = async () => {
    if (!newVendorForm.name) return;
    setSavingVendor(true);
    try {
      const res = await api.post("/vendors", newVendorForm);
      setVendors(prev => [...prev, res.data].sort((a,b) => a.name.localeCompare(b.name)));
      setForm(prev => ({ ...prev, vendor: res.data.name }));
      setShowNewVendorForm(false);
      setNewVendorForm({ name: "", phone: "", category: "fuel" });
    } catch (error) {
      alert("Error saving vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let custId = form.customer_id;
      if (!custId && form.customer_name) {
        const res = await api.post("/customers", { name: form.customer_name, phone: "N/A" });
        custId = res.data.id;
      }

      const processedVehicleEntries = await Promise.all(vehicleEntries.map(async (entry) => {
        let dId = entry.driver_id;
        if (!dId && entry.driver_name) {
          const res = await api.post("/drivers", { 
            name: entry.driver_name, 
            phone: "N/A", 
            license_number: "N/A",
            joining_date: new Date().toISOString().split("T")[0],
            monthly_salary: 0
          });
          dId = res.data.id;
        }
        return {
          ...entry,
          driver_id: dId ? Number(dId) : null,
          start_km: entry.start_km ? Number(entry.start_km) : 0,
          end_km: entry.end_km ? Number(entry.end_km) : 0,
          distance_km: entry.distance_km ? Number(entry.distance_km) : 0,
          driver_bhatta: entry.driver_bhatta ? Number(entry.driver_bhatta) : 0
        };
      }));

      const payload = {
        ...form,
        customer_id: custId ? Number(custId) : null,
        number_of_vehicles: Number(form.number_of_vehicles),
        cost_per_km: form.cost_per_km ? Number(form.cost_per_km) : 0,
        package_amount: form.package_amount ? Number(form.package_amount) : 0,
        amount_received: form.amount_received ? Number(form.amount_received) : 0,
        fuel_rate: form.fuel_rate ? Number(form.fuel_rate) : 0,
        fuel_litres: form.fuel_litres ? Number(form.fuel_litres) : 0,
        discount_amount: form.discount_amount ? Number(form.discount_amount) : 0,
        other_expenses: form.other_expenses ? Number(form.other_expenses) : 0,
        charged_toll_amount: form.charged_toll_amount ? Number(form.charged_toll_amount) : 0,
        charged_parking_amount: form.charged_parking_amount ? Number(form.charged_parking_amount) : 0,
        vehicle_entries: processedVehicleEntries,
        pricing_items: pricingItems.map(i => ({ description: i.description, amount: Number(i.amount) })),
        charge_items: chargeItems.map(i => ({ description: i.description, amount: Number(i.amount) })),
        driver_changes: driverChanges.map(dc => ({ driver_id: Number(dc.driver_id), start_time: dc.start_time, end_time: dc.end_time, notes: dc.notes })),
      };

      let tripId = id;
      if (isEdit) {
        await api.put(`/trips/${id}`, payload);
      } else {
        const res = await api.post("/trips", payload);
        tripId = res.data.id;
      }

      // Save driver expenses and advance payments
      for (const exp of driverExpenses) {
        if (!exp.saved) {
          await api.post("/driver-expenses", { 
            trip_id: Number(tripId), 
            description: exp.description, 
            amount: Number(exp.amount), 
            notes: exp.notes 
          });
        }
      }
      for (const pay of advancePayments) {
        if (!pay.id || typeof pay.id !== "number" || pay.id > 1000000000000) { // New payments usually have Date.now() id
          await api.post("/payments", {
            trip_id: Number(tripId),
            payment_date: pay.payment_date || new Date().toISOString(),
            payment_mode: pay.payment_mode,
            amount: Number(pay.amount),
            notes: pay.notes
          });
        }
      }

      navigate("/trips");
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving trip");
    }
  };

  // --- Calculations ---
  const pricingItemsTotal = pricingItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const chargeItemsTotal = chargeItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalDriverExpenses = driverExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const tripDays = (() => {
    if (form.departure_datetime && form.return_datetime) {
      const s = new Date(form.departure_datetime);
      const e = new Date(form.return_datetime);
      if (isNaN(s) || isNaN(e) || e < s) return 1;
      return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  })();

  const vehicleDistanceTotal = vehicleEntries.reduce((sum, entry) => {
    const s = Number(entry.start_km || 0);
    const e = Number(entry.end_km || 0);
    const d = e > s ? e - s : Number(entry.distance_km || 0);
    return sum + d;
  }, 0);

  const basePricing = (form.pricing_type === "package" 
    ? Number(form.package_amount || 0) * tripDays 
    : vehicleDistanceTotal * Number(form.cost_per_km || 0)) * (form.pricing_type === "package" ? Number(form.number_of_vehicles || 1) : 1);

  const pricingItemsCharged = pricingItemsTotal * Number(form.number_of_vehicles || 1);

  const totalChargedValue = basePricing + pricingItemsCharged + Number(form.charged_toll_amount || 0) + Number(form.charged_parking_amount || 0) + chargeItemsTotal + Number(form.other_expenses || 0) - Number(form.discount_amount || 0);
  const totalAdvancePayments = advancePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalReceived = Number(form.amount_received || 0) + totalAdvancePayments;
  const pending = Math.max(0, totalChargedValue - totalReceived);
  const totalBill = totalChargedValue;

  const stopWheel = (e) => e.target.blur();
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(form.customer_name.toLowerCase()));

  if (loading) return <div className="p-8 text-center font-black animate-pulse">LOADING TRIP DATA...</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <button onClick={() => navigate("/trips")} className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-all">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back to Trips
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{isEdit ? "Edit Trip" : "New Trip"}</h1>
            {isEdit && <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">Syncing</div>}
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Invoice ID</label>
          <input
            type="text"
            name="invoice_number"
            value={form.invoice_number}
            onChange={handleChange}
            placeholder="INV-XXXXXX"
            className="h-14 px-6 bg-slate-900 text-white font-black text-lg rounded-2xl shadow-xl outline-none focus:ring-4 focus:ring-blue-500/30 transition-all text-right"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          
          {/* JOURNEY PARAMETERS */}
          <section className="glass-card p-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5"><svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg></div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-10"><div className="w-1.5 h-6 bg-blue-600 rounded-full" />Journey Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Date</label>
                <input type="date" name="trip_date" value={form.trip_date} onChange={handleChange} className="trip-input" required />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer Name</label>
                <input 
                  type="text" value={form.customer_name} 
                  onChange={(e) => { setForm({...form, customer_name: e.target.value, customer_id: ""}); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                  className="trip-input" placeholder="Search or Type New..." required 
                />
                {showCustomerList && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <div key={c.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700" onClick={() => { setForm({...form, customer_name: c.name, customer_id: String(c.id)}); setShowCustomerList(false); }}>{c.name}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Departure</label>
                <input type="datetime-local" name="departure_datetime" value={form.departure_datetime} onChange={handleChange} className="trip-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Return</label>
                <input type="datetime-local" name="return_datetime" value={form.return_datetime} onChange={handleChange} className="trip-input" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">From</label>
                <input name="from_location" value={form.from_location} onChange={handleChange} className="trip-input" placeholder="Origin" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">To</label>
                <input name="to_location" value={form.to_location} onChange={handleChange} className="trip-input" placeholder="Destination" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fleet Count</label>
                <input type="number" name="number_of_vehicles" value={form.number_of_vehicles} onChange={handleChange} min="1" className="trip-input" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle/Bus Type</label>
                <input name="bus_type" value={form.bus_type} onChange={handleChange} className="trip-input" placeholder="e.g. 45-Seater AC" />
              </div>
            </div>
            <div className="mt-8 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Route & Ops Notes</label>
              <textarea name="route_details" value={form.route_details} onChange={handleChange} rows="3" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" placeholder="Detailed route plan..." />
            </div>
          </section>

          {/* VEHICLE ENTRIES */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><div className="w-1.5 h-6 bg-slate-800 rounded-full" />Fleet Deployment</h3>
              <button 
                type="button" 
                onClick={() => setVehicleEntries([...vehicleEntries, { vehicle_number: "", driver_id: "", driver_name: "", start_km: "", end_km: "", distance_km: "", driver_bhatta: "" }])}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
              >
                + Deploy Another Vehicle
              </button>
            </div>
            {vehicleEntries.map((entry, idx) => (
              <div key={idx} className="glass-card p-8 rounded-[2.5rem] border border-slate-100 space-y-6 bg-white/50 relative group">
                {vehicleEntries.length > 1 && (
                  <button type="button" onClick={() => setVehicleEntries(vehicleEntries.filter((_, i) => i !== idx))} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</label>
                    <select value={entry.vehicle_number} onChange={e => handleVehicleEntryChange(idx, "vehicle_number", e.target.value)} className="trip-input" required>
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver</label>
                    <input 
                      type="text" value={entry.driver_name} 
                      onChange={e => { handleVehicleEntryChange(idx, "driver_name", e.target.value); handleVehicleEntryChange(idx, "driver_id", ""); }}
                      className="trip-input" placeholder="Search Driver..." required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver Bhatta (₹)</label>
                    <input type="number" onWheel={stopWheel} value={entry.driver_bhatta} onChange={e => handleVehicleEntryChange(idx, "driver_bhatta", e.target.value)} className="trip-input" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Start KM</label>
                    <input type="number" onWheel={stopWheel} value={entry.start_km} onChange={e => handleVehicleEntryChange(idx, "start_km", e.target.value)} className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400">End KM</label>
                    <input type="number" onWheel={stopWheel} value={entry.end_km} onChange={e => handleVehicleEntryChange(idx, "end_km", e.target.value)} className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold w-full" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Distance Override</label>
                    <input type="number" onWheel={stopWheel} value={entry.distance_km} onChange={e => handleVehicleEntryChange(idx, "distance_km", e.target.value)} className="h-10 px-3 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold w-full text-blue-600" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* PRICING & REVENUE */}
          <section className="glass-card p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full" />Commercials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing Model</label>
                <select name="pricing_type" value={form.pricing_type} onChange={handleChange} className="trip-input">
                  <option value="per_km">Per KM Rate</option>
                  <option value="package">Lump Sum / Package</option>
                </select>
              </div>
              {form.pricing_type === "per_km" ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Rate (₹/KM)</label>
                  <input type="number" name="cost_per_km" value={form.cost_per_km} onChange={handleChange} className="trip-input" placeholder="0.00" required />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Package Amount (₹)</label>
                  <input type="number" name="package_amount" value={form.package_amount} onChange={handleChange} className="trip-input" placeholder="0.00" required />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Direct Recv (Spot)</label>
                <input type="number" name="amount_received" value={form.amount_received} onChange={handleChange} className="trip-input bg-emerald-50 border-emerald-100 text-emerald-700" placeholder="0.00" />
              </div>
            </div>

            {/* Custom Pricing Items */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add-on Yields (Daily Allowances, etc)</p>
              <div className="grid grid-cols-3 gap-3">
                <input value={newPricingItem.description} onChange={e => setNewPricingItem({...newPricingItem, description: e.target.value})} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold col-span-1" placeholder="Description" />
                <input type="number" value={newPricingItem.amount} onChange={e => setNewPricingItem({...newPricingItem, amount: e.target.value})} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold col-span-1 text-right" placeholder="Amount" />
                <button type="button" onClick={addPricingItem} className="h-11 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Append</button>
              </div>
              {pricingItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/60 p-3 rounded-xl border border-white">
                  <span className="text-xs font-bold text-slate-600">{item.description}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-800">₹{Number(item.amount).toFixed(2)}</span>
                    <button type="button" onClick={() => removePricingItem(idx)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FUEL & VENDORS */}
          <section className="glass-card p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2"><div className="w-1.5 h-6 bg-orange-500 rounded-full" />Logistics & Fuel</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fuel Rate (₹/L)</label>
                <input type="number" name="fuel_rate" value={form.fuel_rate} onChange={handleChange} className="trip-input" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fuel Qty (L)</label>
                <input type="number" name="fuel_litres" value={form.fuel_litres} onChange={handleChange} className="trip-input" placeholder="0.0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Fuel Cost</label>
                <div className="h-12 flex items-center px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-500">₹{displayedFuelCost.toFixed(2)}</div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Allocation</label>
              <div className="flex gap-4">
                <select name="vendor" value={form.vendor} onChange={handleChange} className="trip-input">
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewVendorForm(!showNewVendorForm)} className="whitespace-nowrap px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">New Vendor</button>
              </div>
              {showNewVendorForm && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dotted border-slate-300 grid grid-cols-2 gap-3">
                  <input placeholder="Name" value={newVendorForm.name} onChange={e => setNewVendorForm({...newVendorForm, name: e.target.value})} className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs" />
                  <input placeholder="Phone" value={newVendorForm.phone} onChange={e => setNewVendorForm({...newVendorForm, phone: e.target.value})} className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs" />
                  <button type="button" onClick={saveNewVendor} disabled={savingVendor} className="h-10 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase col-span-2">Save Vendor</button>
                </div>
              )}
            </div>
          </section>

          {/* DRIVER EXPENSES & ADVANCES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Driver paid expenses */}
            <section className="glass-card p-8 rounded-[2rem] border border-slate-100 space-y-6">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-4 bg-red-500 rounded-full" />Driver Paid (En Route)</h4>
              <div className="space-y-3">
                <input placeholder="Expense Name" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="trip-input h-10 text-xs" />
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="trip-input h-10 text-xs text-right" />
                  <button type="button" onClick={addDriverExpense} className="px-4 bg-red-600 text-white rounded-xl text-xs font-black">+</button>
                </div>
              </div>
              {driverExpenses.map((exp, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-red-50/50 rounded-lg border border-red-50">
                  <span className="font-bold text-slate-600">{exp.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-red-600">₹{Number(exp.amount).toFixed(2)}</span>
                    <button type="button" onClick={() => removeDriverExpense(idx)} className="text-red-300 hover:text-red-500">×</button>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 flex justify-between text-[10px] font-black uppercase text-red-800">
                <span>Total Expenses</span>
                <span>₹{totalDriverExpenses.toFixed(2)}</span>
              </div>
            </section>

            {/* Advance payments */}
            <section className="glass-card p-8 rounded-[2rem] border border-slate-100 space-y-6">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-4 bg-emerald-500 rounded-full" />Advance History</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select value={newAdvance.payment_mode} onChange={e => setNewAdvance({...newAdvance, payment_mode: e.target.value})} className="trip-input h-10 text-xs">
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                  <input type="number" placeholder="Amount" value={newAdvance.amount} onChange={e => setNewAdvance({...newAdvance, amount: e.target.value})} className="trip-input h-10 text-xs text-right" />
                  <button type="button" onClick={addAdvancePayment} className="px-4 bg-emerald-600 text-white rounded-xl text-xs font-black">+</button>
                </div>
              </div>
              {advancePayments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-emerald-50/50 rounded-lg border border-emerald-50">
                  <span className="font-bold text-slate-600">{p.payment_mode}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-600">₹{Number(p.amount).toFixed(2)}</span>
                    <button type="button" onClick={() => removeAdvancePayment(idx)} className="text-emerald-300 hover:text-emerald-500">×</button>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 flex justify-between text-[10px] font-black uppercase text-emerald-800">
                <span>Total Received</span>
                <span>₹{totalAdvancePayments.toFixed(2)}</span>
              </div>
            </section>
          </div>
        </div>

        {/* SUMMARY SIDEBAR */}
        <div className="space-y-8">
          <div className="glass-card p-10 rounded-[3rem] border border-slate-200 bg-white shadow-2xl shadow-blue-900/10 sticky top-8">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-blue-600 rounded-full" />Trip Summary</h3>
            
            <div className="space-y-8">
              <div className="p-8 bg-slate-900 rounded-[2.5rem] space-y-6 text-white text-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Billable Amount</p>
                  <p className="text-4xl font-black tracking-tighter">₹ {totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Credits Recv</p>
                  <p className="text-2xl font-black text-emerald-400 tracking-tighter">₹ {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="pt-4 space-y-1">
                   {pending > 0 ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Balance Pending</p>
                      <p className="text-5xl font-black text-rose-500 tracking-tighter animate-pulse">₹ {pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </>
                   ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fully Settled</p>
                      <p className="text-3xl font-black text-emerald-500 tracking-tighter lowercase">cleared</p>
                    </>
                   )}
                </div>
              </div>

              <div className="space-y-6 px-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Other Extra (Loading/Wait)</label>
                  <input type="number" name="other_expenses" value={form.other_expenses} onChange={handleChange} className="trip-input" placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Toll Yield</label>
                    <input type="number" name="charged_toll_amount" value={form.charged_toll_amount} onChange={handleChange} className="trip-input" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Parking Yield</label>
                    <input type="number" name="charged_parking_amount" value={form.charged_parking_amount} onChange={handleChange} className="trip-input" />
                  </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Promotional Discount</label>
                    <input type="number" name="discount_amount" value={form.discount_amount} onChange={handleChange} className="trip-input text-rose-500" />
                </div>

                <button type="submit" className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 mt-6">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  {isEdit ? "Update Master" : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Synchronizing Trip Engine</p>
          </div>
        </div>
      )}

      {/* Adding custom CSS for trip-input since it's used many times */}
      <style>{`
        .trip-input {
          width: 100%;
          height: 3rem;
          padding-left: 1rem;
          padding-right: 1rem;
          background-color: #f8fafc;
          border-width: 1px;
          border-color: #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #334155;
          outline: 2px solid transparent;
          outline-offset: 2px;
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
        .trip-input:focus {
          --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
          --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(4px + var(--tw-ring-offset-width)) rgba(59, 130, 246, 0.1);
          box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
          border-color: #3b82f6;
        }
        .trip-input::placeholder {
           color: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default TripForm;
