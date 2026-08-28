import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Sidebar.css";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

/** Sidebar links for the super-admin console. Reorder / add / remove here. */
const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/pricing", label: "Pricing", icon: Tags },
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
          const active =
            item.to === "/admin"
              ? pathname === "/admin"
              : pathname === item.to || pathname.startsWith(item.to + "/");
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

      {/* One pinned footer block: collapse toggle on top, account + sign-out below. */}
      <div className="admin-sidebar__account">
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
        <span className="admin-sidebar__account-label">Signed in as</span>
        <span className="admin-sidebar__account-name">
          {user ? roleLabels[user.role] : "—"}
        </span>
        <button
          type="button"
          className="admin-sidebar__account-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span className="admin-sidebar__account-logout-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
