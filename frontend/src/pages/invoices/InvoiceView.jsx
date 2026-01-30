import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    try {
      const tripRes = await api.get(`/trips/${id}`);
      setTrip(tripRes.data);

      // Load related data
      const customerRes = await api.get("/customers");
      const custData = customerRes.data.find(c => c.id === tripRes.data.customer_id);
      setCustomer(custData);

      const vehicleRes = await api.get("/vehicles");
      const vehicleData = vehicleRes.data.find(v => v.vehicle_number === tripRes.data.vehicle_number);
      setVehicle(vehicleData);

      const driverRes = await api.get("/drivers");
      const driverData = driverRes.data.find(d => d.id === tripRes.data.driver_id);
      setDriver(driverData);
    } catch (error) {
      console.error("Error loading invoice:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const InvoiceContent = () => (
    <div className="bg-white p-8 rounded shadow" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* HEADER */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">INVOICE</h1>
          <p className="text-gray-600">INV-{String(trip.id).padStart(4, '0')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Invoice Date</p>
          <p className="font-semibold">{trip.trip_date}</p>
        </div>
      </div>

      {/* FROM & TO */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-sm text-gray-600 font-semibold">FROM</p>
          <p className="font-semibold">Nathkrupa Travels</p>
          <p className="text-sm text-gray-600">Pune, Maharashtra</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 font-semibold">BILL TO</p>
          <p className="font-semibold">{customer.name}</p>
          <p className="text-sm">{customer.email}</p>
          <p className="text-sm">{customer.phone}</p>
        </div>
      </div>

      {/* TRIP DETAILS */}
      <div className="mb-8 border p-4 rounded">
        <h3 className="font-semibold mb-4">Trip Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">From</p>
            <p className="font-semibold">{trip.from_location}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">To</p>
            <p className="font-semibold">{trip.to_location}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Vehicle</p>
            <p className="font-semibold">{trip.vehicle_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Driver</p>
            <p className="font-semibold">{driver?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Distance</p>
            <p className="font-semibold">{trip.distance_km} km</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Date</p>
            <p className="font-semibold">{trip.trip_date}</p>
          </div>
        </div>
      </div>

      {/* CHARGES TABLE */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {trip.pricing_type === "package" ? (
            <tr className="border-t">
              <td className="p-2">Package Fare</td>
              <td className="p-2 text-right">₹ {(trip.package_amount || 0).toFixed(2)}</td>
            </tr>
          ) : (
            <tr className="border-t">
              <td className="p-2">Base Fare ({trip.distance_km} km × ₹{trip.cost_per_km})</td>
              <td className="p-2 text-right">₹ {(trip.distance_km * trip.cost_per_km).toFixed(2)}</td>
            </tr>
          )}
          {trip.charged_toll_amount > 0 && (
            <tr className="border-t">
              <td className="p-2">Toll Charges</td>
              <td className="p-2 text-right">₹ {trip.charged_toll_amount.toFixed(2)}</td>
            </tr>
          )}
          {trip.charged_parking_amount > 0 && (
            <tr className="border-t">
              <td className="p-2">Parking Charges</td>
              <td className="p-2 text-right">₹ {trip.charged_parking_amount.toFixed(2)}</td>
            </tr>
          )}
          <tr className="border-t-2 border-b-2 font-semibold bg-gray-50">
            <td className="p-2">Total Charged</td>
            <td className="p-2 text-right">₹ {(trip.total_charged || 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* PAYMENT SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-xs text-gray-600">Amount Charged</p>
          <p className="text-lg font-bold">₹ {(trip.total_charged || 0).toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <p className="text-xs text-gray-600">Amount Paid</p>
          <p className="text-lg font-bold text-green-600">₹ {(trip.amount_received || 0).toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <p className="text-xs text-gray-600">Amount Due</p>
          <p className="text-lg font-bold text-red-600">₹ {(trip.pending_amount || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t pt-4 text-center text-xs text-gray-600">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated document.</p>
      </div>
    </div>
  );

  if (!trip || !customer) {
    return (
      <div className="p-6">
        <p>Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center no-print">
        <button
          onClick={() => navigate("/invoices")}
          className="text-blue-600 text-sm"
        >
          ← Back to Invoices
        </button>
        <button
          onClick={() => setShowPrintModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Print / Download PDF
        </button>
      </div>

      {/* On-page view (non-print) */}
      <div className="bg-white p-6 rounded shadow">
        <InvoiceContent />
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 justify-center no-print">
        <button
          onClick={() => setShowPrintModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          🖨️ Print Invoice
        </button>
        <button
          onClick={() => navigate("/invoices")}
          className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
        >
          Back
        </button>
      </div>

      {/* PRINT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center no-print">
          <div className="bg-white w-[95vw] max-w-5xl max-h-[90vh] overflow-auto rounded-lg shadow-xl p-6 relative">
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Invoice Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="invoice-print-area">
              <InvoiceContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
