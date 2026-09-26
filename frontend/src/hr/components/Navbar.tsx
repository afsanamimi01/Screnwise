import { useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

/** HR / recruiter top bar. */
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
