import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileStack, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, roleLabels, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { cn } from "@/shared/lib/utils";

type NavItem = { to: string; label: string; icon: typeof FileStack };

/** Sidebar links for the hiring-manager workspace. Reorder / add / remove here. */
const NAV_ITEMS: NavItem[] = [
  { to: "/manager", label: "Shortlists to review", icon: FileStack },
];

export function ManagerShell({
  children,
  allow = ["manager"],
  title,
  description,
  actions,
}: {
  children: ReactNode;
  allow?: Role[];
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const { user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/login", { replace: true });
    else if (!allow.includes(user.role)) navigate(homeForRole(user.role), { replace: true });
  }, [ready, user, allow, navigate]);

  if (!ready || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="rounded-lg bg-sidebar-primary p-1.5 text-sidebar-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Screenwise</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-lg bg-sidebar-accent/50 p-3 text-xs leading-relaxed text-sidebar-foreground/80">
          <ShieldCheck className="mb-1 h-4 w-4 text-sidebar-primary" />
          You see shortlists after screening. Scores and identities were decided blind.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-card/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Screenwise</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            Read-only review access
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden font-normal sm:inline-flex">
              {roleLabels[user.role]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden text-sm sm:inline">{user.name}</span>
                </Button>
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-7 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </main>

        <SiteFooter role={user.role} />
      </div>
    </div>
  );
}
