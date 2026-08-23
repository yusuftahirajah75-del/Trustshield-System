import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div
          role="status"
          aria-live="polite"
          className="text-center"
        >
          <p className="text-lg font-medium">
            Checking your session...
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;