import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import "./ProtectedRoute.css";

/** Route guard: redirects to /login if signed out, or to the user's own home if their role isn't allowed here. */
export function ProtectedRoute({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();

  if (!ready) return <div className="protected-route-loading" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;

  return <>{children}</>;
}
