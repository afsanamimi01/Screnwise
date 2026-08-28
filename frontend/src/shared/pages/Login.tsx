import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

/** Seeded accounts (see backend `shared/seed.js`). Password for all: demo1234. */
const DEMO_ACCOUNTS = [
  { email: "admin@screenwise.io", role: "admin" },
  { email: "nadia@screenwise.io", role: "hr" },
  { email: "tomal@screenwise.io", role: "hr" },
  { email: "priya@screenwise.io", role: "manager" },
  { email: "kenji@screenwise.io", role: "manager" },
  { email: "jordan@example.com", role: "candidate" },
  { email: "amina@example.com", role: "candidate" },
];

export default function Login() {
  usePageTitle("Sign in — Screenwise");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("nadia@screenwise.io");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Screenwise</span>
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Use one of the demo accounts below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                {error ? (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 rounded-lg border bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Demo accounts — password <span className="num">demo1234</span>
                </p>
                <div className="space-y-1">
                  {DEMO_ACCOUNTS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => {
                        setEmail(u.email);
                        setPassword("demo1234");
                      }}
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-background"
                    >
                      <span>{u.email}</span>
                      <span className="text-muted-foreground">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                No account yet?{" "}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
