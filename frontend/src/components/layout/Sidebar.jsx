import { NavLink } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/auth";
import NathkrupaLogo from "../../assets/nathkrupa-logo.png";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isAdmin = authService.isAdmin();

  const navItems = [
    { to: "/", label: "Dashboard", icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { to: "/vehicles", label: "Vehicles", icon: <><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M5 17H3m13 0h2m-2 0a2 2 0 104 0" /></> },
    { to: "/trips", label: "Trips", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" /> },
    { to: "/customers", label: "Customers", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { to: "/drivers", label: "Drivers", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { to: "/maintenance/all", label: "Maintenance", icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></> },
    { to: "/vendors", label: "Vendors", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { to: "/payments", label: "Payments", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { to: "/invoices", label: "Invoices", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    ...(isAdmin ? [{ to: "/reports", label: "Reports", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> }] : []),
  ];

  return (
    <>
      <div className="no-print print:hidden md:hidden flex items-center justify-between bg-slate-900 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 rounded-2xl shadow-lg shadow-blue-500/10">
            <img src={NathkrupaLogo} alt="Nathkrupa" className="h-7 w-auto" />
          </div>
          <span className="font-bold text-lg tracking-tight">Nath Krupa</span>
        </div>
        <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="no-print fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
        />
      )}

      <aside
        className={`no-print 
          fixed md:sticky top-0 left-0 z-50
          h-full md:h-screen md:min-h-screen md:shrink-0
          ${isCollapsed ? "w-20" : "w-64 md:w-56 lg:w-64"}
          bg-slate-900 text-slate-300
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          md:translate-x-0 border-r border-slate-800
        `}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-8 bg-slate-800 text-slate-300 rounded-full p-1.5 shadow-lg hidden md:flex border border-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors z-50"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={`p-6 mb-4 ${isCollapsed ? 'px-4' : ''}`}>
          <div className={`flex items-center gap-3 mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-white p-2.5 rounded-2xl shadow-xl shadow-blue-500/10 shrink-0">
              <img src={NathkrupaLogo} alt="Nathkrupa" className={`${isCollapsed ? 'h-6' : 'h-8'} w-auto transition-all`} />
            </div>
            {/* {!isCollapsed && (
              // <div className="overflow-hidden whitespace-nowrap transition-all">
              //   <h2 className="text-white font-black text-xl tracking-tight leading-none">NATH KRUPA</h2>
              //   <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-1">TRAVEL SOLUTIONS</p>
              // </div>
            )} */}
          </div>
        </div>

        <nav className={`flex flex-col gap-3 overflow-y-auto h-[calc(100vh-160px)] no-scrollbar pb-32 ${isCollapsed ? 'px-3' : 'px-6'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              title={isCollapsed ? item.label : ""}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-2xl transition-all duration-300 group ${isActive
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 font-bold scale-[1.02]"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <svg className="w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

        </nav>

        <div className={`absolute bottom-0 left-0 w-full p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md transition-all ${isCollapsed ? 'px-4' : ''}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
              {authService.getUser()?.username?.[0]?.toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{authService.getUser()?.username}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{authService.getUser()?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
