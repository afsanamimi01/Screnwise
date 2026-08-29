import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Sparkles,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Sidebar.css";

type NavItem = { to: string; label: string; icon: LucideIcon };

/** Recruiter-workspace nav — array order is the menu order. */
const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/screen", label: "Screen CVs", icon: UploadCloud },
];

const STORAGE_KEY = "hr.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * HR / recruiter sidebar — independent of the other actors. Brand, nav, and a
 * pinned footer block (collapse toggle + "signed in as" + sign out). Desktop only.
 */
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

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={"hr-sidebar" + (collapsed ? " hr-sidebar--collapsed" : "")}>
      <div className="hr-sidebar__brand">
        <span className="hr-sidebar__logo">
          <Sparkles size={16} />
        </span>
        <span className="hr-sidebar__wordmark">Screenwise</span>
      </div>

      <nav className="hr-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={"hr-sidebar__link" + (active ? " hr-sidebar__link--active" : "")}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="hr-sidebar__link-icon" size={16} />
              <span className="hr-sidebar__link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hr-sidebar__footer">
        <button
          type="button"
          className="hr-sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="hr-sidebar__toggle-icon" size={16} />
          <span className="hr-sidebar__toggle-label">Collapse</span>
        </button>

        <div className="hr-sidebar__account">
          <span className="hr-sidebar__account-label">Signed in as</span>
          <span className="hr-sidebar__account-name">{user ? roleLabels[user.role] : "—"}</span>
          <button
            type="button"
            className="hr-sidebar__logout"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
            <span className="hr-sidebar__logout-label">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
