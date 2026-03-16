import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="no-print h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">NATH KRUPA</h1>
        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">TRAVEL SOLUTIONS</p>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-[1.25rem] border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-black text-slate-800 leading-none mb-1.5 capitalize tracking-tight">
              {user?.username}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-blue-50 text-blue-600 border border-blue-100 leading-none">
              {user?.role === 'admin' ? 'Administrator' : user?.role}
            </span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 group"
        >
          <svg className="w-4 h-4 group-hover:transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

