import { NavLink } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/auth";

export default function Sidebar() {
  const [vendorsOpen, setVendorsOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // 👈 mobile sidebar
  const isAdmin = authService.isAdmin();

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded ${
      isActive ? "bg-gray-700" : "hover:bg-gray-800"
    }`;

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 bg-gray-900 text-white p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="text-2xl"
        >
          ☰
        </button>
        <h1 className="text-lg font-bold">Tour & Travel</h1>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 z-50
          h-full w-64
          bg-gray-900 text-white
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <h1 className="p-4 text-xl font-bold border-b border-gray-700">
          Tour & Travel
        </h1>

        <nav className="flex flex-col gap-1 p-2 overflow-y-auto">
          <NavLink to="/" onClick={() => setIsOpen(false)} className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/vehicles" onClick={() => setIsOpen(false)} className={linkClass}>
            Vehicles
          </NavLink>

          <NavLink to="/trips" onClick={() => setIsOpen(false)} className={linkClass}>
            Trips
          </NavLink>

          <NavLink to="/customers" onClick={() => setIsOpen(false)} className={linkClass}>
            Customers
          </NavLink>

          <NavLink to="/drivers" onClick={() => setIsOpen(false)} className={linkClass}>
            Drivers
          </NavLink>

          {/* Maintenance */}
          <button
            onClick={() => setMaintenanceOpen(!maintenanceOpen)}
            className="w-full px-4 py-2 rounded hover:bg-gray-800 text-left flex justify-between"
          >
            <span>Maintenance</span>
            <span className={`transition-transform ${maintenanceOpen ? "rotate-180" : ""}`}>▼</span>
          </button>

          {maintenanceOpen && (
            <div className="ml-4 flex flex-col gap-1">
              <NavLink to="/maintenance/emi" onClick={() => setIsOpen(false)} className={linkClass}>
                EMI
              </NavLink>
              <NavLink to="/maintenance/insurance" onClick={() => setIsOpen(false)} className={linkClass}>
                Insurance
              </NavLink>
              <NavLink to="/maintenance/tax" onClick={() => setIsOpen(false)} className={linkClass}>
                Tax
              </NavLink>
            </div>
          )}

          {/* Vendors */}
          <button
            onClick={() => setVendorsOpen(!vendorsOpen)}
            className="w-full px-4 py-2 rounded hover:bg-gray-800 text-left flex justify-between"
          >
            <span>Vendors</span>
            <span className={`transition-transform ${vendorsOpen ? "rotate-180" : ""}`}>▼</span>
          </button>

          {vendorsOpen && (
            <div className="ml-4 flex flex-col gap-1">
              <NavLink to="/vendors/fuel" onClick={() => setIsOpen(false)} className={linkClass}>
                Fuel
              </NavLink>
              <NavLink to="/vendors/other" onClick={() => setIsOpen(false)} className={linkClass}>
                Other (Spare Parts)
              </NavLink>
            </div>
          )}

          <NavLink to="/payments" onClick={() => setIsOpen(false)} className={linkClass}>
            Payments
          </NavLink>

          <NavLink to="/invoices" onClick={() => setIsOpen(false)} className={linkClass}>
            Invoices
          </NavLink>

          {isAdmin && (
            <NavLink to="/reports" onClick={() => setIsOpen(false)} className={linkClass}>
              Reports
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}
