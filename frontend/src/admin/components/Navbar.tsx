import { useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

/**
 * Super-admin top bar — the white strip beside the sidebar. Context line on the
 * left, the signed-in name on the right. Brand and sign-out live in the sidebar.
 */
export function Navbar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="admin-navbar">
      <span className="admin-navbar__subtitle">Full platform administration</span>
      <span className="admin-navbar__badge">{user.name}</span>
    </header>
  );
}
