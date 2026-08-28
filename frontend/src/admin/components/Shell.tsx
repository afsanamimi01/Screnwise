import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./Shell.css";

export function Shell({
  children,
  allow = ["admin"],
  title,
  description,
  actions,
}: {
  children: ReactNode;
  allow?: Role[];
  title: string;
  description?: string;
  actions?: ReactNode;
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

        <main className="admin-shell__content">
          <div className="admin-shell__page-head">
            <div>
              <h1 className="admin-shell__title">{title}</h1>
              {description ? <p className="admin-shell__desc">{description}</p> : null}
            </div>
            {actions}
          </div>
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
