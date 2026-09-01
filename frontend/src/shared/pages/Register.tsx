import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Building2, Sparkles } from "lucide-react";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Register.css";

type Mode = "candidate" | "company";

export default function Register() {
  usePageTitle("Create an account - Screenwise");
  const { register, registerCompany } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [mode, setMode] = useState<Mode>(params.get("type") === "company" ? "company" : "candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "company") {
        await registerCompany({ companyName, name, email, password });
        // No plan yet - send them straight to the plan chooser.
        navigate("/billing");
        return;
      }
      const user = await register(name || email.split("@")[0] || "New user", email, password);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
      setSubmitting(false);
    }
  };

  return (
    <div className="register">
      <div className="register__body">
        <div className="register__card">
          <Link to="/" className="register__brand">
            <span className="register__logo">
              <Sparkles size={16} />
            </span>
            <span className="register__wordmark">Screenwise</span>
          </Link>

          <div className="register__modes">
            <button
              type="button"
              onClick={() => setMode("candidate")}
              className={`register__mode${mode === "candidate" ? " register__mode--active" : ""}`}
            >
              <Briefcase size={16} /> I'm looking for a job
            </button>
            <button
              type="button"
              onClick={() => setMode("company")}
              className={`register__mode${mode === "company" ? " register__mode--active" : ""}`}
            >
              <Building2 size={16} /> I'm hiring
            </button>
          </div>

          <div className="register__panel">
            <div className="register__header">
              <h1 className="register__title">
                {mode === "company" ? "Register your company" : "Create your account"}
              </h1>
              <p className="register__subtitle">
                {mode === "company"
                  ? "You'll be the company manager. Pick a plan and add HR recruiters right after signing up."
                  : "One account to browse every open role and track your applications. Always free."}
              </p>
            </div>

            <form onSubmit={submit} className="register__form">
              {mode === "company" ? (
                <div className="register__field">
                  <label htmlFor="companyName" className="register__label">
                    Company name
                  </label>
                  <input
                    id="companyName"
                    className="register__input"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="register__field">
                <label htmlFor="name" className="register__label">
                  {mode === "company" ? "Your name" : "Full name"}
                </label>
                <input
                  id="name"
                  className="register__input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="register__field">
                <label htmlFor="email" className="register__label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="register__input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="register__field">
                <label htmlFor="password" className="register__label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="register__input"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error ? <p className="register__error">{error}</p> : null}
              <button type="submit" className="register__submit" disabled={submitting}>
                {submitting
                  ? "Creating…"
                  : mode === "company"
                    ? "Register & choose a plan"
                    : "Create account"}
              </button>
            </form>

            <p className="register__foot">
              Already have an account?{" "}
              <Link to="/login" className="register__foot-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
