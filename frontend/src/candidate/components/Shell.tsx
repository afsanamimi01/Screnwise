import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./Shell.css";

/**
 * Candidate workspace skeleton - sidebar + (navbar / page / footer) + the
 * sign-in gate. It owns no page content: every page under candidate/pages
 * renders its own heading and body with its own stylesheet.
 */
export function Shell({
  children,
  allow = ["candidate"],
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
    return <div className="candidate-shell__blank" />;
  }

  return (
    <div className="candidate-shell">
      <Sidebar />

      <div className="candidate-shell__main">
        <Navbar />
        {children}
        <Footer />
      </div>
    </div>
  );
}
