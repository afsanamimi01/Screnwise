import { useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

/** Super-admin top bar. */
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
