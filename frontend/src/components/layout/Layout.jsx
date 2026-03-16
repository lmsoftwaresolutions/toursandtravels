import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get("print") === "true";

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-start">
        <main className="w-full h-full pb-10">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    // 🔥 flex ONLY on desktop
    <div className="h-screen bg-gray-100 md:flex">

      {/* Sidebar */}
      <Sidebar />

      {/* Right side */}
      <div className="w-full md:flex-1 flex flex-col">
        <Navbar />

        {/* Page content */}
        <main className="print-main p-8 md:p-12 overflow-y-auto flex-1 bg-white/50 backdrop-blur-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

