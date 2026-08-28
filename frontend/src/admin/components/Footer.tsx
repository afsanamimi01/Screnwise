import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import "./Footer.css";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

/**
 * Footer for the admin actor. Independent of the shared SiteFooter — edit the
 * columns freely; the "Contact" details are hard-coded here.
 */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Console",
    links: [
      { label: "Overview", to: "/admin" },
      { label: "Companies", to: "/admin/companies" },
      { label: "Users", to: "/admin/users" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Audit log", to: "/admin/audit" },
      { label: "Pricing", to: "/admin/pricing" },
      { label: "Public site", to: "/" },
    ],
  },
  {
    heading: "Reference",
    links: [
      { label: "Open roles", to: "/" },
      { label: "Sign out", to: "/login" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "hello@screenwise.io", href: "mailto:hello@screenwise.io" },
      { label: "+880 1700-000000", href: "tel:+8801700000000" },
    ],
  },
];

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
                    {link.href ? (
                      <a href={link.href} className="admin-footer__link">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to!} className="admin-footer__link">
                        {link.label}
                      </Link>
                    )}
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
