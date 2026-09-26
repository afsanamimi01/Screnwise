import { useLocation } from "react-router-dom";

/** Base path for the recruiter's current section. */
export function useWorkspaceBase(): "/jobs" | "/screen" {
  return useLocation().pathname.startsWith("/screen") ? "/screen" : "/jobs";
}
