import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import "./Footer.css";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

/**
 * Company-manager footer - independent of the other actors. Reorder columns or
 * links by moving array entries; the "Contact" details are hard-coded here.
 */
const COLUMNS: FooterColumn[] = [
  {
    heading: "Workspace",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "HR team", to: "/team" },
      { label: "Plan & billing", to: "/billing" },
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
    <footer className="manager-footer">
      <div className="manager-footer__inner">
        <div className="manager-footer__top">
          <div className="manager-footer__brand">
            <div className="manager-footer__brand-row">
              <span className="manager-footer__logo">
                <Sparkles size={16} />
              </span>
              <span className="manager-footer__wordmark">
                Screen<span className="manager-footer__wordmark-accent">wise</span>
              </span>
            </div>
            <p className="manager-footer__tagline">
              You manage your company's HR seats and plan. Recruiters do the screening.
            </p>
          </div>

          <div className="manager-footer__columns">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="manager-footer__column">
                <h3 className="manager-footer__col-title">{col.heading}</h3>
                <ul className="manager-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <a className="manager-footer__link" href={link.href}>
                          {link.label}
                        </a>
                      ) : (
                        <Link className="manager-footer__link" to={link.to!}>
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

        <div className="manager-footer__copyright">© {year} Screenwise</div>
      </div>
    </footer>
  );
}
