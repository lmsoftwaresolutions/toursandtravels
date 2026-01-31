import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    // 🔥 flex ONLY on desktop
    <div className="h-screen bg-gray-100 md:flex">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Right side */}
      <div className="w-full md:flex-1 flex flex-col">
        <Navbar />

        {/* Page content */}
        <main className="p-4 md:p-6 overflow-y-auto flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
