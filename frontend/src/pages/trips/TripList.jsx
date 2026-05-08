import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { authService } from "../../services/auth";
import { formatDateDDMMYYYY } from "../../utils/date";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";

export default function Trips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const canWrite = !authService.hasLimitedAccess();

  const getPartyFuelCredit = (trip) =>
    (trip.vehicles || []).reduce((sum, vehicle) => {
      const directCredit = Number(vehicle.vendor_deduction_amount || 0);
      const entryCredits = (vehicle.expenses || []).reduce(
        (subtotal, exp) => subtotal + Number(exp.amount || 0),
        0
      );
      return sum + directCredit + entryCredits;
    }, 0);

  const getDueAmount = (trip) => {
    const totalCharged = Number(trip.total_charged || 0);
    const received = Number(trip.amount_received || 0);
    return Math.max(totalCharged - received - getPartyFuelCredit(trip), 0);
  };

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error", onConfirm: null });
  const showModal = (title, message, type = "error", onConfirm = null) =>
    setModal({ isOpen: true, title, message, type, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data));
    api.get("/customers").then(res => setCustomers(res.data));
    api.get("/drivers").then(res => setDrivers(res.data));

    const vehicleParam = searchParams.get("vehicle");
    if (vehicleParam) {
      setSelectedVehicle(vehicleParam);
      setActiveTab("all");
    } else {
      fetchAllTrips();
    }
    setInitialLoadDone(true);
  }, [searchParams]);

  const fetchAllTrips = async () => {
    const res = await api.get("/trips");
    setTrips(res.data || []);
  };

  const searchByVehicle = useCallback(async () => {
    if (!selectedVehicle) {
      fetchAllTrips();
      return;
    }
    const res = await api.get(`/trips/vehicle/${selectedVehicle}`);
    setTrips(res.data || []);
  }, [selectedVehicle]);

  useEffect(() => {
    if (initialLoadDone && selectedVehicle) {
      searchByVehicle();
    }
  }, [searchByVehicle, initialLoadDone, selectedVehicle]);

  /* ---------------- FILTER BY TAB ---------------- */
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    let filtered = trips;
    if (activeTab === "upcoming") {
      filtered = trips.filter(t => {
        const effectiveDate = t.departure_datetime
          ? String(t.departure_datetime).split("T")[0]
          : t.trip_date;
        return effectiveDate >= today;
      });
    } else if (activeTab === "completed") {
      filtered = trips.filter(t => {
        const effectiveDate = t.departure_datetime
          ? String(t.departure_datetime).split("T")[0]
          : t.trip_date;
        return effectiveDate < today;
      });
    }

    if (searchInvoice.trim()) {
      const invoiceQuery = searchInvoice.trim().toLowerCase();
      filtered = filtered.filter(t =>
        String(t.invoice_number || "").toLowerCase().includes(invoiceQuery)
      );
    }

    if (searchCustomer.trim()) {
      const customerQuery = searchCustomer.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const name = customers.find(c => c.id === t.customer_id)?.name || "";
        return name.toLowerCase().includes(customerQuery);
      });
    }

    setFilteredTrips(filtered);
  }, [trips, activeTab, searchInvoice, searchCustomer, customers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [trips.length, activeTab, searchInvoice, searchCustomer, selectedVehicle]);

  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    showModal(
      "Confirm Delete",
      "Are you sure you want to delete this trip? This action cannot be undone.",
      "warning",
      async () => {
        try {
          await api.delete(`/trips/${id}`);
          fetchAllTrips();
          closeModal();
        } catch (err) {
          showModal("Delete Error", "Failed to delete trip. Please try again.");
        }
      }
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">All Trips</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">View and manage all your trips</p>
        </div>

        <button
          onClick={() => navigate("/trips/add")}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Add Trip
        </button>
      </div>

      {/* ---------- FILTERS & TABS ---------- */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
          {["all", "upcoming", "completed"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <select
              className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-3">
            <div className="relative flex-1 group">
              <input
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="Search Customer..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="relative flex-1 group">
              <input
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="Invoice #..."
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={searchByVehicle}
            className="px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* ---------- TABLE ---------- */}
      <div className="glass-card rounded-3xl overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50 sticky top-0 z-10">
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice / Date</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Customer & Driver</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell text-right">Distance</th>
                <th className="border-b border-slate-100 p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell text-right">Payment</th>
                <th className="border-b border-slate-100 p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredTrips.length === 0 ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold">No trips found</td></tr>
              ) : (
                paginatedTrips.map(trip => (
                  <tr key={trip.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="p-6">
                      {(() => {
                        const hasVehicleAssigned = Boolean(trip.vehicle_number || (trip.vehicles && trip.vehicles.length));
                        return (
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-blue-600 tracking-tight">{trip.invoice_number || "PENDING"}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{formatDateDDMMYYYY(trip.trip_date)}</span>
                            <span
                              className={`mt-2 inline-flex w-fit items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${hasVehicleAssigned
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                                }`}
                            >
                              {hasVehicleAssigned ? "Vehicle Assigned" : "Pending Vehicle"}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-black text-slate-700">
                          {customers.find(c => c.id === trip.customer_id)?.name || trip.customer_id || "Direct Customer"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {trip.driver_id
                              ? (drivers.find(d => d.id === trip.driver_id)?.name || trip.driver_id || "Assigned Driver")
                              : "Pending Vehicle"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 hidden lg:table-cell text-right">
                      <div className="text-sm font-bold text-slate-700">{trip.distance_km ? `${trip.distance_km} KM` : "-"}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase">Distance</div>
                    </td>
                    <td className="p-6 hidden lg:table-cell text-right">
                      <div className="text-lg font-black text-slate-800 tracking-tight">₹{(trip.total_charged ?? 0).toLocaleString()}</div>
                      {getDueAmount(trip) > 0 ? (
                        <div className="text-[10px] text-rose-500 font-black uppercase mt-1 tracking-widest">₹{getDueAmount(trip).toLocaleString()} Due</div>
                      ) : (
                        <div className="text-[10px] text-emerald-500 font-black uppercase mt-1 tracking-widest">Paid in Full</div>
                      )}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/booking-receipts/${trip.id}`)}
                          className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all"
                        >
                          Booking Receipt
                        </button>
                        <button onClick={() => navigate(`/trips/${trip.id}`)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {canWrite ? (
                          <button onClick={() => navigate(`/trips/edit/${trip.id}`)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        ) : null}
                        {canWrite ? (
                          <button onClick={() => handleDelete(trip.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTrips.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
      {/* MODAL */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.onConfirm ? () => { } : closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      >
        {modal.onConfirm && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={modal.onConfirm}
              className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs"
            >
              Delete
            </button>
            <button
              onClick={closeModal}
              className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
