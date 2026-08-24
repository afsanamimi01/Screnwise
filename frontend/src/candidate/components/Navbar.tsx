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
import { UserMenuTriggerButton } from "@/candidate/components/buttons/Buttons";
import { roleLabels, useAuth } from "@/shared/lib/auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-card/90 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Screenwise</span>
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">
        Blind screening is on for rank boards
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden font-normal sm:inline-flex">
          {roleLabels[user.role]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <UserMenuTriggerButton name={user.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
