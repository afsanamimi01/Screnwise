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

export function SignInSubmitButton() {
  return (
    <button type="submit" className="sign-in-submit-btn">
      Sign in
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

export function CreateAccountSubmitButton() {
  return (
    <button type="submit" className="create-account-submit-btn">
      Create account
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
