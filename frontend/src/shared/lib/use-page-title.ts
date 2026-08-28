import { useEffect } from "react";

/**
 * Sets `document.title` for the lifetime of a page component and restores the
 * previous title on unmount. Replaces the file-based-router `head()` meta that
 * the TanStack version used — a Vite SPA has a single HTML shell, so the title
 * is the only piece of that metadata worth keeping.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
