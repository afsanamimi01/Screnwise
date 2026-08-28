import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Navbar.css";


export function Navbar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="candidate-navbar">
      <span className="candidate-navbar__subtitle">Your applications, your status</span>
      <span className="candidate-navbar__badge">{roleLabels[user.role]}</span>
    </header>
  );
}
