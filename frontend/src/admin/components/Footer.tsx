import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import "./Footer.css";

type FooterColumn = { heading: string; links: { label: string; to: string }[] };

/** Link columns for the admin footer. Every `to` is a real route. */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Browse open roles", to: "/" },
      { label: "How screening ", to: "/" },
      { label: "Create account", to: "/register" },
    ],
  },
  {
    heading: "For recruiters",
    links: [
      { label: "Recruiter dashboard", to: "/dashboard" },
      { label: "Jobs", to: "/jobs" },
      { label: "Review shortlists", to: "/manager" },
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
];

/**
 * Footer for the admin actor. Independent of the shared SiteFooter so it can
 * be customised separately — edit the columns and copy here freely.
 */
export function Footer() {
  const { user } = useAuth();
  const workspace = user ? homeForRole(user.role) : "/dashboard";

  return (
    <footer className="admin-footer">
      <div className="admin-footer__inner">
        <div className="admin-footer__grid">
          <div>
            <div className="admin-footer__brand">
              <span className="admin-footer__brand-badge">
                <Sparkles size={16} />
              </span>
              <span className="admin-footer__wordmark">
                Screen<span className="admin-footer__wordmark-accent">wise</span>
              </span>
            </div>
            <p className="admin-footer__tagline">
              Blind, explainable CV screening. The platform suggests — you always make the call.
            </p>
            <Link to={workspace} className="admin-footer__workspace">
              Go to your workspace
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="admin-footer__col-title">{col.heading}</h3>
              <ul className="admin-footer__col-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="admin-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
