import { NavLink } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/auth";
import NathkrupaLogo from "../../assets/nathkrupa-logo.svg";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = authService.isAdmin();

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`;

  return (
    <>
      <div className="no-print md:hidden flex items-center gap-3 bg-gray-900 text-white p-4">
        <button onClick={() => setIsOpen(true)} className="text-sm border border-gray-600 px-2 py-1 rounded">
          Menu
        </button>
        <div className="bg-white rounded px-2 py-1">
          <img src={NathkrupaLogo} alt="Nathkrupa" className="h-6 w-auto" />
        </div>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="no-print fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      <aside
        className={`no-print 
          fixed md:static top-0 left-0 z-50
          h-full w-64
          bg-gray-900 text-white
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="bg-white rounded px-2 py-2 inline-block">
            <img src={NathkrupaLogo} alt="Nathkrupa" className="h-7 w-auto" />
          </div>
        </div>

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

          <NavLink to="/maintenance/all" onClick={() => setIsOpen(false)} className={linkClass}>
            Maintenance
          </NavLink>

          <NavLink to="/vendors" onClick={() => setIsOpen(false)} className={linkClass}>
            Vendors
          </NavLink>

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

