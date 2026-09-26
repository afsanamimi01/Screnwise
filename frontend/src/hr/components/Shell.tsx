import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./Shell.css";

/** HR / recruiter workspace skeleton. */
export function Shell({
  children,
  allow = ["hr", "manager"],
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
    return <div className="hr-shell__blank" />;
  }

  return (
    <div className="hr-shell">
      <Sidebar />

      <div className="hr-shell__main">
        <Navbar />

        <main className="hr-shell__content">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
