import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import "./PreviewBanner.css";

/** Shown when the company has no plan yet. */
export function PreviewBanner({ reason }: { reason: string }) {
  return (
    <div className="manager-preview" role="status">
      <span className="manager-preview__icon">
        <Lock size={16} />
      </span>
      <p className="manager-preview__text">
        <span className="manager-preview__title">Preview mode.</span> {reason} Everything here is
        view-only until then.
      </p>
      <Link to="/billing" className="manager-preview__cta">
        See plans
      </Link>
    </div>
  );
}
