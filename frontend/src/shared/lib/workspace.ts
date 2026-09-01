import { useLocation } from "react-router-dom";

/**
 * Base path for the section the recruiter is in: `/screen` for the independent
 * CV-screening batches, `/jobs` for real job postings. Job pages (board,
 * shortlist, upload, email, edit, new) are shared between the two - prefix
 * their links with this:
 *
 *   const base = useWorkspaceBase();
 *   navigate(`${base}/${id}/board`);
 *   <Link to={`${base}/new`} />
 */
export function useWorkspaceBase(): "/jobs" | "/screen" {
  return useLocation().pathname.startsWith("/screen") ? "/screen" : "/jobs";
}
