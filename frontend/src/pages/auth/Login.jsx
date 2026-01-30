import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);
      await authService.login(username, password);
      navigate("/");
    } catch (err) {
      setError(typeof err === "string" ? err : "Invalid username or password");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Travel Management</h1>
            <p className="text-gray-600">Login to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-semibold mb-3">Demo Credentials:</p>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-mono font-semibold text-gray-800">Nathkrupa_1 / Nathkrupa_1</p>
                <p className="text-xs text-gray-600 mt-1">Admin - Full Access</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-mono font-semibold text-gray-800">Nathkrupa_2 / Nathkrupa_2</p>
                <p className="text-xs text-gray-600 mt-1">Admin - Full Access</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="font-mono font-semibold text-gray-800">Nathkrupa_3 / Nathkrupa_3</p>
                <p className="text-xs text-gray-600 mt-1">Limited - Restricted Access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
