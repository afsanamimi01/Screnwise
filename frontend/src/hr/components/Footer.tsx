import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import "./Footer.css";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

/**
 * HR / recruiter footer - independent of the other actors. Reorder columns or
 * links by moving array entries; the "Contact" details are hard-coded here.
 */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Workspace",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Jobs", to: "/jobs" },
      { label: "Screen CVs", to: "/screen" },
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
  const year = new Date().getFullYear();

  return (
    <footer className="hr-footer">
      <div className="hr-footer__inner">
        <div className="hr-footer__top">
          <div className="hr-footer__brand">
            <div className="hr-footer__brand-row">
              <span className="hr-footer__logo">
                <Sparkles size={16} />
              </span>
              <span className="hr-footer__wordmark">
                Screen<span className="hr-footer__wordmark-accent">wise</span>
              </span>
            </div>
            <p className="hr-footer__tagline">
              The system suggests, you decide. Nobody is ever auto-rejected.
            </p>
          </div>

          <div className="hr-footer__columns">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="hr-footer__column">
                <h3 className="hr-footer__col-title">{col.heading}</h3>
                <ul className="hr-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <a className="hr-footer__link" href={link.href}>
                          {link.label}
                        </a>
                      ) : (
                        <Link className="hr-footer__link" to={link.to!}>
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

        <div className="hr-footer__copyright">© {year} Screenwise</div>
      </div>
    </footer>
  );
}
