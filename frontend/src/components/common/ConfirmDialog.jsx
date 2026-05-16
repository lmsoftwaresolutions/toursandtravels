import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const ConfirmContext = createContext(null);

const TYPE_CONFIG = {
  danger: {
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#dc2626",
    confirmBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    confirmHover: "#b91c1c",
    confirmShadow: "0 4px 14px rgba(239,68,68,0.35)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  },
  warning: {
    iconBg: "rgba(245,158,11,0.1)",
    iconColor: "#d97706",
    confirmBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    confirmHover: "#b45309",
    confirmShadow: "0 4px 14px rgba(245,158,11,0.35)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    iconBg: "rgba(59,130,246,0.1)",
    iconColor: "#2563eb",
    confirmBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    confirmHover: "#1d4ed8",
    confirmShadow: "0 4px 14px rgba(59,130,246,0.35)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

function ConfirmModal({ config, onResult }) {
  const [isExiting, setIsExiting] = useState(false);
  const confirmBtnRef = useRef(null);
  const tc = TYPE_CONFIG[config.type || "danger"];

  const resolve = useCallback(
    (value) => {
      setIsExiting(true);
      setTimeout(() => onResult(value), 220);
    },
    [onResult]
  );

  /* keyboard: Enter = confirm, Escape = cancel */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") resolve(false);
      if (e.key === "Enter") resolve(true);
    };
    window.addEventListener("keydown", handler);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [resolve]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: isExiting
            ? "confirm-fade-out 0.22s ease forwards"
            : "confirm-fade-in 0.22s ease forwards",
        }}
        onClick={() => resolve(false)}
      />

      {/* dialog card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "1.5rem",
          border: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.05)",
          maxWidth: "400px",
          width: "100%",
          overflow: "hidden",
          animation: isExiting
            ? "confirm-zoom-out 0.22s cubic-bezier(0.4,0,1,1) forwards"
            : "confirm-zoom-in 0.28s cubic-bezier(0.21,1.02,0.73,1) forwards",
        }}
      >
        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          {/* icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: tc.iconBg,
              color: tc.iconColor,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            {tc.icon}
          </div>

          {/* title */}
          <h3
            id="confirm-title"
            style={{
              margin: "0 0 8px",
              fontSize: "17px",
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "'Outfit', 'Inter', sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            {config.title || "Are you sure?"}
          </h3>

          {/* message */}
          <p
            id="confirm-msg"
            style={{
              margin: 0,
              fontSize: "13.5px",
              fontWeight: 500,
              color: "#64748b",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.55,
            }}
          >
            {config.message || "This action cannot be undone."}
          </p>
        </div>

        {/* buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "0 24px 24px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => resolve(false)}
            style={{
              flex: 1,
              height: "44px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#475569",
              fontSize: "13.5px",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f1f5f9";
              e.target.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#f8fafc";
              e.target.style.borderColor = "#e2e8f0";
            }}
          >
            {config.cancelText || "Cancel"}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={() => resolve(true)}
            style={{
              flex: 1,
              height: "44px",
              borderRadius: "12px",
              border: "none",
              background: tc.confirmBg,
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              boxShadow: tc.confirmShadow,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.filter = "brightness(1)";
            }}
          >
            {config.confirmText || "Confirm"}
          </button>
        </div>
      </div>

      {/* keyframe animations */}
      <style>{`
        @keyframes confirm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes confirm-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes confirm-zoom-in {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confirm-zoom-out {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.92) translateY(8px); }
        }
      `}</style>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((config = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog(config);
    });
  }, []);

  const handleResult = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmModal config={dialog} onResult={handleResult} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export default ConfirmContext;
