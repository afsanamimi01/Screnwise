import { Link, useLocation } from "react-router-dom";
import { ClipboardList, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hr-sidebar">
      <Link to="/" className="hr-sidebar__brand">
        <div className="hr-sidebar__brand-icon">
          <Sparkles className="hr-sidebar__brand-icon-glyph" />
        </div>
        <span className="hr-sidebar__brand-name">Screenwise</span>
      </Link>
      <nav className="hr-sidebar__nav">
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "hr-sidebar__nav-link",
                active ? "hr-sidebar__nav-link--active" : "hr-sidebar__nav-link--inactive",
              )}
            >
              <item.icon className="hr-sidebar__nav-link-icon" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hr-sidebar__footer-note">
        <ShieldCheck className="hr-sidebar__footer-icon" />
        The system suggests, you decide. Nobody is ever auto-rejected.
      </div>
    </aside>
  );
}
