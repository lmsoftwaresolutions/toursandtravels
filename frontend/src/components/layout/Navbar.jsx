import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <header className="h-14 bg-white shadow flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">
          {user?.username}
        </span>
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {user?.role === "admin" ? "Admin" : "Limited"}
        </span>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
      >
        Logout
      </button>
    </header>
  );
}
