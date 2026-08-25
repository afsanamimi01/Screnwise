import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import "./Buttons.css";

export function SignInLinkButton() {
  return (
    <Link to="/login" className="sign-in-link-btn">
      Sign in
    </Link>
  );
}

export function CreateAccountLinkButton() {
  return (
    <Link to="/register" className="create-account-link-btn">
      Create account
    </Link>
  );
}

export function OpenDemoDashboardButton() {
  return (
    <Link to="/login" className="open-demo-dashboard-btn">
      Open the demo dashboard <ArrowRight className="open-demo-dashboard-btn__icon" />
    </Link>
  );
}

export function SignInSubmitButton({ submitting = false }: { submitting?: boolean }) {
  return (
    <button type="submit" disabled={submitting} className="sign-in-submit-btn">
      {submitting ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function DemoAccountPickerButton({
  email,
  role,
  onPick,
}: {
  email: string;
  role: string;
  onPick: (email: string) => void;
}) {
  return (
    <button type="button" onClick={() => onPick(email)} className="demo-account-picker-btn">
      <span>{email}</span>
      <span className="demo-account-picker-btn__role">{role}</span>
    </button>
  );
}

export function CreateAccountSubmitButton({ submitting = false }: { submitting?: boolean }) {
  return (
    <button type="submit" disabled={submitting} className="create-account-submit-btn">
      {submitting ? "Creating account…" : "Create account"}
    </button>
  );
}

export function TryAgainButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="try-again-btn">
      <RefreshCw className="try-again-btn__icon" /> Try again
    </button>
  );
}

export function RemoveTagButton({ tag, onRemove }: { tag: string; onRemove: (tag: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${tag}`}
      onClick={() => onRemove(tag)}
      className="remove-tag-btn"
    >
      <X className="remove-tag-btn__icon" />
    </button>
  );
}

export function GoHomeButton() {
  return (
    <Link to="/" className="go-home-btn">
      Go home
    </Link>
  );
}

export function GoToMyHomeButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="go-to-my-home-btn">
      {label}
    </Link>
  );
}
