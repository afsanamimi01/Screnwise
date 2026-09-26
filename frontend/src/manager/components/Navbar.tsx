import { useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

/** Company-manager top bar. */
export function Navbar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="manager-navbar">
      <span className="manager-navbar__subtitle">Company manager console</span>
      <span className="manager-navbar__badge">{user.name}</span>
    </header>
  );
}
