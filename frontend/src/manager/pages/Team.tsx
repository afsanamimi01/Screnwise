import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { Shell } from "@/manager/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { createHr, getCompanyHr, getMyCompany, updateHr } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Team.css";

/** Table columns — reorder / rename here. */
const COLUMNS = ["Name", "Email", "Joined", "Active"] as const;

export default function Team() {
  usePageTitle("HR team — Screenwise");
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: getMyCompany });
  const hr = useQuery({ queryKey: ["company-hr"], queryFn: getCompanyHr });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const seatLimit = company.data?.hrSeatLimit ?? null;
  const seatsUsed = company.data?.hrSeatsUsed ?? 0;
  const atCapacity = seatLimit != null && seatsUsed >= seatLimit;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["company"] }),
      queryClient.invalidateQueries({ queryKey: ["company-hr"] }),
    ]);

  const addHr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createHr(form);
      toast.success(`${form.name} can now sign in as HR.`);
      setForm({ name: "", email: "", password: "" });
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the HR account.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateHr(id, { active });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the account.");
    }
  };

  const field =
    (k: "name" | "email" | "password") => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Shell allow={["manager"]}>
      <div className="team">
        <div className="team__intro">
          <div>
            <h1 className="team__intro-title">HR team</h1>
            <p className="team__intro-text">
              Add or deactivate the recruiters who screen for your company.
            </p>
          </div>
          <button
            type="button"
            className="team__btn"
            disabled={atCapacity}
            onClick={() => setOpen(true)}
          >
            <UserPlus size={16} /> Add HR
          </button>
        </div>

        {company.isError ? (
          <ErrorState message="We couldn't load your company." onRetry={() => company.refetch()} />
        ) : null}

        {company.data ? (
          <div className="team__summary">
            <div className="team__summary-title">
              {company.data.name} · <span className="team__cap">{company.data.plan ?? "no"}</span>{" "}
              plan
            </div>
            <div className="team__summary-row">
              <span className="team__muted">
                HR seats used:{" "}
                <span className="team__num team__strong">
                  {seatsUsed}
                  {seatLimit != null ? ` / ${seatLimit}` : " (unlimited)"}
                </span>
              </span>
              {atCapacity ? (
                <span className="team__warn">
                  Seat limit reached — upgrade the plan or deactivate an HR
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {hr.isLoading ? <LoadingRows rows={3} /> : null}
        {hr.isError ? (
          <ErrorState message="We couldn't load your HR team." onRetry={() => hr.refetch()} />
        ) : null}

        {hr.data ? (
          <div className="team__table-wrap">
            <table className="team__table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hr.data.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="team__empty">
                      No HR accounts yet. Add one to start posting jobs and screening.
                    </td>
                  </tr>
                ) : (
                  hr.data.map((u) => (
                    <tr key={u.id}>
                      <td className="team__cell--name">{u.name}</td>
                      <td className="team__muted">{u.email}</td>
                      <td className="team__muted">{u.createdAt}</td>
                      <td>
                        <label className="team__toggle">
                          <input
                            type="checkbox"
                            className="team__switch"
                            checked={u.active}
                            onChange={(e) => toggleActive(u.id, e.target.checked)}
                          />
                          <span className="team__pill">
                            {u.active ? "active" : "deactivated"}
                          </span>
                        </label>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          className="team__modal"
          role="dialog"
          aria-modal="true"
          aria-label="Add an HR account"
        >
          <div className="team__modal-backdrop" onClick={() => setOpen(false)} />
          <div className="team__modal-panel">
            <div className="team__modal-head">
              <h2 className="team__modal-title">Add an HR account</h2>
              <button
                type="button"
                className="team__modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="team__modal-desc">
              They sign in with the email and password you set here.
            </p>
            <form onSubmit={addHr} className="team__form">
              <div className="team__field">
                <label className="team__label" htmlFor="hr-name">
                  Full name
                </label>
                <input
                  id="hr-name"
                  className="team__input"
                  required
                  value={form.name}
                  onChange={field("name")}
                />
              </div>
              <div className="team__field">
                <label className="team__label" htmlFor="hr-email">
                  Email
                </label>
                <input
                  id="hr-email"
                  className="team__input"
                  type="email"
                  required
                  value={form.email}
                  onChange={field("email")}
                />
              </div>
              <div className="team__field">
                <label className="team__label" htmlFor="hr-password">
                  Temporary password
                </label>
                <input
                  id="hr-password"
                  className="team__input"
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={field("password")}
                />
              </div>
              <button type="submit" className="team__btn team__btn--full" disabled={saving}>
                {saving ? "Adding…" : "Add HR"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
