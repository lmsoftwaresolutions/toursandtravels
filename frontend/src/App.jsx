import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/ToastContext";
import { ConfirmProvider } from "./components/common/ConfirmDialog";
import { authService } from "./services/auth";

export default function App() {
  useEffect(() => {
    // Initialize auth on app load
    authService.initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
