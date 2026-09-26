import { useQuery } from "@tanstack/react-query";
import { getMyCompany } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";

/** Preview-mode gate for a manager whose company has no plan. */
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
