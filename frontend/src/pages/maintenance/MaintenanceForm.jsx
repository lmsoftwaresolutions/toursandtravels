import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Modal from "../../components/common/Modal";

const getToday = () => new Date().toISOString().split("T")[0];

const getMonthlyEmi = (principal, annualRate, months) => {
  const p = Number(principal || 0);
  const r = Number(annualRate || 0) / 12 / 100;
  const n = Number(months || 0);
  if (p <= 0 || n <= 0) return 0;
  if (r === 0) return p / n;
  const f = Math.pow(1 + r, n);
  return (p * r * f) / (f - 1);
};

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams();
  const normalizedType = ["emi", "insurance", "tax"].includes(type) ? type : "emi";
  const preselectedVehicle = new URLSearchParams(location.search).get("vehicle") || "";

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [emiForm, setEmiForm] = useState({
    vehicle_purchase_price: "",
    down_payment: "",
    loan_amount: "",
    annual_interest_rate: "",
    duration_value: "",
    duration_unit: "months",
    emi_start_date: getToday(),
  });
  const [insuranceForm, setInsuranceForm] = useState({
    provider_name: "",
    policy_number: "",
    insurance_type: "comprehensive",
    start_date: getToday(),
    end_date: "",
    total_insurance_amount: "",
    renewal_status: "pending",
  });
  const [taxForm, setTaxForm] = useState({
    road_tax: "",
    permit_tax: "",
    fitness_tax: "",
    pollution_tax: "",
    permit_charges: "",
    other_taxes: "",
    tax_start_date: getToday(),
    tax_expiry_date: "",
    renewal_status: "pending",
  });

  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, typeValue = "error", onConfirm = null) => setModal({ isOpen: true, title, message, type: typeValue, onConfirm });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const typeLabels = { emi: "EMI", insurance: "Insurance", tax: "Tax" };

  const durationMonths = useMemo(() => {
    const value = Number(emiForm.duration_value || 0);
    if (value <= 0) return 0;
    return emiForm.duration_unit === "years" ? value * 12 : value;
  }, [emiForm.duration_unit, emiForm.duration_value]);

  const autoLoanAmount = useMemo(() => {
    if (emiForm.loan_amount !== "") return Number(emiForm.loan_amount || 0);
    return Number(emiForm.vehicle_purchase_price || 0) - Number(emiForm.down_payment || 0);
  }, [emiForm.down_payment, emiForm.loan_amount, emiForm.vehicle_purchase_price]);

  const autoMonthlyEmi = useMemo(
    () => getMonthlyEmi(autoLoanAmount, emiForm.annual_interest_rate, durationMonths),
    [autoLoanAmount, emiForm.annual_interest_rate, durationMonths]
  );

  const autoInsuranceMonthly = useMemo(() => Number(insuranceForm.total_insurance_amount || 0) / 12, [insuranceForm.total_insurance_amount]);
  const autoAnnualTax = useMemo(
    () =>
      Number(taxForm.road_tax || 0) +
      Number(taxForm.permit_tax || 0) +
      Number(taxForm.fitness_tax || 0) +
      Number(taxForm.pollution_tax || 0) +
      Number(taxForm.permit_charges || 0) +
      Number(taxForm.other_taxes || 0),
    [taxForm]
  );

  const loadVehicles = async () => {
    try {
      const res = await api.get("/vehicles");
      const vehicleList = res.data || [];
      setVehicles(vehicleList);
      if (vehicleList.length > 0) {
        if (preselectedVehicle && vehicleList.some((v) => v.vehicle_number === preselectedVehicle)) {
          setSelectedVehicle(preselectedVehicle);
        } else {
          setSelectedVehicle(vehicleList[0].vehicle_number);
        }
      }
    } catch {
      setError("Failed to load vehicles");
    }
  };

  const loadVehicleFinance = async (vehicleNumber) => {
    if (!vehicleNumber) return;
    try {
      const res = await api.get(`/vehicle-finance/vehicle/${vehicleNumber}`);
      const data = res.data || {};
      if (data.emi) {
        setEmiForm({
          vehicle_purchase_price: data.emi.vehicle_purchase_price ?? "",
          down_payment: data.emi.down_payment ?? "",
          loan_amount: data.emi.loan_amount ?? "",
          annual_interest_rate: data.emi.annual_interest_rate ?? "",
          duration_value: data.emi.loan_duration_months ?? "",
          duration_unit: "months",
          emi_start_date: data.emi.emi_start_date || getToday(),
        });
      }
      if (data.insurance) {
        setInsuranceForm({
          provider_name: data.insurance.provider_name || "",
          policy_number: data.insurance.policy_number || "",
          insurance_type: data.insurance.insurance_type || "comprehensive",
          start_date: data.insurance.start_date || getToday(),
          end_date: data.insurance.end_date || "",
          total_insurance_amount: data.insurance.total_insurance_amount ?? "",
          renewal_status: data.insurance.renewal_status || "pending",
        });
      }
      if (data.tax) {
        setTaxForm({
          road_tax: data.tax.road_tax ?? "",
          permit_tax: data.tax.permit_tax ?? "",
          fitness_tax: data.tax.fitness_tax ?? "",
          pollution_tax: data.tax.pollution_tax ?? "",
          permit_charges: data.tax.permit_charges ?? "",
          other_taxes: data.tax.other_taxes ?? "",
          tax_start_date: data.tax.tax_start_date || getToday(),
          tax_expiry_date: data.tax.tax_expiry_date || "",
          renewal_status: data.tax.renewal_status || "pending",
        });
      }
    } catch {
      // no-op for first time entry
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [preselectedVehicle]);

  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleFinance(selectedVehicle);
    }
  }, [selectedVehicle]);

  const saveEmi = async () => {
    await api.post(`/vehicle-finance/vehicle/${selectedVehicle}/emi`, {
      vehicle_purchase_price: Number(emiForm.vehicle_purchase_price || 0),
      down_payment: Number(emiForm.down_payment || 0),
      loan_amount: emiForm.loan_amount === "" ? null : Number(emiForm.loan_amount),
      annual_interest_rate: Number(emiForm.annual_interest_rate || 0),
      loan_duration_months: durationMonths,
      emi_start_date: emiForm.emi_start_date,
    });
  };

  const saveInsurance = async () => {
    await api.post(`/vehicle-finance/vehicle/${selectedVehicle}/insurance`, {
      ...insuranceForm,
      total_insurance_amount: Number(insuranceForm.total_insurance_amount || 0),
    });
  };

  const saveTax = async () => {
    await api.post(`/vehicle-finance/vehicle/${selectedVehicle}/tax`, {
      ...taxForm,
      road_tax: Number(taxForm.road_tax || 0),
      permit_tax: Number(taxForm.permit_tax || 0),
      fitness_tax: Number(taxForm.fitness_tax || 0),
      pollution_tax: Number(taxForm.pollution_tax || 0),
      permit_charges: Number(taxForm.permit_charges || 0),
      other_taxes: Number(taxForm.other_taxes || 0),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) {
      showModal("Validation Error", "Please select vehicle.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (normalizedType === "emi") await saveEmi();
      if (normalizedType === "insurance") await saveInsurance();
      if (normalizedType === "tax") await saveTax();
      showModal("Success", `${typeLabels[normalizedType]} details saved successfully.`, "success", () => navigate(`/maintenance/${normalizedType}`));
    } catch (err) {
      showModal("Error", err?.response?.data?.detail || "Failed to save details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Add Maintenance</h1>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Maintenance Type: {typeLabels[normalizedType]}</p>
      </div>

      {error ? (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
          <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
        </div>
      ) : null}

      <div className="glass-card p-10 rounded-[2.5rem] border border-slate-100">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="">Select Targeted Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
              ))}
            </select>
          </div>

          {normalizedType === "emi" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Vehicle Purchase Price" type="number" value={emiForm.vehicle_purchase_price} onChange={(v) => setEmiForm((p) => ({ ...p, vehicle_purchase_price: v }))} required />
              <Field label="Down Payment" type="number" value={emiForm.down_payment} onChange={(v) => setEmiForm((p) => ({ ...p, down_payment: v }))} required />
              <Field label="Loan Amount (Optional)" type="number" value={emiForm.loan_amount} onChange={(v) => setEmiForm((p) => ({ ...p, loan_amount: v }))} />
              <Field label="Interest Rate % (Yearly)" type="number" value={emiForm.annual_interest_rate} onChange={(v) => setEmiForm((p) => ({ ...p, annual_interest_rate: v }))} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration" type="number" value={emiForm.duration_value} onChange={(v) => setEmiForm((p) => ({ ...p, duration_value: v }))} required />
                <SelectField label="Unit" value={emiForm.duration_unit} onChange={(v) => setEmiForm((p) => ({ ...p, duration_unit: v }))} options={[{ value: "months", label: "Months" }, { value: "years", label: "Years" }]} />
              </div>
              <Field label="EMI Start Date" type="date" value={emiForm.emi_start_date} onChange={(v) => setEmiForm((p) => ({ ...p, emi_start_date: v }))} required />
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-sm">
                Auto Loan Amount: Rs. {Number(autoLoanAmount || 0).toFixed(2)}<br />
                Auto Monthly EMI: Rs. {Number(autoMonthlyEmi || 0).toFixed(2)}
              </div>
            </div>
          )}

          {normalizedType === "insurance" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Insurance Provider Name" value={insuranceForm.provider_name} onChange={(v) => setInsuranceForm((p) => ({ ...p, provider_name: v }))} required />
              <Field label="Policy Number" value={insuranceForm.policy_number} onChange={(v) => setInsuranceForm((p) => ({ ...p, policy_number: v }))} required />
              <Field label="Insurance Type" value={insuranceForm.insurance_type} onChange={(v) => setInsuranceForm((p) => ({ ...p, insurance_type: v }))} required />
              <Field label="Insurance Start Date" type="date" value={insuranceForm.start_date} onChange={(v) => setInsuranceForm((p) => ({ ...p, start_date: v }))} required />
              <Field label="Insurance End Date" type="date" value={insuranceForm.end_date} onChange={(v) => setInsuranceForm((p) => ({ ...p, end_date: v }))} required />
              <Field label="Total Insurance Amount" type="number" value={insuranceForm.total_insurance_amount} onChange={(v) => setInsuranceForm((p) => ({ ...p, total_insurance_amount: v }))} required />
              <SelectField label="Renewal Status" value={insuranceForm.renewal_status} onChange={(v) => setInsuranceForm((p) => ({ ...p, renewal_status: v }))} options={[{ value: "pending", label: "Pending" }, { value: "renewed", label: "Renewed" }, { value: "expired", label: "Expired" }]} />
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-sm">
                Monthly Insurance Cost (Auto): Rs. {Number(autoInsuranceMonthly || 0).toFixed(2)}
              </div>
            </div>
          )}

          {normalizedType === "tax" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Road Tax" type="number" value={taxForm.road_tax} onChange={(v) => setTaxForm((p) => ({ ...p, road_tax: v }))} />
              <Field label="Permit Tax" type="number" value={taxForm.permit_tax} onChange={(v) => setTaxForm((p) => ({ ...p, permit_tax: v }))} />
              <Field label="Fitness Tax" type="number" value={taxForm.fitness_tax} onChange={(v) => setTaxForm((p) => ({ ...p, fitness_tax: v }))} />
              <Field label="Pollution Tax" type="number" value={taxForm.pollution_tax} onChange={(v) => setTaxForm((p) => ({ ...p, pollution_tax: v }))} />
              <Field label="State/National Permit Charges" type="number" value={taxForm.permit_charges} onChange={(v) => setTaxForm((p) => ({ ...p, permit_charges: v }))} />
              <Field label="Other Taxes" type="number" value={taxForm.other_taxes} onChange={(v) => setTaxForm((p) => ({ ...p, other_taxes: v }))} />
              <Field label="Tax Start Date" type="date" value={taxForm.tax_start_date} onChange={(v) => setTaxForm((p) => ({ ...p, tax_start_date: v }))} required />
              <Field label="Tax Expiry Date" type="date" value={taxForm.tax_expiry_date} onChange={(v) => setTaxForm((p) => ({ ...p, tax_expiry_date: v }))} required />
              <SelectField label="Renewal Status" value={taxForm.renewal_status} onChange={(v) => setTaxForm((p) => ({ ...p, renewal_status: v }))} options={[{ value: "pending", label: "Pending" }, { value: "renewed", label: "Renewed" }, { value: "expired", label: "Expired" }]} />
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 font-bold text-sm">
                Annual Total Tax (Auto): Rs. {Number(autoAnnualTax || 0).toFixed(2)}<br />
                Monthly Tax Cost (Auto): Rs. {Number(autoAnnualTax / 12 || 0).toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/maintenance/${normalizedType}`)}
              className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-blue-900/20 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>

      <Modal isOpen={modal.isOpen} onClose={modal.onConfirm ? modal.onConfirm : closeModal} title={modal.title} message={modal.message} type={modal.type} />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </div>
  );
}
