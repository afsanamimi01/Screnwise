import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import "./Footer.css";

type FooterLink = { label: string; to?: string; href?: string };
type FooterColumn = { heading: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    heading: "Quick access",
    links: [
      { label: "Browse open roles", to: "/open-roles" },
      { label: "My applications", to: "/my-applications" },
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
    <footer className="candidate-footer">
      <div className="candidate-footer__inner">
        <div className="candidate-footer__top">
          <div className="candidate-footer__brand">
            <div className="candidate-footer__brand-row">
              <span className="candidate-footer__logo">
                <Sparkles size={16} />
              </span>
              <span className="candidate-footer__wordmark">
                Screen<span className="candidate-footer__wordmark-accent">wise</span>
              </span>
            </div>
            <p className="candidate-footer__tagline">
              Your CV is screened blind, alongside everyone else's. Nobody is auto-rejected.
            </p>
          </div>

          <div className="candidate-footer__columns">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="candidate-footer__column">
                <h3 className="candidate-footer__col-title">{col.heading}</h3>
                <ul className="candidate-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <a className="candidate-footer__link" href={link.href}>
                          {link.label}
                        </a>
                      ) : (
                        <Link className="candidate-footer__link" to={link.to!}>
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

        <div className="candidate-footer__copyright">© {year} Screenwise</div>
      </div>
    </footer>
  );
}
