import { Link, useLocation } from "react-router-dom";
import { FileStack, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [{ to: "/my-applications", label: "My applications", icon: FileStack }];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="rounded-lg bg-sidebar-primary p-1.5 text-sidebar-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Screenwise</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
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
        The system suggests, you decide. Nobody is ever auto-rejected.
      </div>
    </aside>
  );
}
