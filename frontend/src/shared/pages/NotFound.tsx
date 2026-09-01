import { Link } from "react-router-dom";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./NotFound.css";

export default function NotFound() {
  usePageTitle("Page not found — Screenwise");

  return (
    <div className="not-found">
      <div className="not-found__body">
        <div className="not-found__panel">
          <p className="not-found__code">404</p>
          <h1 className="not-found__title">Page not found</h1>
          <p className="not-found__text">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="not-found__btn">
            Go home
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
