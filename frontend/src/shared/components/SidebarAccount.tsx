import { Link, useNavigate } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { roleLabels, useAuth } from "@/shared/lib/auth";

/**
 * Account section of the sidebar footer block: who you're signed in as and the
 * sign-out button. The footer's border/padding is owned by the parent so the
 * collapse toggle and this section read as one block.
 *
 * Candidates also get a "Site" link to the public job board (their only reason
 * to leave the workspace); staff roles just get a full-width sign-out button.
 */
export function SidebarAccount({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const iconButton =
    "border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const isCandidate = user.role === "candidate";
  // Under "Signed in as" candidates see their name; staff roles see their role
  // label instead (the name moves to the top-right of the header).
  const primary = isCandidate ? user.name : roleLabels[user.role];

  const signOutIcon = (
    <Button
      variant="outline"
      size="icon"
      className={"h-8 w-8 " + iconButton}
      aria-label="Sign out"
      title="Sign out"
      onClick={signOut}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        {isCandidate ? (
          <Button
            asChild
            variant="outline"
            size="icon"
            className={"h-8 w-8 " + iconButton}
            title="Browse jobs"
          >
            <Link to="/" aria-label="Browse jobs">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        {signOutIcon}
      </div>
    );
  }

  return (
    <div>
      <p className="px-1 text-[0.6875rem] uppercase tracking-wide text-sidebar-foreground/55">
        Signed in as
      </p>
      <p className="mb-2 truncate px-1 text-sm font-semibold">{primary}</p>
      {isCandidate ? (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className={"flex-1 gap-2 " + iconButton}>
            <Link to="/">
              <Home className="h-4 w-4" /> Site
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={"w-8 shrink-0 px-0 " + iconButton}
            aria-label="Sign out"
            title="Sign out"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className={"w-full gap-2 " + iconButton}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      )}
    </div>
  );
}
