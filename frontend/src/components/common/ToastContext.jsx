import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ToastContext = createContext(null);

const TOAST_DURATION = 4000;
const MAX_TOASTS = 5;

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const STYLES = {
  success: {
    bg: "linear-gradient(135deg, rgba(236,253,245,0.97) 0%, rgba(209,250,229,0.95) 100%)",
    border: "1px solid rgba(16,185,129,0.3)",
    iconColor: "#059669",
    titleColor: "#065f46",
    msgColor: "#047857",
    progressBg: "#10b981",
    shadow: "0 8px 32px rgba(16,185,129,0.15), 0 2px 8px rgba(0,0,0,0.06)",
  },
  error: {
    bg: "linear-gradient(135deg, rgba(254,242,242,0.97) 0%, rgba(254,226,226,0.95) 100%)",
    border: "1px solid rgba(239,68,68,0.3)",
    iconColor: "#dc2626",
    titleColor: "#991b1b",
    msgColor: "#b91c1c",
    progressBg: "#ef4444",
    shadow: "0 8px 32px rgba(239,68,68,0.15), 0 2px 8px rgba(0,0,0,0.06)",
  },
  warning: {
    bg: "linear-gradient(135deg, rgba(255,251,235,0.97) 0%, rgba(254,243,199,0.95) 100%)",
    border: "1px solid rgba(245,158,11,0.3)",
    iconColor: "#d97706",
    titleColor: "#92400e",
    msgColor: "#b45309",
    progressBg: "#f59e0b",
    shadow: "0 8px 32px rgba(245,158,11,0.15), 0 2px 8px rgba(0,0,0,0.06)",
  },
  info: {
    bg: "linear-gradient(135deg, rgba(239,246,255,0.97) 0%, rgba(219,234,254,0.95) 100%)",
    border: "1px solid rgba(59,130,246,0.3)",
    iconColor: "#2563eb",
    titleColor: "#1e3a8a",
    msgColor: "#1d4ed8",
    progressBg: "#3b82f6",
    shadow: "0 8px 32px rgba(59,130,246,0.15), 0 2px 8px rgba(0,0,0,0.06)",
  },
};

const TITLES = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

/* ── single toast item ── */
function ToastItem({ toast: t, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());
  const frameRef = useRef(null);

  const s = STYLES[t.type] || STYLES.info;

  const dismiss = useCallback(() => {
    setIsExiting(true);
    clearTimeout(timerRef.current);
    cancelAnimationFrame(frameRef.current);
    setTimeout(() => onDismiss(t.id), 280);
  }, [onDismiss, t.id]);

  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, TOAST_DURATION);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(pct);
      if (pct > 0) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(frameRef.current);
    };
  }, [dismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: s.bg,
        border: s.border,
        boxShadow: s.shadow,
        borderRadius: "1rem",
        padding: "0",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: isExiting
          ? "toast-slide-out 0.28s cubic-bezier(0.4,0,1,1) forwards"
          : "toast-slide-in 0.36s cubic-bezier(0.21,1.02,0.73,1) forwards",
        cursor: "pointer",
        maxWidth: "420px",
        width: "100%",
        transition: "transform 0.2s ease",
      }}
      onClick={dismiss}
      onMouseEnter={() => {
        clearTimeout(timerRef.current);
        cancelAnimationFrame(frameRef.current);
      }}
      onMouseLeave={() => {
        startRef.current = Date.now() - (TOAST_DURATION * (1 - progress / 100));
        timerRef.current = setTimeout(dismiss, (TOAST_DURATION * progress) / 100);
        const tick = () => {
          const elapsed = Date.now() - startRef.current;
          const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
          setProgress(pct);
          if (pct > 0) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px 12px" }}>
        {/* icon */}
        <div
          style={{
            flexShrink: 0,
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: s.iconColor,
            background: `${s.iconColor}15`,
          }}
        >
          {ICONS[t.type]}
        </div>

        {/* content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: s.titleColor,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              marginBottom: "3px",
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {TITLES[t.type]}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 500,
              color: s.msgColor,
              lineHeight: 1.45,
              fontFamily: "'Inter', sans-serif",
              wordBreak: "break-word",
            }}
          >
            {t.message}
          </div>
        </div>

        {/* close btn */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          style={{
            flexShrink: 0,
            width: "24px",
            height: "24px",
            borderRadius: "8px",
            border: "none",
            background: `${s.iconColor}10`,
            color: s.iconColor,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "background 0.15s",
          }}
          aria-label="Dismiss notification"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* progress bar */}
      <div style={{ height: "3px", background: `${s.iconColor}12`, width: "100%" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: s.progressBg,
            borderRadius: "0 0 1rem 1rem",
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ── toast container ── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
    return id;
  }, []);

  const toast = {
    success: (msg) => show("success", msg),
    error: (msg) => show("error", msg),
    warning: (msg) => show("warning", msg),
    info: (msg) => show("info", msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* global CSS keyframes */}
      <style>{`
        @keyframes toast-slide-in {
          0% { opacity: 0; transform: translateY(-16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-slide-out {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(80px) scale(0.92); }
        }
      `}</style>

      {/* toast portal */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            pointerEvents: "none",
            maxWidth: "min(420px, calc(100vw - 40px))",
            width: "100%",
          }}
        >
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default ToastContext;
