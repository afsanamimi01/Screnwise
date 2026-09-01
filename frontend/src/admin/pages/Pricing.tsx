import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/admin/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getAdminPlans, updatePlan } from "@/shared/lib/api";
import type { Plan, PlanFeature } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Pricing.css";

/** `- text` = excluded feature; anything else = included. */
function featuresToText(features: PlanFeature[]) {
  return features.map((f) => (f.included ? f.label : `- ${f.label}`)).join("\n");
}
function textToFeatures(text: string): PlanFeature[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith("- ")
        ? { label: line.slice(2).trim(), included: false }
        : { label: line.replace(/^-\s*/, "").trim(), included: true },
    );
}

/** Text fields, in render order - reorder the array to reorder the grid. */
type TextKey = "name" | "price" | "period" | "cta" | "tagline";
const TEXT_FIELDS: { key: TextKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "period", label: "Period" },
  { key: "cta", label: "CTA label" },
  { key: "tagline", label: "Tagline" },
];

function PlanEditor({ plan }: { plan: Plan }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(plan);
  const [featureText, setFeatureText] = useState(featuresToText(plan.features));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(plan);
    setFeatureText(featuresToText(plan.features));
  }, [plan]);

  const setText = (key: TextKey, value: string) => setDraft((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await updatePlan(plan.key, {
        name: draft.name,
        tagline: draft.tagline,
        price: draft.price,
        period: draft.period,
        cta: draft.cta,
        featured: draft.featured,
        hrSeatLimit: draft.hrSeatLimit,
        features: textToFeatures(featureText),
      });
      toast.success(`${draft.name} plan saved.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["plans"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pricing__card">
      <header className="pricing__card-head">
        <span className="pricing__card-title">{plan.key}</span>
        <label className="pricing__featured">
          Featured
          <input
            type="checkbox"
            className="pricing__switch"
            checked={draft.featured}
            onChange={(e) => setDraft((p) => ({ ...p, featured: e.target.checked }))}
          />
        </label>
      </header>

      <div className="pricing__grid">
        {TEXT_FIELDS.map((f) => (
          <div key={f.key} className="pricing__field">
            <label className="pricing__label">{f.label}</label>
            <input
              className="pricing__input"
              value={draft[f.key]}
              onChange={(e) => setText(f.key, e.target.value)}
            />
          </div>
        ))}
        <div className="pricing__field">
          <label className="pricing__label">HR seat limit (blank = unlimited)</label>
          <input
            className="pricing__input"
            type="number"
            min={0}
            value={draft.hrSeatLimit ?? ""}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                hrSeatLimit: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="pricing__field">
        <label className="pricing__label">
          Features - one per line, prefix with “- ” to show as excluded
        </label>
        <textarea
          className="pricing__textarea"
          rows={7}
          value={featureText}
          onChange={(e) => setFeatureText(e.target.value)}
        />
      </div>

      <button type="button" className="pricing__btn" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save plan"}
      </button>
    </div>
  );
}

export default function Pricing() {
  usePageTitle("Pricing - Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: getAdminPlans,
  });

  return (
    <Shell allow={["superadmin"]}>
      <main className="pricing">
        <div className="pricing__intro">
          <h1 className="pricing__intro-title">Pricing</h1>
          <p className="pricing__intro-text">
            Edit the plan cards a company manager sees when choosing or switching plans. Seat limits
            apply to new signups and plan changes.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load the plans." onRetry={() => refetch()} />
        ) : null}

        {data ? (
          <div className="pricing__list">
            {data.map((plan) => (
              <PlanEditor key={plan.key} plan={plan} />
            ))}
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
