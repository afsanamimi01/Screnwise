import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!user) return null;

  return (
    <header className="admin-navbar">
      <div className="admin-navbar__brand">
        <Sparkles className="admin-navbar__brand-icon" size={16} />
        <span>Screenwise</span>
      </div>

      <div className="admin-navbar__subtitle">Full platform administration</div>

      <div className="admin-navbar__actions">
        <span className="admin-navbar__badge">{roleLabels[user.role]}</span>

        <div className="admin-navbar__user" ref={menuRef}>
          <button
            type="button"
            className="admin-navbar__user-trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="admin-navbar__avatar">{user.name.slice(0, 2).toUpperCase()}</span>
            <span className="admin-navbar__user-name">{user.name}</span>
          </button>

          {menuOpen ? (
            <div className="admin-navbar__menu" role="menu">
              <div className="admin-navbar__menu-head">
                <div className="admin-navbar__menu-name">{user.name}</div>
                <div className="admin-navbar__menu-email">{user.email}</div>
              </div>
              <div className="admin-navbar__menu-sep" />
              <button
                type="button"
                role="menuitem"
                className="admin-navbar__menu-item"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
