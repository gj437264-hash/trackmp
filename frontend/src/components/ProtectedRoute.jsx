import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, hasRole } from "@/context/AuthContext";

export function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="label-eyebrow">Verifying session…</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !hasRole(user, ...roles)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
