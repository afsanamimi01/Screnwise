import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Shell } from "@/manager/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { changePlan, getMyCompany, getPlans } from "@/shared/lib/api";
import type { PlanKey } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Billing.css";

/** Facts in the "current subscription" strip — reorder here. */
const SUB_FACTS = [
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "renews", label: "Renews / expires" },
] as const;

export default function Billing() {
  usePageTitle("Plan & billing — Screenwise");
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: getMyCompany });
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const [switching, setSwitching] = useState<PlanKey | null>(null);

  const current = company.data?.plan ?? null;
  const hasPlan = Boolean(current);

  const pickPlan = async (key: PlanKey) => {
    if (key === current) return;
    setSwitching(key);
    try {
      await changePlan(key);
      toast.success(hasPlan ? `You're now on the ${key} plan.` : `${key} plan activated.`);
      await queryClient.invalidateQueries({ queryKey: ["company"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the plan.");
    } finally {
      setSwitching(null);
    }
  };

  const c = company.data;
  const subStatus = c
    ? c.status === "revoked"
      ? "revoked"
      : c.expired
        ? "expired"
        : "active"
    : "—";

  return (
    <Shell allow={["manager"]}>
      <div className="billing">
        <div className="billing__intro">
          <h1 className="billing__intro-title">
            {hasPlan ? "Plan & billing" : "Choose your plan"}
          </h1>
          <p className="billing__intro-text">
            {hasPlan
              ? "Your subscription level sets how many HR seats and jobs you get."
              : "Pick a plan to activate your company. You can add HR recruiters right after."}
          </p>
        </div>

        {company.isError ? (
          <ErrorState
            message="We couldn't load your subscription."
            onRetry={() => company.refetch()}
          />
        ) : null}

        {c && hasPlan ? (
          <div className="billing__sub">
            <div className="billing__sub-title">Current subscription</div>
            <div className="billing__sub-grid">
              {SUB_FACTS.map((f) => (
                <div key={f.key}>
                  <div className="billing__sub-label">{f.label}</div>
                  <div className="billing__sub-value">
                    {f.key === "plan" ? (
                      <span className="billing__cap">{c.plan}</span>
                    ) : f.key === "status" ? (
                      <span
                        className={
                          "billing__pill" +
                          (c.accessible ? " billing__pill--ok" : " billing__pill--bad")
                        }
                      >
                        {subStatus}
                      </span>
                    ) : (
                      <span className="billing__num">{c.subscriptionExpiresAt ?? "—"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {c && !hasPlan ? (
          <div className="billing__banner">
            <span className="billing__strong">{c.name}</span> has no plan yet. Choosing one starts
            a 30-day subscription and unlocks HR seats and job posting.
          </div>
        ) : null}

        {plans.isLoading ? <LoadingRows rows={3} /> : null}
        {plans.isError ? (
          <ErrorState message="We couldn't load the plans." onRetry={() => plans.refetch()} />
        ) : null}

        {plans.data ? (
          <div className="billing__plans">
            {plans.data.map((plan) => {
              const isCurrent = hasPlan && plan.key === current;
              return (
                <div
                  key={plan.key}
                  className={
                    "billing__plan" +
                    (isCurrent ? " billing__plan--current" : "") +
                    (plan.featured && !isCurrent ? " billing__plan--featured" : "")
                  }
                >
                  <div className="billing__plan-head">
                    <span className="billing__plan-name">{plan.name}</span>
                    {isCurrent ? (
                      <span className="billing__tag billing__tag--current">Current</span>
                    ) : plan.featured ? (
                      <span className="billing__tag">Popular</span>
                    ) : null}
                  </div>
                  <p className="billing__plan-tagline">{plan.tagline}</p>
                  <div className="billing__price">
                    <span className="billing__price-amount">{plan.price}</span>
                    <span className="billing__price-period">{plan.period}</span>
                  </div>
                  <div className="billing__seats">
                    {plan.hrSeatLimit == null
                      ? "Unlimited HR seats"
                      : `${plan.hrSeatLimit} HR seats`}
                  </div>
                  <ul className="billing__features">
                    {plan.features
                      .filter((f) => f.included)
                      .slice(0, 5)
                      .map((f) => (
                        <li key={f.label} className="billing__feature">
                          <Check className="billing__feature-icon" size={16} />
                          {f.label}
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    className={"billing__btn" + (isCurrent ? " billing__btn--ghost" : "")}
                    disabled={isCurrent || switching !== null}
                    onClick={() => pickPlan(plan.key)}
                  >
                    {isCurrent
                      ? "Your plan"
                      : switching === plan.key
                        ? hasPlan
                          ? "Switching…"
                          : "Activating…"
                        : hasPlan
                          ? `Switch to ${plan.name}`
                          : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
