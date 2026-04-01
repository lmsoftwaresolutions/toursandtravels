import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const handleResetChange = (e) => {
    setResetError("");
    setResetForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setResetError("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = resetForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setResetError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("New password and confirm password do not match");
      return;
    }

    try {
      setIsSubmittingReset(true);
      await authService.resetPassword(currentPassword, newPassword);
      closeResetModal();
      alert("Password reset successful. Please login again.");
      handleLogout();
    } catch (error) {
      setResetError(typeof error === "string" ? error : "Failed to reset password");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <>
      <header className="no-print print:hidden h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">NATH KRUPA</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">TRAVEL SOLUTIONS</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 .552-.448 1-1 1s-1-.448-1-1a1 1 0 012 0zm0 0V8a4 4 0 10-8 0v3m14 0H6a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2v-5a2 2 0 00-2-2z" />
            </svg>
            <span className="hidden sm:inline">Reset Password</span>
          </button>

          <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-[1.25rem] border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <span className="block text-sm font-black text-slate-800 leading-none mb-1.5 capitalize tracking-tight">
                {user?.username}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-blue-50 text-blue-600 border border-blue-100 leading-none">
                {user?.role === "admin" ? "Administrator" : user?.role}
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

      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800">Reset Password</h2>
              <p className="text-xs text-slate-500 mt-1">Update your account password securely</p>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={resetForm.currentPassword}
                  onChange={handleResetChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={resetForm.newPassword}
                  onChange={handleResetChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={resetForm.confirmPassword}
                  onChange={handleResetChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  minLength={6}
                  required
                />
              </div>

              {resetError ? (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {resetError}
                </div>
              ) : null}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="px-4 h-10 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingReset ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
