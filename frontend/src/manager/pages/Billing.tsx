import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, CreditCard, ShieldCheck, TriangleAlert } from "lucide-react";
import { Shell } from "@/manager/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import {
  changePlan,
  getMyCompany,
  getPayments,
  getPaymentStatus,
  getPlans,
  startPayment,
} from "@/shared/lib/api";
import type { PlanKey } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Billing.css";

/** Facts in the "current subscription" strip - reorder here. */
const SUB_FACTS = [
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "renews", label: "Renews / expires" },
] as const;

export default function Billing() {
  usePageTitle("Plan & billing - Screenwise");
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: getMyCompany });
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const gateway = useQuery({ queryKey: ["payment-status"], queryFn: getPaymentStatus });
  const payments = useQuery({ queryKey: ["payments"], queryFn: getPayments });
  const [switching, setSwitching] = useState<PlanKey | null>(null);
  const [params, setParams] = useSearchParams();

  const current = company.data?.plan ?? null;
  const hasPlan = Boolean(current);

  // The gateway sends the customer back here with the outcome on the URL.
  // Report it once, then strip it so a refresh doesn't repeat the message.
  useEffect(() => {
    const outcome = params.get("payment");
    if (!outcome) return;

    const plan = params.get("plan");
    if (outcome === "success") {
      toast.success(plan ? `Payment received - you're on the ${plan} plan.` : "Payment received.");
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } else if (outcome === "cancelled") {
      toast.info("Payment cancelled - nothing was charged.");
    } else if (outcome === "invalid") {
      toast.error(params.get("reason") ?? "We couldn't verify that payment.");
    } else {
      toast.error("The payment didn't go through.");
    }

    const next = new URLSearchParams(params);
    ["payment", "plan", "reason"].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, [params, setParams, queryClient]);

  const pickPlan = async (key: PlanKey) => {
    if (key === current) return;
    setSwitching(key);
    try {
      const plan = plans.data?.find((p) => p.key === key);
      // A plan with no price is agreed with us directly; everything else goes
      // through checkout, which is also what activates it.
      if (!plan?.amount) {
        await changePlan(key);
        toast.success(hasPlan ? `You're now on the ${key} plan.` : `${key} plan activated.`);
        await queryClient.invalidateQueries({ queryKey: ["company"] });
        return;
      }

      const result = await startPayment(key);
      if (result.redirectUrl) {
        // Hand the browser to SSLCommerz - we never see card details.
        window.location.href = result.redirectUrl;
        return;
      }

      toast.success(`${key} plan activated. No gateway is configured, so nothing was charged.`);
      await queryClient.invalidateQueries({ queryKey: ["company"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
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
    : "-";

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
                      <span className="billing__num">{c.subscriptionExpiresAt ?? "-"}</span>
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

        {gateway.data ? (
          <div
            className={
              "billing__gateway" +
              (gateway.data.live
                ? " billing__gateway--live"
                : gateway.data.configured
                  ? " billing__gateway--sandbox"
                  : " billing__gateway--off")
            }
          >
            {gateway.data.live ? (
              <ShieldCheck size={16} />
            ) : gateway.data.configured ? (
              <CreditCard size={16} />
            ) : (
              <TriangleAlert size={16} />
            )}
            <span>{gateway.data.message}</span>
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

        {payments.data && payments.data.length > 0 ? (
          <section className="billing__history">
            <h2 className="billing__history-title">Payments</h2>
            <div className="billing__history-list">
              {payments.data.map((p) => (
                <div key={p.id} className="billing__payment">
                  <span className={`billing__payment-status billing__payment-status--${p.status}`}>
                    {p.status}
                  </span>
                  <span className="billing__payment-main">
                    <span className="billing__payment-plan">
                      {p.planKey} plan · {p.currency} {p.amount.toLocaleString()}
                    </span>
                    <span className="billing__payment-meta">
                      {p.paidAt ?? p.createdAt} · {p.tranId}
                      {p.cardType ? ` · ${p.cardType}` : ""}
                      {p.failReason ? ` · ${p.failReason}` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
