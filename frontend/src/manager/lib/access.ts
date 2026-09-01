import { useQuery } from "@tanstack/react-query";
import { getMyCompany } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";

/**
 * "Preview mode" for the company manager: a manager whose company hasn't picked
 * a plan yet can open every screen but cannot perform any action until they
 * activate a plan on `/billing`. The server enforces the same rule and replies
 * with `PLAN_REQUIRED`.
 *
 * Reuses the shared `["company"]` query (React Query dedups it with the Shell,
 * Billing and Team pages), so this adds no extra request.
 */
export function useManagerAccess() {
  const { user, ready } = useAuth();
  const company = useQuery({
    queryKey: ["company"],
    queryFn: getMyCompany,
    enabled: ready && user?.role === "manager",
  });

  const locked = Boolean(company.data && !company.data.plan);

  return {
    /** True once we know the company has no plan - stays false while loading. */
    locked,
    loading: company.isLoading,
    reason: "Activate a plan to post jobs, screen CVs and add HR recruiters.",
  };
}
