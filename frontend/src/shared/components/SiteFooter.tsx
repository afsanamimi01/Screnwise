import { Link } from "react-router-dom";
import { ArrowUp, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { homeForRole } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { cn } from "@/shared/lib/utils";

const CONTACT_EMAIL = "hello@screenwise.io";
const CONTACT_PHONE = "+880 1700-000000";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

/** Link columns. Internal `to` routes never dead-end; `href` is used for contact. */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Browse open roles", to: "/" },
      { label: "How screening works", to: "/" },
      { label: "Create account", to: "/register" },
    ],
  },
  {
    heading: "For companies",
    links: [
      { label: "Register your company", to: "/register?type=company" },
      { label: "Recruiter dashboard", to: "/dashboard" },
      { label: "Jobs", to: "/jobs" },
    ],
  },
  {
    heading: "For candidates",
    links: [
      { label: "Apply to a role", to: "/" },
      { label: "My applications", to: "/my-applications" },
      { label: "Sign in", to: "/login" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
      { label: CONTACT_PHONE, href: `tel:${CONTACT_PHONE.replace(/[^\d+]/g, "")}` },
    ],
  },
];

/** One-line reminder shown in the footer, tuned to what each role does here. */
const ROLE_NOTE: Record<Role, string> = {
  superadmin: "Every company, plan change and access action is written to the audit log.",
  hr: "The system suggests, you decide — nobody is ever auto-rejected.",
  manager: "You manage HR seats and the plan; recruiters run the screening.",
  candidate: "Your CV is screened blind, alongside everyone else's.",
};

/**
 * App-wide footer. Pass `role` inside a signed-in workspace to surface a
 * shortcut back to that workspace and the role-relevant note; omit it on
 * public pages.
 */
export function SiteFooter({ role, className }: { role?: Role; className?: string }) {
  const year = new Date().getFullYear();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className={cn("border-t bg-card/40", className)}>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">
                Screen<span className="text-primary">wise</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Blind, explainable CV screening. The platform suggests — you always make the call.
            </p>
            {role ? (
              <Link
                to={homeForRole(role)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Go to your workspace
              </Link>
            ) : null}
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to!}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* The super admin has a dedicated footer (admin/components/Footer.tsx),
            so this role-note / meta bar is skipped for them. */}
        {role !== "superadmin" ? (
          <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5">
              {role ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : null}
              {role ? ROLE_NOTE[role] : `© ${year} Screenwise · Portfolio project`}
            </span>
            <div className="flex items-center gap-4">
              {role ? <span>© {year} Screenwise</span> : null}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" /> {CONTACT_EMAIL}
              </a>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-accent hover:text-foreground"
              >
                <ArrowUp className="h-3.5 w-3.5" /> Back to top
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
