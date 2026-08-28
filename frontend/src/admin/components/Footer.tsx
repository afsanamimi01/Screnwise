import { ArrowUp, Mail, ShieldCheck } from "lucide-react";
import "./Footer.css";

/**
 * Footer for the admin actor. Just what an admin needs to see: the governance
 * reminder, the copyright, a contact address and a back-to-top control.
 * The public marketing columns (Platform / For recruiters / For candidates)
 * are intentionally left out — an admin has no use for them.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="admin-footer">
      <span className="admin-footer__note">
        <ShieldCheck className="admin-footer__note-icon" size={14} />
        Every role change and identity reveal is written to the audit log.
      </span>

      <div className="admin-footer__meta">
        <span className="admin-footer__copy">© {year} Screenwise</span>
        <a className="admin-footer__contact" href="mailto:hello@screenwise.io">
          <Mail size={14} /> hello@screenwise.io
        </a>
        <button type="button" className="admin-footer__top" onClick={scrollToTop}>
          <ArrowUp size={14} /> Back to top
        </button>
      </div>
    </footer>
  );
}
