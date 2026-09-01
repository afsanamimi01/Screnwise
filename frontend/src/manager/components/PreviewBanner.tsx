import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import "./PreviewBanner.css";

/**
 * Shown at the top of every manager screen while the company has no plan. The
 * console is fully browsable in this state; the banner explains why the actions
 * are disabled and points at the plan chooser.
 */
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
