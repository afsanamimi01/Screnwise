import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Sparkles,
  UploadCloud,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Sidebar.css";

type NavItem = { to: string; label: string; icon: LucideIcon };

/** Company-manager nav - array order is the menu order. */
const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/screen", label: "Screen CVs", icon: UploadCloud },
  { to: "/team", label: "HR team", icon: UsersRound },
  { to: "/billing", label: "Plan & billing", icon: CreditCard },
];

const STORAGE_KEY = "manager.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Company-manager sidebar - independent of the other actors. Brand, nav, and a
 * pinned footer block (collapse toggle + "signed in as" + sign out). When the
 * company has no plan yet, only "Plan & billing" is shown. Desktop only.
 */
export function Sidebar({ needsPlan = false }: { needsPlan?: boolean }) {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable - collapse state stays in memory only */
    }
  }, [collapsed]);

  const items = needsPlan ? NAV_ITEMS.filter((i) => i.to === "/billing") : NAV_ITEMS;

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={"manager-sidebar" + (collapsed ? " manager-sidebar--collapsed" : "")}>
      <div className="manager-sidebar__brand">
        <span className="manager-sidebar__logo">
          <Sparkles size={16} />
        </span>
        <span className="manager-sidebar__wordmark">Screenwise</span>
      </div>

      <nav className="manager-sidebar__nav">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "manager-sidebar__link" + (active ? " manager-sidebar__link--active" : "")
              }
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="manager-sidebar__link-icon" size={16} />
              <span className="manager-sidebar__link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="manager-sidebar__footer">
        <button
          type="button"
          className="manager-sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="manager-sidebar__toggle-icon" size={16} />
          <span className="manager-sidebar__toggle-label">Collapse</span>
        </button>

        <div className="manager-sidebar__account">
          <span className="manager-sidebar__account-label">Signed in as</span>
          <span className="manager-sidebar__account-name">
            {user ? roleLabels[user.role] : "-"}
          </span>
          <button
            type="button"
            className="manager-sidebar__logout"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
            <span className="manager-sidebar__logout-label">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
