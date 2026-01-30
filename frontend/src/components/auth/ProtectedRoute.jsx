import { Navigate } from "react-router-dom";
import { authService } from "../services/auth";

export default function ProtectedRoute({ children, requiredRole = null }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === "admin" && !authService.isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h1>
          <p className="text-red-600">You need admin privileges to access this page.</p>
          <p className="text-sm text-gray-600 mt-4">Current role: {user?.role}</p>
        </div>
      </div>
    );
  }

  return children;
}
