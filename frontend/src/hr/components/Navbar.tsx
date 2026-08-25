import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { UserMenuTriggerButton } from "@/hr/components/buttons/Buttons";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import "./Navbar.css";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="hr-navbar">
      <div className="hr-navbar__brand-mobile">
        <Sparkles className="hr-navbar__brand-icon" />
        <span className="hr-navbar__brand-name">Screenwise</span>
      </div>
      <div className="hr-navbar__tagline">Blind screening is on for rank boards</div>
      <div className="hr-navbar__actions">
        <Badge variant="outline" className="hr-navbar__role-badge">
          {roleLabels[user.role]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <UserMenuTriggerButton name={user.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="hr-navbar__menu-content">
            <DropdownMenuLabel className="hr-navbar__menu-label">
              <div className="hr-navbar__menu-user-name">{user.name}</div>
              <div className="hr-navbar__menu-user-email">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="hr-navbar__signout-icon" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
