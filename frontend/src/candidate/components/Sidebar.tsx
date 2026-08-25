import { Link, useLocation } from "react-router-dom";
import { FileStack, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import "./Sidebar.css";

const navItems = [{ to: "/my-applications", label: "My applications", icon: FileStack }];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="candidate-sidebar">
      <Link to="/" className="candidate-sidebar__brand">
        <div className="candidate-sidebar__brand-icon">
          <Sparkles className="candidate-sidebar__brand-icon-glyph" />
        </div>
        <span className="candidate-sidebar__brand-name">Screenwise</span>
      </Link>
      <nav className="candidate-sidebar__nav">
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "candidate-sidebar__nav-link",
                active
                  ? "candidate-sidebar__nav-link--active"
                  : "candidate-sidebar__nav-link--inactive",
              )}
            >
              <item.icon className="candidate-sidebar__nav-link-icon" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="candidate-sidebar__footer-note">
        <ShieldCheck className="candidate-sidebar__footer-icon" />
        The system suggests, you decide. Nobody is ever auto-rejected.
      </div>
    </aside>
  );
}
