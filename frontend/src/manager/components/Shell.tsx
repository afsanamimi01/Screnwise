import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { useManagerAccess } from "@/manager/lib/access";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PreviewBanner } from "./PreviewBanner";
import "./Shell.css";

/**
 * Company-manager console skeleton - sidebar + (navbar / page / footer) + the
 * sign-in gate. A manager whose company has no plan yet stays in "preview
 * mode": every screen is reachable, but actions are disabled and a banner
 * points them at the plan chooser (see `useManagerAccess`). Every manager page
 * renders its own heading, so this is a bare frame.
 */
export function Shell({ children, allow = ["manager"] }: { children: ReactNode; allow?: Role[] }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const { locked, reason } = useManagerAccess();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/login", { replace: true });
    else if (!allow.includes(user.role)) navigate(homeForRole(user.role), { replace: true });
  }, [ready, user, allow, navigate]);

  if (!ready || !user) {
    return <div className="manager-shell__blank" />;
  }

  return (
    <div className="manager-shell">
      <Sidebar locked={locked} />

      <div className="manager-shell__main">
        <Navbar />

        <main className="manager-shell__content">
          {locked && pathname !== "/billing" ? <PreviewBanner reason={reason} /> : null}
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
