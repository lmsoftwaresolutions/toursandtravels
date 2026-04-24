import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Modal from "../../components/common/Modal";
import VehicleCard from "../../components/trips/VehicleCard";

const createVehicleEntry = () => ({
  vehicle_number: "",
  driver_id: "",
  driver_name: "",
  vehicle_type: "",
  seat_count: "",
  vendor_category: "",
  start_km: "",
  end_km: "",
  driver_bhatta: "",
  // Nested data for backend
  fuel_cost: 0,
  fuel_litres: 0,
  diesel_used: 0,
  petrol_used: 0,
  fuel_price: 0,
  fuel_vendor: "",
  toll_amount: 0,
  parking_amount: 0,
  other_expenses: 0,
  vendor_deduction_description: "",
  vendor_deduction_amount: "",
  vendor_deduction_note: "",
  vendor_deduction_vendor: "",
  expenses: [],
  driver_changes: [],
  cost_per_km: "",
  pricing_type: "per_km",
  package_amount: "",
  cost_per_km: "",
  pricing_type: "per_km",
  package_amount: "",
});

// Utility function for date formatting
const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

const createInitialFormState = () => ({
  trip_date: new Date().toISOString().split("T")[0],
  booking_id: "",
  customer_id: "",
  customer_name: "",
  customer_phone: "",
  customer_address: "",
  from_location: "",
  to_location: "",
  route_details: "",
  number_of_vehicles: 1,
  bus_type: "",
  bus_detail: "",
  cost_per_km: "",
  charged_toll_amount: "",
  charged_parking_amount: "",
  other_expenses: "",
  discount_amount: "",
  estimate_amount: "",
  amount_received: "",
  advance_payment: "", // Note: legacy field
  pricing_type: "per_km",
  package_amount: "",
  vendor: "",
  invoice_number: "",
  departure_datetime: "",
  return_datetime: "",
});

