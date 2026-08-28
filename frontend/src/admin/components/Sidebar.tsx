import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCog,
} from "lucide-react";
import "./Sidebar.css";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

/** Sidebar links for the admin console. Reorder / add / remove here. */
const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/admin/users", label: "Users & roles", icon: UserCog },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

const STORAGE_KEY = "admin.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar() {
  const pathname = useLocation().pathname;
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — collapse state stays in memory only */
    }
  }, [collapsed]);

  return (
    <aside className={"admin-sidebar" + (collapsed ? " admin-sidebar--collapsed" : "")}>
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__logo">
          <Sparkles size={16} />
        </span>
        <span className="admin-sidebar__wordmark">Screenwise</span>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={"admin-sidebar__link" + (active ? " admin-sidebar__link--active" : "")}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="admin-sidebar__link-icon" size={16} />
              <span className="admin-sidebar__link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar__note">
        <ShieldCheck className="admin-sidebar__note-icon" size={16} />
        <span className="admin-sidebar__note-text">
          Every role change and identity reveal is written to the audit log.
        </span>
      </div>

      <button
        type="button"
        className="admin-sidebar__toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-pressed={collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className="admin-sidebar__toggle-icon" size={16} />
        <span className="admin-sidebar__toggle-label">Collapse</span>
      </button>
    </aside>
  );
}
