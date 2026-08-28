import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./Shell.css";

/**
 * Super-admin console skeleton — sidebar + (navbar / page / footer) + the
 * sign-in gate. Owns no page content: every page under admin/pages renders its
 * own heading and body with its own stylesheet.
 */
export function Shell({
  children,
  allow = ["superadmin"],
}: {
  children: ReactNode;
  allow?: Role[];
}) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/login", { replace: true });
    else if (!allow.includes(user.role)) navigate(homeForRole(user.role), { replace: true });
  }, [ready, user, allow, navigate]);

  if (!ready || !user) {
    return <div className="admin-shell__blank" />;
  }

  return (
    <div className="admin-shell">
      <Sidebar />

      <div className="admin-shell__main">
        <Navbar />
        {children}
        <Footer />
      </div>
    </div>
  );
}