export default function TripForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const showModal = (title, message, type = "error") => setModal({ isOpen: true, title, message, type });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  const [form, setForm] = useState(createInitialFormState());

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
  const [newAdvance, setNewAdvance] = useState({ payment_date: new Date().toISOString().split("T")[0], payment_mode: "Cash", amount: "", notes: "" });
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: "", phone: "", category: "fuel" });
  const [savingVendor, setSavingVendor] = useState(false);

  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const DRAFT_KEY = "tripFormDraft:new";

  const normalizeIndianPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits;
  };

  const isValidIndianPhone = (value) => /^[6-9]\d{9}$/.test(normalizeIndianPhone(value));

  const saveDraft = () => {
    const payload = {
      form,
      vehicleEntries,
      pricingItems,
      chargeItems,
      driverChanges,
      driverExpenses,
      advancePayments,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  /* ============ DATA LOADING ============ */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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

        if (isEdit && id) {
          const tripRes = await api.get(`/trips/${id}`);
          const trip = tripRes.data;
          const customerRecord =
            trip.customer ||
            (cRes.data || []).find((c) => c.id === trip.customer_id);

          const perVehicleOtherTotal = (trip.vehicles || []).reduce(
            (sum, v) => sum + Number(v.other_expenses || 0),
            0
          );
          const generalOtherExpenses = Math.max(
            Number(trip.other_expenses || 0) - perVehicleOtherTotal,
            0
          );

          setForm({
            ...createInitialFormState(),
            trip_date: trip.trip_date ? trip.trip_date.split("T")[0] : "",
            booking_id: trip.booking_id || "",
            departure_datetime: trip.departure_datetime ? trip.departure_datetime.slice(0, 16) : "",
            return_datetime: trip.return_datetime ? trip.return_datetime.slice(0, 16) : "",
            from_location: trip.from_location || "",
            to_location: trip.to_location || "",
            route_details: trip.route_details || "",
            customer_name: customerRecord?.name || "",
            customer_id: String(trip.customer_id || ""),
            customer_phone: trip.customer_phone || customerRecord?.phone || "",
            customer_address: trip.customer_address || customerRecord?.address || "",
            number_of_vehicles: trip.number_of_vehicles || 1,
            bus_type: trip.bus_type || "",
            bus_detail: trip.bus_detail || "",
            other_expenses: generalOtherExpenses || "",
            cost_per_km: trip.cost_per_km || "",
            charged_toll_amount: trip.charged_toll_amount || "",
            charged_parking_amount: trip.charged_parking_amount || "",
            discount_amount: trip.discount_amount || "",
            estimate_amount: trip.estimate_amount ?? "",
            amount_received: trip.amount_received || "",
            pricing_type: trip.pricing_type || "per_km",
            package_amount: trip.package_amount || "",
            vendor: trip.vendor || "",
            invoice_number: trip.invoice_number || "",
          });

          if (trip.vehicles?.length > 0) {
            setVehicleEntries(trip.vehicles.map(ve => ({
              ...ve,
              driver_id: String(ve.driver_id || ""),
              driver_name: ve.driver?.name || (drivers.find(d => d.id === ve.driver_id)?.name || ""),
              vehicle_type: ve.vehicle_type || (vehicles.find(v => v.vehicle_number === ve.vehicle_number)?.vehicle_type || ""),
              seat_count: ve.seat_count ?? (vehicles.find(v => v.vehicle_number === ve.vehicle_number)?.seat_count ?? ""),
              cost_per_km: ve.cost_per_km ?? trip.cost_per_km ?? "",
              pricing_type: ve.pricing_type || trip.pricing_type || "per_km",
              package_amount: ve.package_amount ?? trip.package_amount ?? "",
              vendor_deduction_description: ve.vendor_deduction_description || "",
              vendor_deduction_amount: ve.vendor_deduction_amount ?? "",
              vendor_deduction_note: ve.vendor_deduction_note || "",
              vendor_deduction_vendor: ve.vendor_deduction_vendor || "",
              expenses: ve.expenses || [],
              // Filter driver changes for THIS vehicle number
              driver_changes: (trip.driver_changes || []).filter(dc => dc.vehicle_number === ve.vehicle_number)
            })));
          } else if (trip.vehicle_number || trip.driver_id) {
            setVehicleEntries([{
              ...createVehicleEntry(),
              vehicle_number: trip.vehicle_number || "",
              driver_id: String(trip.driver_id || ""),
              driver_name: trip.driver?.name || (drivers.find(d => d.id === trip.driver_id)?.name || ""),
              vehicle_type: trip.vehicle_type || (vehicles.find(v => v.vehicle_number === trip.vehicle_number)?.vehicle_type || ""),
              seat_count: trip.seat_count ?? (vehicles.find(v => v.vehicle_number === trip.vehicle_number)?.seat_count ?? ""),
              start_km: trip.start_km ?? "",
              end_km: trip.end_km ?? "",
              distance_km: trip.distance_km ?? "",
              driver_bhatta: trip.driver_bhatta ?? "",
              fuel_cost: trip.fuel_cost ?? 0,
              fuel_litres: trip.fuel_litres ?? 0,
              diesel_used: trip.diesel_used ?? 0,
              petrol_used: trip.petrol_used ?? 0,
              fuel_price: trip.fuel_price ?? 0,
              fuel_vendor: trip.fuel_vendor || "",
              toll_amount: trip.toll_amount ?? 0,
              parking_amount: trip.parking_amount ?? 0,
              other_expenses: 0,
              vendor_deduction_description: trip.vendor_deduction_description || "",
              vendor_deduction_amount: trip.vendor_deduction_amount ?? "",
              vendor_deduction_note: trip.vendor_deduction_note || "",
              vendor_deduction_vendor: trip.vendor_deduction_vendor || "",
              cost_per_km: trip.cost_per_km ?? "",
              pricing_type: trip.pricing_type || "per_km",
              package_amount: trip.package_amount ?? "",
              expenses: [],
              driver_changes: trip.driver_changes || [],
            }]);
          }

          setPricingItems(trip.pricing_items || []);
          setChargeItems(trip.charge_items || []);
          setAdvancePayments(trip.payments || []);
          setDriverChanges(trip.driver_changes || []);

          const expRes = await api.get(`/driver-expenses/trip/${id}`);
          setDriverExpenses(expRes.data.map(e => ({ ...e, saved: true })));
        }
      } catch (error) {
        console.error("Error loading trip data:", error);
        showModal("Load Error", "Failed to load trip data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.form) setForm({ ...createInitialFormState(), ...parsed.form });
      if (parsed?.vehicleEntries?.length) setVehicleEntries(parsed.vehicleEntries);
      if (parsed?.pricingItems) setPricingItems(parsed.pricingItems);
      if (parsed?.chargeItems) setChargeItems(parsed.chargeItems);
      if (parsed?.driverChanges) setDriverChanges(parsed.driverChanges);
      if (parsed?.driverExpenses) setDriverExpenses(parsed.driverExpenses);
      if (parsed?.advancePayments) setAdvancePayments(parsed.advancePayments);
    } catch (error) {
      console.error("Error restoring draft:", error);
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      saveDraft();
    }, 600);
    return () => clearTimeout(timer);
  }, [
    isEdit,
    form,
    vehicleEntries,
    pricingItems,
    chargeItems,
    driverChanges,
    driverExpenses,
    advancePayments,
  ]);

  useEffect(() => {
    if (!vehicles.length) return;
    setVehicleEntries((prev) => {
      let changed = false;
      const next = prev.map((entry) => {
        if (!entry.vehicle_number) return entry;
        const match = vehicles.find((v) => v.vehicle_number === entry.vehicle_number);
        if (!match) return entry;
        const nextType = entry.vehicle_type || match.vehicle_type || "";
        const nextSeats = entry.seat_count || (match.seat_count ?? "");
        if (nextType === entry.vehicle_type && nextSeats === entry.seat_count) return entry;
        changed = true;
        return { ...entry, vehicle_type: nextType, seat_count: nextSeats };
      });
      return changed ? next : prev;
    });
  }, [vehicles]);

  /* ============ CUSTOMER FILTERING ============ */
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

  /* ============ NESTED STATE HANDLERS ============ */
  const addVehicleEntry = () => {
    const next = [...vehicleEntries, { ...createVehicleEntry(), pricing_type: form.pricing_type, package_amount: form.package_amount, cost_per_km: form.cost_per_km }];
    setVehicleEntries(next);
    setForm((prev) => {
      const currentCount = Number(prev.number_of_vehicles || 0);
      return currentCount >= next.length ? prev : { ...prev, number_of_vehicles: next.length };
    });
  };
  const removeVehicleEntry = (index) => {
    if (vehicleEntries.length > 1) {
      setVehicleEntries(vehicleEntries.filter((_, i) => i !== index));
    }
  };

  const handleVehicleEntryChange = (index, field, value) => {
    setVehicleEntries(prev => prev.map((entry, i) => {
      if (i !== index) return entry;
      const updated = { ...entry, [field]: value };

      // Auto-calculate distance if start/end KM change
      if (field === "start_km" || field === "end_km") {
        const start = updated.start_km !== "" ? Number(updated.start_km) : null;
        const end = updated.end_km !== "" ? Number(updated.end_km) : null;
        if (start !== null && end !== null) {
          updated.distance_km = Math.max(end - start, 0);
        }
      }
      return updated;
    }));
  };

  const addDriverChangeToVehicle = (vIdx) => {
    setVehicleEntries(prev => prev.map((entry, i) =>
      i === vIdx ? { ...entry, driver_changes: [...entry.driver_changes, { driver_id: "", start_time: "", end_time: "", notes: "" }] } : entry
    ));
  };

  const removeDriverChangeFromVehicle = (vIdx, dIdx) => {
    setVehicleEntries(prev => prev.map((entry, i) =>
      i === vIdx ? { ...entry, driver_changes: entry.driver_changes.filter((_, idx) => idx !== dIdx) } : entry
    ));
  };

  const updateDriverChangeInVehicle = (vIdx, dIdx, field, value) => {
    setVehicleEntries(prev => prev.map((entry, i) => {
      if (i !== vIdx) return entry;
      const changes = entry.driver_changes.map((dc, idx) => idx === dIdx ? { ...dc, [field]: value } : dc);
      return { ...entry, driver_changes: changes };
    }));
  };

  const addExpenseToVehicle = (vIdx) => {
    setVehicleEntries(prev => prev.map((entry, i) =>
      i === vIdx ? { ...entry, expenses: [...entry.expenses, { expense_type: "", amount: "", vendor: "", notes: "" }] } : entry
    ));
  };

  const removeExpenseFromVehicle = (vIdx, eIdx) => {
    setVehicleEntries(prev => prev.map((entry, i) =>
      i === vIdx ? { ...entry, expenses: entry.expenses.filter((_, idx) => idx !== eIdx) } : entry
    ));
  };

  const updateExpenseInVehicle = (vIdx, eIdx, field, value) => {
    setVehicleEntries(prev => prev.map((entry, i) => {
      if (i !== vIdx) return entry;
      const expenses = entry.expenses.map((exp, idx) => idx === eIdx ? { ...exp, [field]: value } : exp);
      return { ...entry, expenses };
    }));
  };

  /* ============ HANDLERS ============ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };


  const saveNewVendor = async () => {
    if (!newVendorForm.name.trim()) {
      showModal("Validation Error", "Please enter a vendor name.");
      return;
    }
    if (newVendorForm.phone && !isValidIndianPhone(newVendorForm.phone)) {
      showModal("Validation Error", "Phone number must be a valid 10-digit Indian mobile number.");
      return;
    }

    setSavingVendor(true);
    try {
      const res = await api.post("/vendors", {
        name: newVendorForm.name.trim(),
        phone: newVendorForm.phone ? normalizeIndianPhone(newVendorForm.phone) : null,
        category: newVendorForm.category,
      });
      setVendors((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, vendor: res.data.name }));
      setShowNewVendorForm(false);
      setNewVendorForm({ name: "", phone: "", category: "fuel" });
    } catch (error) {
      showModal("Vendor Error", "Error creating vendor: " + (error.response?.data?.detail || error.message));
    } finally {
      setSavingVendor(false);
    }
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

  const saveNewCustomer = async () => {
    if (newCustomerForm.phone && !isValidIndianPhone(newCustomerForm.phone)) {
      showModal("Validation Error", "Phone number must be a valid 10-digit Indian mobile number.");
      return;
    }
    setSavingCustomer(true);
    try {
      const payload = {
        name: newCustomerForm.name,
        phone: newCustomerForm.phone ? normalizeIndianPhone(newCustomerForm.phone) : "",
        email: newCustomerForm.email || "",
        address: newCustomerForm.address || ""
      };
      const res = await api.post("/customers", payload);
      setCustomers([...customers, res.data]);
      setForm({
        ...form,
        customer_name: res.data.name,
        customer_id: String(res.data.id),
        customer_phone: res.data.phone || "",
        customer_address: res.data.address || "",
      });
      setShowNewCustomerForm(false);
      setNewCustomerForm({ name: "", phone: "", email: "", address: "" });
    } catch (err) {
      console.error(err);
      showModal("Error", err.response?.data?.detail || "Failed to save customer", "error");
    } finally {
      setSavingCustomer(false);
    }
  };

  /* ============ FORM SUBMISSION ============ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // Phone validation removed - all fields are optional
      const normalizedCustomerPhone = form.customer_phone ? normalizeIndianPhone(form.customer_phone) : null;
      let customer_id = form.customer_id;

      if (!customer_id && form.customer_name) {
        try {
          const res = await api.post("/customers", { name: form.customer_name.trim(), phone: normalizedCustomerPhone || "N/A" });
          customer_id = res.data.id;
          setCustomers(prev => [...prev, res.data]);
        } catch (err) {
          showModal("Customer Error", "Error creating customer: " + (err.response?.data?.detail || err.message));
          return;
        }
      }
      if (!customer_id) {
        const fallbackName = (form.customer_name || "").trim() || "Walk-in Customer";
        const existingFallback = customers.find(
          (c) => (c.name || "").trim().toLowerCase() === fallbackName.toLowerCase()
        );
        if (existingFallback) {
          customer_id = existingFallback.id;
        } else {
          try {
            const res = await api.post("/customers", {
              name: fallbackName,
              phone: normalizedCustomerPhone || "N/A",
            });
            customer_id = res.data.id;
            setCustomers((prev) => [...prev, res.data]);
          } catch (err) {
            showModal("Customer Error", "Error creating fallback customer: " + (err.response?.data?.detail || err.message));
            return;
          }
        }
      }

      const vendorName = form.vendor ? String(form.vendor).trim() : "";
      const normalizedInvoiceNumber = String(form.invoice_number || "").trim();
      const effectiveInvoiceNumber = normalizedInvoiceNumber || `DRAFT-${Date.now()}`;
      const computedFuelCost = Number(form.fuel_litres || 0) * Number(form.fuel_rate || 0);
      const fuelCostTotal = computedFuelCost || Number(form.fuel_cost || 0);
      const isNewAdvancePayment = (pay) =>
        !pay.id || typeof pay.id !== "number" || pay.id > 1000000000000;
      const normalizedEstimateAmount =
        form.estimate_amount === "" || form.estimate_amount == null
          ? null
          : Number(form.estimate_amount || 0);
      const normalizedAmountReceived = Number(form.amount_received || 0);
      const rawVehicleEntries = vehicleEntries.map(entry => {
        const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
        const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
        const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : null;
        const distanceKmValue = entry.distance_km !== "" ? Number(entry.distance_km) : derivedDistance;

        return {
          vehicle_number: entry.vehicle_number,
          driver_id: Number(entry.driver_id),
          vehicle_type: entry.vehicle_type || null,
          seat_count: entry.seat_count !== "" && entry.seat_count != null ? Number(entry.seat_count) : null,
          start_km: startKm,
          end_km: endKm,
          distance_km: distanceKmValue,
          driver_bhatta: Number(entry.driver_bhatta || 0),
          bus_type: entry.bus_type || null,
          bus_detail: entry.bus_detail || null,
          pricing_type: entry.pricing_type || form.pricing_type,
          package_amount:
            entry.package_amount !== "" && entry.package_amount != null
              ? Number(entry.package_amount)
              : Number(form.package_amount || 0),
          cost_per_km:
            entry.cost_per_km !== "" && entry.cost_per_km != null
              ? Number(entry.cost_per_km)
              : Number(form.cost_per_km || 0),
          fuel_cost: Number(entry.fuel_cost || 0),
          fuel_litres: Number(entry.fuel_litres || 0),
          diesel_used: Number(entry.diesel_used || 0),
          petrol_used: Number(entry.petrol_used || 0),
          fuel_price: Number(entry.fuel_price || 0),
          fuel_vendor: entry.fuel_vendor || null,
          toll_amount: Number(entry.toll_amount || 0),
          parking_amount: Number(entry.parking_amount || 0),
          other_expenses: Number(entry.other_expenses || 0),
          vendor_deduction_description: entry.vendor_deduction_description || null,
          vendor_deduction_amount: Number(entry.vendor_deduction_amount || 0),
          vendor_deduction_note: entry.vendor_deduction_note || null,
          vendor_deduction_vendor: entry.vendor_deduction_vendor || null,
          expenses: entry.expenses.map(exp => ({
            expense_type: exp.expense_type || "Party Fuel Entry",
            amount: Number(exp.amount || 0),
            vendor: exp.vendor || null,
            notes: exp.notes || null,
          })),
          driver_changes: entry.driver_changes.map(dc => ({
            driver_id: Number(dc.driver_id),
            start_time: dc.start_time || null,
            end_time: dc.end_time || null,
            notes: dc.notes || null,
          })),
        };
      });

      const enteredVehicleEntries = rawVehicleEntries.filter(entry => entry.vehicle_number || entry.driver_id);

      const resolvedVehicleEntries = enteredVehicleEntries.filter(entry => entry.vehicle_number && entry.driver_id);
      const primaryVehicle = resolvedVehicleEntries[0];
      const totalDistanceKm = resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.distance_km || 0), 0);
      const totalDriverBhatta = resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.driver_bhatta || 0), 0);
      const numberOfVehicles = Math.max(Number(form.number_of_vehicles || 0), resolvedVehicleEntries.length);

      const vehicleOtherExpensesTotal = resolvedVehicleEntries.reduce((sum, entry) => {
        return sum + Number(entry.other_expenses || 0);
      }, 0);

      const payload = {
        trip_date: form.trip_date || new Date().toISOString().split("T")[0],
        booking_id: form.booking_id || null,
        departure_datetime: form.departure_datetime || null,
        return_datetime: form.return_datetime || null,
        from_location: form.from_location || "TBD",
        to_location: form.to_location || "TBD",
        route_details: form.route_details || null,
        vehicle_number: primaryVehicle?.vehicle_number || null,
        driver_id: primaryVehicle?.driver_id || null,
        customer_id: Number(customer_id),
        customer_phone: normalizedCustomerPhone,
        customer_address: form.customer_address || null,
        number_of_vehicles: numberOfVehicles,
        bus_type: form.bus_type || null,
        bus_detail: form.bus_detail || null,
        start_km: primaryVehicle?.start_km ?? null,
        end_km: primaryVehicle?.end_km ?? null,
        distance_km: totalDistanceKm || null,
        diesel_used: resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.diesel_used || 0), 0),
        petrol_used: resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.petrol_used || 0), 0),
        fuel_litres: resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.fuel_litres || 0), 0),
        toll_amount: resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.toll_amount || 0), 0),
        parking_amount: resolvedVehicleEntries.reduce((sum, entry) => sum + Number(entry.parking_amount || 0), 0),
        other_expenses: Number(form.other_expenses || 0) + vehicleOtherExpensesTotal,
        driver_bhatta: totalDriverBhatta,
        pricing_type: form.pricing_type,
        package_amount: Number(form.package_amount || 0),
        cost_per_km: Number(form.cost_per_km || 0),
        charged_toll_amount: Number(totalToll || 0),
        charged_parking_amount: Number(totalParking || 0),
        discount_amount: Number(form.discount_amount || 0),
        estimate_amount: normalizedEstimateAmount,
        amount_received: normalizedAmountReceived,
        vendor: form.vendor || null,
        invoice_number: effectiveInvoiceNumber,
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
        vehicles: resolvedVehicleEntries,
      };

      try {
        let tripId = id; // Use existing ID in edit mode
        if (isEdit) {
          await api.put(`/trips/${id}`, payload);
        } else {
          const res = await api.post("/trips", payload);
          tripId = res.data.id;
        }

        // Save driver expenses
        for (const expense of driverExpenses) {
          if (!expense.saved && primaryVehicle?.driver_id) {
            await api.post("/driver-expenses", {
              trip_id: Number(tripId),
              driver_id: primaryVehicle?.driver_id,
              description: expense.description,
              amount: Number(expense.amount),
              notes: expense.notes || null,
            });
          }
        }

        // Save advance payments
        for (const pay of advancePayments) {
          if (isNewAdvancePayment(pay)) {
            await api.post("/payments", {
              trip_id: Number(tripId),
              payment_date: pay.payment_date || new Date().toISOString(),
              payment_mode: pay.payment_mode,
              amount: Number(pay.amount),
              notes: pay.notes
            });
          }
        }

        if (!isEdit) {
          clearDraft();
          navigate(`/trips/edit/${tripId}`);
        } else {
          navigate("/trips");
        }
      } catch (error) {
        console.error("Save error:", error);
        showModal("Save Error", error.response?.data?.detail || "Error saving trip. Please check your inputs.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showModal("Error", error.response?.data?.detail || "Error processing form");
    } finally {
      setLoading(false);
    }
  };

  const getTripDays = () => {
    if (!form.departure_datetime || !form.return_datetime) return 1;
    const start = new Date(form.departure_datetime);
    const end = new Date(form.return_datetime);
    const diffTime = Math.abs(end - start);
    const diffDays = parseFloat((diffTime / (1000 * 60 * 60 * 24)).toFixed(2));
    return diffDays || 1;
  };

  /* ============ CALCULATIONS ============ */
  const pricingItemsTotal = pricingItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const chargeItemsTotal = chargeItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const tripDays = getTripDays();
  const totalDistance = vehicleEntries.reduce((sum, entry) => {
    const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
    const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
    const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : 0;
    return sum + Number(entry.distance_km !== "" ? entry.distance_km : derivedDistance || 0);
  }, 0);

  const totalToll = vehicleEntries.reduce((sum, entry) => sum + Number(entry.toll_amount || 0), 0);
  const totalParking = vehicleEntries.reduce((sum, entry) => sum + Number(entry.parking_amount || 0), 0);

  const plannedVehicleCount = Math.max(Number(form.number_of_vehicles || 0), vehicleEntries.length);
  const getEntryPricingType = (entry) => entry.pricing_type || form.pricing_type || "per_km";
  const getEntryRateValue = (entry) =>
    entry.cost_per_km !== "" ? Number(entry.cost_per_km) : Number(form.cost_per_km || 0);
  const getEntryPackageValue = (entry) =>
    entry.package_amount !== "" ? Number(entry.package_amount) : Number(form.package_amount || 0);
  const perKmTotal = vehicleEntries.reduce((sum, entry) => {
    const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
    const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
    const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : 0;
    const distanceValue = entry.distance_km !== "" ? Number(entry.distance_km) : derivedDistance;
    const rateValue = getEntryRateValue(entry);
    return sum + (Number(distanceValue || 0) * Number(rateValue || 0));
  }, 0);

  const basePricing = vehicleEntries.reduce((sum, entry) => {
    const distance = (() => {
      const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
      const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
      const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : 0;
      return Number(entry.distance_km !== "" ? entry.distance_km : derivedDistance || 0);
    })();
    const rateValue = getEntryRateValue(entry);
    const entryPricingType = getEntryPricingType(entry);
    const packageValue = getEntryPackageValue(entry);
    const entryBase =
      entryPricingType === "package"
        ? packageValue
        : Number(distance || 0) * Number(rateValue || 0);
    return sum + Number(entryBase || 0);
  }, 0);

  const pricingItemsCharged = pricingItemsTotal * plannedVehicleCount;
  const totalExpenses = vehicleEntries.reduce((sum, entry) => {
    const toll = Number(entry.toll_amount || 0);
    const parking = Number(entry.parking_amount || 0);
    const other = Number(entry.other_expenses || 0);
    const extras = entry.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return sum + toll + parking + other + extras;
  }, 0);

  const getEntryDistance = (entry) => {
    const startKm = entry.start_km !== "" ? Number(entry.start_km) : null;
    const endKm = entry.end_km !== "" ? Number(entry.end_km) : null;
    const derivedDistance = startKm !== null && endKm !== null ? Math.max(endKm - startKm, 0) : 0;
    return Number(entry.distance_km !== "" ? entry.distance_km : derivedDistance || 0);
  };

  const getEntryRate = (entry) => getEntryRateValue(entry);

  const getEntryExtraExpenses = (entry) =>
    entry.expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const getEntryBaseFare = (entry) => {
    const distance = getEntryDistance(entry);
    const rate = getEntryRate(entry);
    const entryPricingType = getEntryPricingType(entry);
    const packageValue = getEntryPackageValue(entry);
    return entryPricingType === "package"
      ? Number(packageValue || 0)
      : Number(distance || 0) * Number(rate || 0);
  };

  const getEntryDescription = (entry, idx) => {
    const seatCount = entry.seat_count ?? "";
    const vehicleType = entry.vehicle_type || "";
    const parts = [];
    if (seatCount !== "") parts.push(`${seatCount} Seater`);
    if (vehicleType) parts.push(`(${vehicleType})`);
    if (parts.length) return parts.join(" ");
    return entry.vehicle_number || `Vehicle ${idx + 1}`;
  };

  const getEntryTotal = (entry) => {
    const baseFare = getEntryBaseFare(entry);
    const toll = Number(entry.toll_amount || 0);
    const parking = Number(entry.parking_amount || 0);
    const other = Number(entry.other_expenses || 0);
    const extras = getEntryExtraExpenses(entry);
    return baseFare + toll + parking + other + extras;
  };

  const totalVehicleOther = vehicleEntries.reduce((sum, entry) => {
    return sum + Number(entry.other_expenses || 0);
  }, 0);

  const totalChargedValue =
    basePricing +
    pricingItemsCharged +
    Number(totalToll || 0) +
    Number(totalParking || 0) +
    chargeItemsTotal +
    totalVehicleOther +
    Number(form.other_expenses || 0) -
    Number(form.discount_amount || 0);

  const isNewAdvancePayment = (pay) =>
    !pay.id || typeof pay.id !== "number" || pay.id > 1000000000000;
  const newAdvancePaymentsTotal = advancePayments
    .filter(isNewAdvancePayment)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const partyFuelEntryCredits = vehicleEntries.reduce(
    (sum, entry) => sum + (entry.expenses || []).reduce((s, exp) => s + Number(exp.amount || 0), 0),
    0
  );
  const vendorDeductionCredits = vehicleEntries.reduce(
    (sum, entry) => sum + Number(entry.vendor_deduction_amount || 0),
    0
  );
  const totalReceived = Number(form.amount_received || 0) + newAdvancePaymentsTotal;
  const totalCredits = totalReceived + partyFuelEntryCredits + vendorDeductionCredits;
  const pending = Math.max(0, totalChargedValue - totalCredits);
  const totalBill = totalChargedValue;
  const totalAdditionalCharges = pricingItemsCharged;

  const stopWheel = (e) => e.currentTarget.blur();

  const getTripDuration = (start, end) => {
    if (!start || !end) return { text: "-", totalDays: null };
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { text: "-", totalDays: null };
    }
    if (endDate < startDate) return { text: "-", totalDays: null };
    const diffMs = endDate - startDate;
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    if (hours) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    if (mins || parts.length === 0) parts.push(`${mins} min${mins !== 1 ? "s" : ""}`);

    const totalDays = Math.max(Math.ceil(totalMinutes / 1440), 1);
    return { text: parts.join(" "), totalDays };
  };

  const { text: tripDurationText, totalDays: tripTotalDays } = getTripDuration(
    form.departure_datetime,
    form.return_datetime
  );

  if (loading) return <div className="p-8 text-center font-black animate-pulse">LOADING TRIP DATA...</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 [&_label]:!text-black">
      {/* HEADER */}
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
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Refactored Multi-Vehicle Form</p>
        </div>
        {!isEdit && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveDraft}
              className="px-5 py-3 bg-white text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setForm(createInitialFormState());
                setVehicleEntries([createVehicleEntry()]);
                setPricingItems([]);
                setChargeItems([]);
                setDriverChanges([]);
                setDriverExpenses([]);
                setAdvancePayments([]);
              }}
              className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
            >
              Clear Draft
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20 max-w-7xl mx-auto">
        <div className="space-y-8">
          <div className="w-full space-y-8">

            {/* JOURNEY & CUSTOMER PARAMETERS */}
            <div className="glass-card p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-10 text-blue-600">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                1. Booking & Customer Details
              </h3>

              <div className="space-y-8">
                {/* ROW 1: Invoice | Booking | Invoice Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Invoice Number</label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={form.invoice_number}
                      onChange={handleChange}
                      placeholder="INV-XXXXXX"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Booking</label>
                    <input
                      type="text"
                      name="booking_id"
                      value={form.booking_id}
                      onChange={handleChange}
                      placeholder="Booking Third party or Self"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Invoice Date</label>
                    <input
                      type="date"
                      name="trip_date"
                      value={form.trip_date}
                      onChange={handleChange}
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* ROW 2: Customer Name | Phone | Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer / Party Name</label>
                    <div className="relative group/input">
                      <input
                        type="text"
                        name="customer_name"
                        autoComplete="off"
                        value={form.customer_name}
                        onChange={(e) => {
                          setForm({ ...form, customer_name: e.target.value, customer_id: "" });
                          setShowCustomerList(true);
                        }}
                        onFocus={() => setShowCustomerList(true)}
                        placeholder="Search party name..."
                        className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                      <svg className="w-4 h-4 absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest mt-1 flex items-center gap-1 transition-colors"
                    >
                      <span>+</span> Add New Customer
                    </button>
                    {showCustomerList && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 max-h-60 overflow-y-auto backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm({
                                ...form,
                                customer_name: c.name,
                                customer_id: String(c.id),
                                customer_phone: c.phone || "",
                                customer_address: c.address || ""
                              });
                              setShowCustomerList(false);
                            }}
                            className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                          >
                            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{c.name}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{c.phone || "Select"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer Phone</label>
                    <input
                      type="text"
                      name="customer_phone"
                      value={form.customer_phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer Address</label>
                    <input
                      type="text"
                      name="customer_address"
                      value={form.customer_address}
                      onChange={handleChange}
                      placeholder="Enter full address"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estimate / Total Fare</label>
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      name="estimate_amount"
                      value={form.estimate_amount}
                      onChange={handleChange}
                      placeholder="Enter estimated fare"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="text-left">
                    <p className="text-[13px] font-black uppercase tracking-widest text-emerald-500">Total Advance</p>
                    <p className="text-base font-black text-emerald-700">₹{Number(totalReceived || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Advance Payment Date</label>
                  <input
                    type="date"
                    value={newAdvance.payment_date}
                    onChange={(e) => setNewAdvance({ ...newAdvance, payment_date: e.target.value })}
                    className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Mode</label>
                  <select
                    value={newAdvance.payment_mode}
                    onChange={(e) => setNewAdvance({ ...newAdvance, payment_mode: e.target.value })}
                    className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                  <div className="relative group/input">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold tracking-tight">₹</span>
                    <input
                      type="number"
                      onWheel={stopWheel}
                      step="0.01"
                      value={newAdvance.amount}
                      onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                      className="w-full h-12 pl-8 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reference / Notes</label>
                  <input
                    type="text"
                    value={newAdvance.notes}
                    onChange={(e) => setNewAdvance({ ...newAdvance, notes: e.target.value })}
                    className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    placeholder="UPI ref, bank txn, remarks"
                  />
                </div>

                <div className="md:col-span-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  {advancePayments.length === 0 && (
                    <div className="flex-1 p-4 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      No advance payments added yet
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addAdvancePayment}
                    className="h-12 px-6 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    + Add Advance
                  </button>
                </div>
              </div>
              {advancePayments.length > 0 && (
                <div className="mt-6 space-y-3">
                  {advancePayments.map((pay, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-white rounded-xl border border-slate-100">
                      <div className="flex flex-wrap gap-4 items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDateDDMMYYYY(pay.payment_date)}</span>
                        <span className="text-xs font-black text-slate-700">{pay.payment_mode}</span>
                        <span className="text-sm font-black text-emerald-700">₹{Number(pay.amount || 0).toFixed(2)}</span>
                        {pay.notes ? <span className="text-xs font-bold text-slate-500">{pay.notes}</span> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAdvancePayment(idx)}
                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}



              {/* ROW 3: Trip Start | Trip End */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Start / Departure</label>
                  <input
                    type="datetime-local"
                    name="departure_datetime"
                    value={form.departure_datetime}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip End / Return</label>
                  <input
                    type="datetime-local"
                    name="return_datetime"
                    value={form.return_datetime}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Travel Time</label>
                  <input
                    type="text"
                    value={tripDurationText}
                    readOnly
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
                    placeholder="-"
                  />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Total Days: {tripTotalDays ?? "-"}
                  </p>
                </div>
              </div>

              {/* ROW 4: Pickup Location | Drop Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pickup Location</label>
                  <input
                    type="text"
                    name="from_location"
                    value={form.from_location}
                    onChange={handleChange}
                    placeholder="Pickup address/city"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Drop Location</label>
                  <input
                    type="text"
                    name="to_location"
                    value={form.to_location}
                    onChange={handleChange}
                    placeholder="Destination address/city"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Total Days: {tripTotalDays ?? "-"}
                  </p>
                </div>
              </div>

              {/* ROW 6: Trip Route */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Trip Route & Additional Notes</label>
                <textarea
                  name="route_details"
                  value={form.route_details}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Additional route points, stops, or client-specific notes..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* ROW 5: No of Bus | Vehicle Trip Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle details</label>
                  <input
                    type="text"
                    name="bus_detail"
                    value={form.bus_detail}
                    onChange={handleChange}
                    placeholder="e.g. 2 buses"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>


                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Trip Type</label>
                  <input
                    type="text"
                    name="bus_type"
                    value={form.bus_type}
                    onChange={handleChange}
                    placeholder="e.g. AC Sleeper Coach"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="flex items-center gap-4 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Trip"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/trips")}
                className="h-12 px-8 bg-white text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {isEdit && (
            <>
              <div className="w-full space-y-8 mt-5">
                {/* VEHICLE SECTION HEADER */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    2. Vehicle Details
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No of Bus / Vehicles</label>
                    <input
                      type="number"
                      onWheel={stopWheel}
                      name="number_of_vehicles"
                      value={form.number_of_vehicles}
                      onChange={handleChange}
                      min="0"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addVehicleEntry}
                    className="h-11 px-5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    + Add Vehicle
                  </button>
                </div>
                {/* VEHICLE LIST */}
                <div className="space-y-6">
                  {vehicleEntries.map((entry, index) => (
                    <VehicleCard
                      key={index}
                      index={index}
                      entry={entry}
                      vehicles={vehicles}
                      drivers={drivers}
                      vendors={vendors}
                      onEntryChange={handleVehicleEntryChange}
                      onRemoveVehicle={() => removeVehicleEntry(index)}
                      onAddDriverChange={addDriverChangeToVehicle}
                      onRemoveDriverChange={removeDriverChangeFromVehicle}
                      onDriverChangeUpdate={updateDriverChangeInVehicle}
                      onAddExpense={addExpenseToVehicle}
                      onRemoveExpense={removeExpenseFromVehicle}
                      onExpenseUpdate={updateExpenseInVehicle}
                      onAddNewVendor={() => setShowNewVendorForm(true)}
                    />
                  ))}

                  {vehicleEntries.length === 0 && (
                    <div className="p-20 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-slate-50/50">
                      <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight mb-2">No Vehicles Added</h4>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-10">Click the "+ Add Vehicle" button above to start building your trip roster</p>
                    </div>
                  )}
                </div>
              </div>

              {/* OTHER EXPENSES */}
              <div className="glass-card p-6 rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-blue-900/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    Other Expenses
                  </h3>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    These items will be added to the invoice total
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expense Type</label>
                    <input
                      type="text"
                      value={newChargeItem.description}
                      onChange={(e) => setNewChargeItem({ ...newChargeItem, description: e.target.value })}
                      placeholder="Expense Type (e.g. Food)"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="w-full lg:w-40">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                      <input
                        type="number"
                        onWheel={stopWheel}
                        step="0.01"
                        value={newChargeItem.amount}
                        onChange={(e) => setNewChargeItem({ ...newChargeItem, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-11 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addChargeItem}
                    className="h-11 px-5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                  >
                    + Add Other Expense
                  </button>
                </div>

                {chargeItems.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {chargeItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex-1">
                          <div className="text-sm font-black text-slate-700">{item.description}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Other Expense</div>
                        </div>
                        <div className="text-sm font-black text-emerald-600">
                          Rs. {Number(item.amount || 0).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeChargeItem(idx)}
                          className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Other Expenses Total</span>
                      <span className="text-sm font-black text-emerald-700">Rs. {chargeItemsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-6 text-center text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    No other expenses added yet
                  </div>
                )}
              </div>

              {/* TRIP SUMMARY (At the end) */}
              <div className="glass-card p-6 rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-blue-900/5 mt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    Trip Summary & Billing
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Type:</span>
                      <span className="text-xs font-black text-blue-600 uppercase">{form.bus_type || "Standard"}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing Model:</span>
                      <span className="text-xs font-black text-slate-700 uppercase">
                        {(() => {
                          if (!vehicleEntries.length) return "-";
                          const models = new Set(vehicleEntries.map((v) => getEntryPricingType(v)));
                          if (models.size > 1) return "Mixed";
                          const only = Array.from(models)[0];
                          return only === "package" ? "Package Rate" : "Per KM Rate";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {(() => {
                          if (!vehicleEntries.length) return "Rate / Package";
                          const models = new Set(vehicleEntries.map((v) => getEntryPricingType(v)));
                          if (models.size > 1) return "Rate / Package";
                          const only = Array.from(models)[0];
                          return only === "package" ? "Package Amount" : "Unit Rate (Rs/KM)";
                        })()}
                      </span>
                      <span className="text-xs font-black text-slate-700">
                        {(() => {
                          if (!vehicleEntries.length) return "-";
                          const models = new Set(vehicleEntries.map((v) => getEntryPricingType(v)));
                          const rateSet = new Set(
                            vehicleEntries.map((v) =>
                              getEntryPricingType(v) === "package"
                                ? getEntryPackageValue(v)
                                : getEntryRateValue(v)
                            )
                          );
                          if (models.size > 1 || rateSet.size > 1) return "Varies";
                          const only = Array.from(models)[0];
                          return only === "package"
                            ? `Rs. ${Number(getEntryPackageValue(vehicleEntries[0]) || 0).toFixed(2)}`
                            : `Rs. ${Number(getEntryRateValue(vehicleEntries[0]) || 0).toFixed(2)}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    {vehicleEntries.map((entry, idx) => {
                      const baseFare = getEntryBaseFare(entry);
                      const toll = Number(entry.toll_amount || 0);
                      const parking = Number(entry.parking_amount || 0);
                      const extras = getEntryExtraExpenses(entry);
                      const other = Number(entry.other_expenses || 0) + extras;
                      const rowTotal = baseFare + toll + parking + other;
                      const description = getEntryDescription(entry, idx);
                      const vehicleLabel = entry.vehicle_number || `Vehicle ${idx + 1}`;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Vehicle {idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-700 uppercase">{vehicleLabel}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] font-bold text-slate-600">
                              <thead className="bg-white text-[10px] uppercase tracking-widest text-slate-400">
                                <tr>
                                  <th className="px-4 py-3">Sr No</th>
                                  <th className="px-4 py-3">Description</th>
                                  <th className="px-4 py-3">Base Fare</th>
                                  <th className="px-4 py-3">Toll</th>
                                  <th className="px-4 py-3">Parking</th>
                                  <th className="px-4 py-3">Other</th>
                                  <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                <tr className="text-slate-700">
                                  <td className="px-4 py-3 font-black">{idx + 1}</td>
                                  <td className="px-4 py-3">{description}</td>
                                  <td className="px-4 py-3">Rs. {Number(baseFare || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3">Rs. {toll.toFixed(2)}</td>
                                  <td className="px-4 py-3">Rs. {parking.toFixed(2)}</td>
                                  <td className="px-4 py-3">Rs. {other.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-black">Rs. {Number(rowTotal || 0).toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Distance</span>
                        <p className="text-sm font-black text-slate-700">{totalDistance} KM</p>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Total Toll</span>
                        <p className="text-sm font-black text-blue-600">Rs. {totalToll.toFixed(0)}</p>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Total Parking</span>
                        <p className="text-sm font-black text-emerald-600">Rs. {totalParking.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="lg:col-span-1 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-5 shadow-inner">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Bill Amount</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-slate-400">Rs.</span>
                          <span className="text-2xl font-black text-slate-800 tracking-tighter">
                            {Number(totalBill).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Advance + Party Fuel Credit</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-emerald-400">Rs.</span>
                          <span className="text-xl font-black text-emerald-600 tracking-tighter">
                            {Number(totalCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Balance Due</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xs font-black ${Number(pending) > 0 ? "text-rose-400" : "text-emerald-400"}`}>Rs.</span>
                          <span className={`text-3xl font-black tracking-tight ${Number(pending) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {Number(pending).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">General Extra Expenses</label>
                        <input
                          type="number"
                          onWheel={stopWheel}
                          step="0.01"
                          name="other_expenses"
                          value={form.other_expenses}
                          onChange={handleChange}
                          className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Expenses</span>
                        <span className="text-sm font-black text-blue-400">Rs. {totalExpenses.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Toll (auto)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                            <input
                              type="text"
                              value={Number(totalToll || 0).toFixed(2)}
                              readOnly
                              className="w-full h-10 pl-9 pr-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-500 outline-none font-mono cursor-not-allowed"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Parking (auto)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                            <input
                              type="text"
                              value={Number(totalParking || 0).toFixed(2)}
                              readOnly
                              className="w-full h-10 pl-9 pr-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-500 outline-none font-mono cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                          {loading ? "Saving..." : (isEdit ? "Update Trip" : "Save Trip")}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate("/trips")}
                          className="px-6 h-12 bg-white text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4 group">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest leading-none">Multi-Vehicle Support</h4>
                  <p className="text-[8px] font-bold text-blue-600/70 uppercase mt-1">Distance & Expenses aggregate per vehicle</p>
                </div>
              </div>
            </>
          )}
        </div>
      </form>

      {/* NEW VENDOR MODAL */}
      {showNewVendorForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Add New Vendor
              </h3>
              <button type="button" onClick={() => setShowNewVendorForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vendor Name</label>
                <input
                  type="text"
                  value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  placeholder="Enter vendor name..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-bold"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={newVendorForm.phone}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                  placeholder="Optional phone number..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vendor Category</label>
                <select
                  value={newVendorForm.category}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, category: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="fuel">Fuel Vendor</option>
                  <option value="spare_parts">Spare Parts Vendor</option>
                  <option value="mechanic">Mechanic / Garage</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button
                type="button"
                onClick={() => setShowNewVendorForm(false)}
                className="flex-[1] h-14 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewVendor}
                disabled={savingVendor}
                className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingVendor ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Vendor"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col items-center">

            <div className="w-full text-center pt-10 pb-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add Customer</h2>
              <p className="text-slate-500 font-bold mt-2">Add a new customer to your records</p>
            </div>

            <div className="w-full p-8 max-w-lg space-y-6">

              <div className="space-y-2 relative z-10">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Customer Name</label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="+91-0000000000"
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Address</label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  placeholder="Street, City, Zip"
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-4 pt-6 mt-4 pb-4">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(false)}
                  className="flex-1 h-14 bg-slate-50 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNewCustomer}
                  disabled={savingCustomer}
                  className="flex-[1.5] h-14 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCustomer ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Customer"
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
