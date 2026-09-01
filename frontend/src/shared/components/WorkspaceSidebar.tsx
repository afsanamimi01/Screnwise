import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Sparkles, type LucideIcon } from "lucide-react";
import { SidebarAccount } from "@/shared/components/SidebarAccount";
import { cn } from "@/shared/lib/utils";

export type SidebarNavItem = { to: string; label: string; icon: LucideIcon };

const STORAGE_KEY = "workspace.sidebar.collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Desktop workspace sidebar shared by the HR, manager and candidate shells:
 * brand, nav links, a role note, the account block, and a collapse toggle that
 * shrinks the whole thing to an icon rail. Collapse state is remembered in
 * localStorage so it survives navigation and reloads.
 */
export function WorkspaceSidebar({
  navItems,
  note,
}: {
  navItems: SidebarNavItem[];
  /** Small blurb shown in the accent card above the account block. Hidden while
   *  collapsed; omit it entirely to drop the card. */
  note?: ReactNode;
}) {
  const pathname = useLocation().pathname;
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable - collapse state stays in memory only */
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.25rem]" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2 px-5 py-5", collapsed && "justify-center px-0")}>
        <div className="rounded-lg bg-sidebar-primary p-1.5 text-sidebar-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed ? (
          <span className="text-sm font-semibold tracking-tight">Screenwise</span>
        ) : null}
      </div>

      <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed && note ? (
        <div className="m-3 rounded-lg bg-sidebar-accent/50 p-3 text-xs leading-relaxed text-sidebar-foreground/80">
          {note}
        </div>
      ) : null}

      {/* One pinned footer block: collapse toggle on top, account + sign-out below. */}
      <div className={cn("border-t border-sidebar-border/60", collapsed ? "p-2" : "p-3")}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-transparent px-3 py-2 text-[0.8125rem] text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            collapsed ? "mb-2 justify-center px-0" : "mb-3",
          )}
        >
          <ChevronLeft
            className={cn("h-4 w-4 shrink-0 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed ? "Collapse" : null}
        </button>

        <SidebarAccount collapsed={collapsed} />
      </div>
    </aside>
  );
}
