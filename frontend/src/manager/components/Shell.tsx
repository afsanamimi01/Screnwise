import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyCompany } from "@/shared/lib/api";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./Shell.css";

/**
 * Company-manager console skeleton — sidebar + (navbar / page / footer) + the
 * sign-in gate + the no-plan redirect. Every manager page renders its own
 * heading, so this is a bare frame.
 */
export function Shell({ children, allow = ["manager"] }: { children: ReactNode; allow?: Role[] }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;

  const company = useQuery({
    queryKey: ["company"],
    queryFn: getMyCompany,
    enabled: ready && user?.role === "manager",
  });

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/login", { replace: true });
    else if (!allow.includes(user.role)) navigate(homeForRole(user.role), { replace: true });
  }, [ready, user, allow, navigate]);

  // A company with no plan yet can only see the plan chooser.
  const needsPlan = Boolean(company.data && !company.data.plan);
  useEffect(() => {
    if (needsPlan && pathname !== "/billing") navigate("/billing", { replace: true });
  }, [needsPlan, pathname, navigate]);

  if (!ready || !user) {
    return <div className="manager-shell__blank" />;
  }

  return (
    <div className="manager-shell">
      <Sidebar needsPlan={needsPlan} />

      <div className="manager-shell__main">
        <Navbar />

        <main className="manager-shell__content">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
