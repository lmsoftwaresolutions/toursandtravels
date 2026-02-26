import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDateDDMMYYYY } from "../../utils/date";

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
        // Load payments for this trip
        api.get(`/payments/trip/${id}`)
          .then(r => setPayments(r.data))
          .catch(() => setPayments([]));
        
        // Load driver expenses
        api.get(`/driver-expenses/trip/${id}`)
          .then(r => setDriverExpenses(r.data))
          .catch(() => setDriverExpenses([]));
        
        // fetch customer and driver names (best-effort)
        if (res.data.customer_id) {
          api.get(`/customers/${res.data.customer_id}`)
            .then(r => setCustomerName(r.data.name))
            .catch(() => {});
        }
        if (res.data.driver_id) {
          api.get(`/drivers/${res.data.driver_id}`)
            .then(r => setDriverName(r.data.name || r.data.id))
            .catch(() => {});
        }
      } catch (e) {
        setError("Unable to load trip");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-6">Loading trip...</div>;
  if (error || !trip) return <div className="p-6 text-red-600">{error || "Trip not found"}</div>;

  const totalCharged = trip.total_charged ?? 0;
  const pending = trip.pending_amount ?? 0;
  const received = trip.amount_received ?? 0;
  const totalDriverExpenses = driverExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pricingLabel = trip.pricing_type === "package" ? "Package" : "Per KM";
  const pricingItems = (trip.pricing_items || []).filter(i => i.item_type !== "charge");
  const chargeItems = (trip.pricing_items || []).filter(i => i.item_type === "charge");
  const fuelTotal = (trip.diesel_used ?? 0) + (trip.petrol_used ?? 0);
  const fuelRate = trip.fuel_litres ? fuelTotal / trip.fuel_litres : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice #{trip.invoice_number || trip.id}</h1>
          <p className="text-gray-600 text-sm">Trip ID: {trip.id}</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => navigate(`/trips/edit/${trip.id}`)}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Edit
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Trip Info">
          <Row label="Date" value={formatDateDDMMYYYY(trip.trip_date)} />
          <Row label="From" value={trip.from_location} />
          <Row label="To" value={trip.to_location} />
          <Row label="Vehicle" value={trip.vehicle_number} />
          <Row label="Driver" value={driverName || trip.driver_id} />
          <Row label="Customer" value={customerName || trip.customer_id} />
          <Row label="Distance" value={`${trip.distance_km} km`} />
          <Row label="Start KM" value={trip.start_km ?? "-"} />
          <Row label="End KM" value={trip.end_km ?? "-"} />
          <Row label="Fuel Litres" value={trip.fuel_litres ?? "-"} />
          <Row label="Fuel Rate / L" value={`₹${fuelRate.toFixed(2)}`} />
          <Row label="Vendor" value={trip.vendor || "-"} />
        </Card>

        <Card title="Charges to Customer">
          <Row label="Pricing Type" value={pricingLabel} />
          {trip.pricing_type === "package" && (
            <Row label="Package Amount" value={`₹${(trip.package_amount ?? 0).toFixed(2)}`} />
          )}
          <Row label="Cost / km" value={`₹${(trip.cost_per_km ?? 0).toFixed(2)}`} />
          <Row label="Charged Toll" value={`₹${(trip.charged_toll_amount ?? 0).toFixed(2)}`} />
          <Row label="Charged Parking" value={`₹${(trip.charged_parking_amount ?? 0).toFixed(2)}`} />
          <Row label="Discount" value={`₹${(trip.discount_amount ?? 0).toFixed(2)}`} />
          <Row label="Total Charged" value={`₹${totalCharged.toFixed(2)}`} bold />
          <Row label="Received" value={`₹${received.toFixed(2)}`} />
          <Row label="Pending" value={`₹${pending.toFixed(2)}`} bold highlight={pending > 0} />
        </Card>
      </div>

      {pricingItems.length > 0 && (
        <Card title="Pricing Entries">
          <div className="space-y-2">
            {pricingItems.map((i) => (
              <div key={i.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold text-gray-800">{i.description}</p>
                </div>
                <p className="font-bold text-gray-800">₹ {Number(i.amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {chargeItems.length > 0 && (
        <Card title="Trip Charges">
          <div className="space-y-2">
            {chargeItems.map((i) => (
              <div key={i.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold text-gray-800">{i.description}</p>
                </div>
                <p className="font-bold text-gray-800">₹ {Number(i.amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Payments">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-600">No payments recorded for this trip.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold text-gray-800">{p.payment_mode}</p>
                  <p className="text-xs text-gray-500">{formatDateDDMMYYYY(p.payment_date)}</p>
                  {p.notes && <p className="text-xs text-gray-500">{p.notes}</p>}
                </div>
                <p className="font-bold text-green-700">₹ {Number(p.amount).toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="font-bold text-gray-800">Total Payments:</p>
              <p className="font-bold text-green-700 text-lg">₹ {totalPayments.toFixed(2)}</p>
            </div>
          </div>
        )}
      </Card>

      <Card title="Internal Costs">
        <div className="grid md:grid-cols-3 gap-3">
          <Row label="Fuel Cost (Total)" value={`₹${fuelTotal.toFixed(2)}`} />
          <Row label="Toll (expense)" value={`₹${(trip.toll_amount ?? 0).toFixed(2)}`} />
          <Row label="Parking (expense)" value={`₹${(trip.parking_amount ?? 0).toFixed(2)}`} />
          <Row label="Other Expenses" value={`₹${(trip.other_expenses ?? 0).toFixed(2)}`} />
          <Row label="Driver Bhatta" value={`₹${(trip.driver_bhatta ?? 0).toFixed(2)}`} />
          <Row label="Total Cost" value={`₹${(trip.total_cost ?? 0).toFixed(2)}`} bold />
        </div>
      </Card>

      {trip.driver_changes && trip.driver_changes.length > 0 && (
        <Card title="Driver Changes">
          <div className="space-y-2">
            {trip.driver_changes.map((dc) => (
              <div key={dc.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold text-gray-800">Driver #{dc.driver_id}</p>
                  <p className="text-xs text-gray-500">
                    {dc.start_time || "Start"} → {dc.end_time || "End"}
                  </p>
                  {dc.notes && <p className="text-xs text-gray-500">{dc.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Driver Expenses Section */}
      {driverExpenses.length > 0 && (
        <Card title="Driver Expenses">
          <div className="space-y-2">
            {driverExpenses.map((exp) => (
              <div key={exp.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-semibold text-gray-800">{exp.description}</p>
                  {exp.notes && <p className="text-xs text-gray-500">{exp.notes}</p>}
                </div>
                <p className="font-bold text-orange-600">₹ {Number(exp.amount).toFixed(2)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t-2 border-orange-300">
              <p className="font-bold text-gray-800">Total Driver Expenses:</p>
              <p className="font-bold text-orange-700 text-lg">₹ {totalDriverExpenses.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded shadow p-4 space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, bold, highlight }) {
  return (
    <div className={`flex justify-between text-sm ${highlight ? "text-red-600" : "text-gray-700"}`}>
      <span className="font-medium">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

