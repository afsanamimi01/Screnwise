import { Link } from "react-router-dom";
import { ArrowUp, Mail, ShieldCheck, Sparkles } from "lucide-react";
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

/** One-line reminder shown in the footer, tuned to what each role does here. */
const ROLE_NOTE: Record<Role, string> = {
  superadmin: "Every company, plan change and access action is written to the audit log.",
  hr: "The system suggests, you decide - nobody is ever auto-rejected.",
  manager: "You manage HR seats and the plan; recruiters run the screening.",
  candidate: "Your CV is screened blind, alongside everyone else's.",
};

/**
 * App-wide footer for the public pages (Landing / Login / Register / 404).
 * Pass `role` inside a signed-in workspace to surface a shortcut back to that
 * workspace and the role-relevant note; omit it on public pages.
 */
export function SiteFooter({ role, className }: { role?: Role; className?: string }) {
  const year = new Date().getFullYear();
  const columns = columnsFor(role);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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

        {/* The super admin has a dedicated footer (admin/components/Footer.tsx),
            so this role-note / meta bar is skipped for them. */}
        {role !== "superadmin" ? (
          <div className="site-footer__meta">
            <span className="site-footer__note">
              {role ? (
                <span className="site-footer__note-icon">
                  <ShieldCheck size={14} />
                </span>
              ) : null}
              <span>{role ? ROLE_NOTE[role] : `© ${year} Screenwise · Portfolio project`}</span>
            </span>
            <div className="site-footer__meta-actions">
              {role ? <span>© {year} Screenwise</span> : null}
              <a href={`mailto:${CONTACT_EMAIL}`} className="site-footer__meta-link">
                <Mail size={14} /> {CONTACT_EMAIL}
              </a>
              <button type="button" onClick={scrollToTop} className="site-footer__top-btn">
                <ArrowUp size={14} /> Back to top
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
