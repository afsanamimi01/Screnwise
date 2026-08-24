import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import "./Buttons.css";

export function TrackMyApplicationButton() {
  return (
    <Link to="/my-applications" className="track-my-application-btn">
      Track my application
    </Link>
  );
}

export function TrackMyStatusButton() {
  return (
    <Link to="/my-applications" className="track-my-status-btn">
      Track my status
    </Link>
  );
}

export function SubmitApplicationButton({ submitting }: { submitting: boolean }) {
  return (
    <button type="submit" disabled={submitting} className="submit-application-btn">
      {submitting ? "Submitting…" : "Submit application"}
    </button>
  );
}

export const UserMenuTriggerButton = forwardRef<
  HTMLButtonElement,
  { name: string } & ButtonHTMLAttributes<HTMLButtonElement>
>(({ name, ...props }, ref) => {
  return (
    <button ref={ref} type="button" className="user-menu-trigger-btn" {...props}>
      <span className="user-menu-trigger-btn__avatar">{name.slice(0, 2).toUpperCase()}</span>
      <span className="user-menu-trigger-btn__name">{name}</span>
    </button>
  );
});
UserMenuTriggerButton.displayName = "UserMenuTriggerButton";
