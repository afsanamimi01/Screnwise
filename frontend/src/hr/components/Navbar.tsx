import { useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

/**
 * HR / recruiter top bar — the white strip beside the sidebar. Context line on
 * the left, the signed-in name on the right. Brand and sign-out live in the
 * sidebar.
 */
export function Navbar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="hr-navbar">
      <span className="hr-navbar__subtitle">Blind screening is on for rank boards</span>
      <span className="hr-navbar__badge">{user.name}</span>
    </header>
  );
}
