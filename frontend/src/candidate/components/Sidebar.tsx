import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronLeft,
  FileStack,
  Home,
  LogOut,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/shared/lib/auth";
import "./Sidebar.css";

type NavItem = { to: string; label: string; icon: LucideIcon };

/**
 * Candidate workspace nav. The array order is the menu order - to rearrange the
 * sidebar, just move an entry up or down here.
 */
const NAV_ITEMS: NavItem[] = [
  { to: "/my-applications", label: "My applications", icon: FileStack },
  { to: "/open-roles", label: "Open roles", icon: Briefcase },
];

const STORAGE_KEY = "candidate.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Candidate sidebar - independent of the other actors. Brand, nav links, and a
 * pinned footer block (collapse toggle, "signed in as", a link to the public
 * site, sign out). Collapses to an icon rail; the choice is remembered in
 * localStorage. Desktop only.
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
      /* storage unavailable - collapse state stays in memory only */
    }
  }, [collapsed]);

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={"candidate-sidebar" + (collapsed ? " candidate-sidebar--collapsed" : "")}>
      <div className="candidate-sidebar__brand">
        <span className="candidate-sidebar__logo">
          <Sparkles size={16} />
        </span>
        <span className="candidate-sidebar__wordmark">Screenwise</span>
      </div>

      <nav className="candidate-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "candidate-sidebar__link" + (active ? " candidate-sidebar__link--active" : "")
              }
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="candidate-sidebar__link-icon" size={16} />
              <span className="candidate-sidebar__link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="candidate-sidebar__footer">
        <button
          type="button"
          className="candidate-sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="candidate-sidebar__toggle-icon" size={16} />
          <span className="candidate-sidebar__toggle-label">Collapse</span>
        </button>

        <div className="candidate-sidebar__account">
          <span className="candidate-sidebar__account-label">Signed in as</span>
          <span className="candidate-sidebar__account-name">{user?.name ?? "-"}</span>
          <div className="candidate-sidebar__account-actions">
            <Link to="/" className="candidate-sidebar__site" title="Browse the public site">
              <Home size={16} />
              <span className="candidate-sidebar__site-label">Site</span>
            </Link>
            <button
              type="button"
              className="candidate-sidebar__logout"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
