import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { homeForRole, workspaceLabels } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import "./SiteFooter.css";

const CONTACT_EMAIL = "hello@screenwise.io";
const CONTACT_PHONE = "+880 1700-000000";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

/**
 * Link columns, built per actor. A signed-in visitor never sees "Create account"
 * or "Sign in" here - those read as a logged-out state; they get the route back
 * into their own workspace instead. Internal `to` routes never dead-end;
 * `href` is used for contact.
 */
function columnsFor(role?: Role): FooterColumn[] {
  const keep = (links: (FooterLink | null)[]) => links.filter((l): l is FooterLink => l !== null);

  return [
    {
      heading: "Platform",
      links: keep([
        { label: "Browse open roles", to: "/" },
        { label: "How screening works", to: "/" },
        role
          ? { label: `Go to ${workspaceLabels[role].toLowerCase()}`, to: homeForRole(role) }
          : { label: "Create account", to: "/register" },
      ]),
    },
    {
      heading: "For companies",
      links: keep([
        role ? null : { label: "Register your company", to: "/register?type=company" },
        { label: "Recruiter dashboard", to: "/dashboard" },
        { label: "Jobs", to: "/jobs" },
      ]),
    },
    {
      heading: "For candidates",
      links: keep([
        { label: "Apply to a role", to: "/" },
        { label: "My applications", to: "/my-applications" },
        role === "candidate"
          ? { label: "Your profile", to: "/profile" }
          : role
            ? null
            : { label: "Sign in", to: "/login" },
      ]),
    },
    {
      heading: "Contact",
      links: [
        { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
        { label: CONTACT_PHONE, href: `tel:${CONTACT_PHONE.replace(/[^\d+]/g, "")}` },
      ],
    },
  ];
}

/**
 * App-wide footer for the public pages (Landing / Login / Register / 404).
 * Pass `role` inside a signed-in workspace to surface a shortcut back to that
 * workspace; omit it on public pages.
 */
export function SiteFooter({ role, className }: { role?: Role; className?: string }) {
  const year = new Date().getFullYear();
  const columns = columnsFor(role);

  return (
    <footer className={["site-footer", className].filter(Boolean).join(" ")}>
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <div className="site-footer__brand-row">
              <span className="site-footer__logo">
                <Sparkles size={16} />
              </span>
              <span className="site-footer__wordmark">
                Screen<span className="site-footer__wordmark-accent">wise</span>
              </span>
            </div>
            <p className="site-footer__tagline">
              Blind, explainable CV screening. The platform suggests - you always make the call.
            </p>
            {role ? (
              <Link to={homeForRole(role)} className="site-footer__workspace-link">
                Go to your workspace
              </Link>
            ) : null}
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="site-footer__column">
              <h3 className="site-footer__col-title">{col.heading}</h3>
              <ul className="site-footer__col-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a href={link.href} className="site-footer__link">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to!} className="site-footer__link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer__copyright">© {year} Screenwise</div>
      </div>
    </footer>
  );
}
