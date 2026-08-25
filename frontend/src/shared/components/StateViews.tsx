import { AlertTriangle, Inbox } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TryAgainButton } from "@/shared/components/buttons/Buttons";
import "./StateViews.css";

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="loading-rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="loading-rows__row">
          <Skeleton className="loading-rows__row-icon" />
          <div className="loading-rows__row-lines">
            <Skeleton className="loading-rows__row-line-title" />
            <Skeleton className="loading-rows__row-line-subtitle" />
          </div>
          <Skeleton className="loading-rows__row-action" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon-wrap">
        <Inbox className="empty-state__icon" />
      </div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <AlertTriangle className="error-state__icon" />
      <h3 className="error-state__title">Something went wrong</h3>
      <p className="error-state__description">{message}</p>
      {onRetry ? <TryAgainButton onClick={onRetry} /> : null}
    </div>
  );
}
