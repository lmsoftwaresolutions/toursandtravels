import { NavLink } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/auth";

export default function Sidebar() {
  const [vendorsOpen, setVendorsOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const isAdmin = authService.isAdmin();

  return (
    <aside className="w-64 bg-gray-900 text-white">
      <h1 className="p-4 text-xl font-bold">Tour & Travel</h1>

      <nav className="flex flex-col gap-1 p-2">

        <NavLink to="/" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Dashboard
        </NavLink>

        <NavLink to="/vehicles" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Vehicles
        </NavLink>

        <NavLink to="/trips" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Trips
        </NavLink>

        <NavLink to="/customers" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Customers
        </NavLink>

        <NavLink to="/drivers" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Drivers
        </NavLink>

        {/* Maintenance Dropdown */}
        <div>
          <button
            onClick={() => setMaintenanceOpen(!maintenanceOpen)}
            className="w-full px-4 py-2 rounded hover:bg-gray-800 text-left flex justify-between items-center"
          >
            <span>Maintenance</span>
            <span className={`transform transition-transform ${maintenanceOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {maintenanceOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1">
              <NavLink to="/maintenance/emi" className={({ isActive }) =>
                `px-4 py-2 rounded text-sm ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }>
                EMI
              </NavLink>
              <NavLink to="/maintenance/insurance" className={({ isActive }) =>
                `px-4 py-2 rounded text-sm ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }>
                Insurance
              </NavLink>
              <NavLink to="/maintenance/tax" className={({ isActive }) =>
                `px-4 py-2 rounded text-sm ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }>
                Tax
              </NavLink>
            </div>
          )}
        </div>

        {/* Vendors Dropdown */}
        <div>
          <button
            onClick={() => setVendorsOpen(!vendorsOpen)}
            className="w-full px-4 py-2 rounded hover:bg-gray-800 text-left flex justify-between items-center"
          >
            <span>Vendors</span>
            <span className={`transform transition-transform ${vendorsOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {vendorsOpen && (
            <div className="ml-4 mt-1 flex flex-col gap-1">
              <NavLink to="/vendors/fuel" className={({ isActive }) =>
                `px-4 py-2 rounded text-sm ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }>
                Fuel
              </NavLink>
              <NavLink to="/vendors/other" className={({ isActive }) =>
                `px-4 py-2 rounded text-sm ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }>
                Other (Spare Parts)
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/payments" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Payments
        </NavLink>

        <NavLink to="/invoices" className={({ isActive }) =>
          `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
        }>
          Invoices
        </NavLink>

        {isAdmin && (
          <NavLink to="/reports" className={({ isActive }) =>
            `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
          }>
            Reports
          </NavLink>
        )}

      </nav>
    </aside>
  );
}
