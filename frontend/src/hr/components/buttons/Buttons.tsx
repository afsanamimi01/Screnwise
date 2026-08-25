import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Mail, Plus, Send } from "lucide-react";
import "./Buttons.css";

export function NewJobButton() {
  return (
    <Link to="/jobs/new" className="new-job-btn">
      <Plus className="new-job-btn__icon" /> New job
    </Link>
  );
}

export function CreateJobButton() {
  return (
    <Link to="/jobs/new" className="create-job-btn">
      Create a job
    </Link>
  );
}

export function SortHeaderButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="sort-header-btn">
      {label} <ArrowUpDown className="sort-header-btn__icon" />
    </button>
  );
}

export function GoToRankBoardButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="go-to-rank-board-btn">
      Go to the rank board
    </button>
  );
}

export function ClearSelectionButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="clear-selection-btn">
      Clear
    </button>
  );
}

export function ShortlistSelectedButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shortlist-selected-btn">
      Shortlist selected
    </button>
  );
}

export function ShortlistTop20Button({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shortlist-top20-btn">
      Shortlist top 20
    </button>
  );
}

export function WhyThisScoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="why-score-btn">
      Why this score
    </button>
  );
}

export function ShortlistButton({
  shortlisted,
  onClick,
}: {
  shortlisted: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={shortlisted} className="shortlist-btn">
      {shortlisted ? "On shortlist" : "Shortlist"}
    </button>
  );
}

export function ToggleBelowThresholdButton({
  expanded,
  count,
  onClick,
}: {
  expanded: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="toggle-below-btn">
      <span className="toggle-below-btn__label">
        {expanded ? "Hide" : "Show"} below-threshold candidates
        <span className="toggle-below-btn__count">{count}</span>
      </span>
      <ChevronDown className={expanded ? "toggle-below-btn__chevron toggle-below-btn__chevron--open" : "toggle-below-btn__chevron"} />
    </button>
  );
}

export function ComposeEmailButton({ jobId }: { jobId: string }) {
  return (
    <Link to={`/jobs/${jobId}/email`} className="compose-email-btn">
      <Mail className="compose-email-btn__icon" /> Compose email
    </Link>
  );
}

export function OpenRankBoardButton({ jobId }: { jobId: string }) {
  return (
    <Link to={`/jobs/${jobId}/board`} className="open-rank-board-btn">
      Open rank board
    </Link>
  );
}

export function MessageButton({ jobId }: { jobId: string }) {
  return (
    <Link to={`/jobs/${jobId}/email`} className="message-btn">
      Message
    </Link>
  );
}

export function SendEmailButton({ sending, onClick }: { sending: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={sending} className="send-email-btn">
      <Send className="send-email-btn__icon" />
      {sending ? "Sending…" : "Send (simulated)"}
    </button>
  );
}

export function JobFormSubmitButton({
  saving,
  mode,
  onClick,
}: {
  saving: boolean;
  mode: "create" | "edit";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={saving} className="job-form-submit-btn">
      {saving ? "Saving…" : mode === "create" ? "Post job" : "Save changes"}
    </button>
  );
}

export function JobFormCancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="job-form-cancel-btn">
      Cancel
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
