import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Login.css";

/** Seeded accounts (see backend `shared/seed.js`). Password for all: demo1234. */
const DEMO_ACCOUNTS = [
  { email: "admin@screenwise.io", role: "super admin" },
  { email: "nusrat@bengalrecruitment.com", role: "manager · Bengal Recruitment (advance)" },
  { email: "sadia@bengalrecruitment.com", role: "hr · Bengal Recruitment" },
  { email: "imran@dhakatalent.com", role: "manager · Dhaka Talent Partners (basic)" },
  { email: "farhana@dhakatalent.com", role: "hr · Dhaka Talent Partners" },
  { email: "faruk@ctgstaffing.com", role: "manager · Chattogram Staffing (no plan yet)" },
  { email: "mahmud@padmahr.com", role: "manager · Padma HR Solutions (expired)" },
  { email: "tanjil@example.com", role: "candidate" },
  { email: "nabila@example.com", role: "candidate" },
];

/** Only follow an internal, single-segment-safe redirect target. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function Login() {
  usePageTitle("Sign in - Screenwise");
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("sadia@bengalrecruitment.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Honour the redirect target (or go to the workspace).
  useEffect(() => {
    if (user) navigate(next ?? homeForRole(user.role), { replace: true });
  }, [user, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      navigate(next ?? homeForRole(signedIn.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login__body">
        <div className="login__card">
          <Link to="/" className="login__brand">
            <span className="login__logo">
              <Sparkles size={16} />
            </span>
            <span className="login__wordmark">Screenwise</span>
          </Link>

          <div className="login__panel">
            <div className="login__header">
              <h1 className="login__title">Sign in</h1>
              <p className="login__subtitle">Use one of the demo accounts below.</p>
            </div>

            <form onSubmit={submit} className="login__form">
              <div className="login__field">
                <label htmlFor="email" className="login__label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="login__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="login__field">
                <label htmlFor="password" className="login__label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="login__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="login__error">{error}</p> : null}
              <button type="submit" className="login__submit" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="login__demo">
              <p className="login__demo-title">
                Demo accounts - password <span className="login__demo-password">demo1234</span>
              </p>
              <div className="login__demo-list">
                {DEMO_ACCOUNTS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    className="login__demo-item"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword("demo1234");
                    }}
                  >
                    <span className="login__demo-email">{u.email}</span>
                    <span className="login__demo-role">{u.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="login__foot">
              No account yet?{" "}
              <Link to="/register" className="login__foot-link">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
