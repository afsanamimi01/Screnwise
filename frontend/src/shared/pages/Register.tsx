import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Building2, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { cn } from "@/shared/lib/utils";

type Mode = "candidate" | "company";

export default function Register() {
  usePageTitle("Create an account — Screenwise");
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
        // No plan yet — send them straight to the plan chooser.
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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Screenwise</span>
          </Link>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("candidate")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                mode === "candidate"
                  ? "border-primary bg-primary-soft/50 font-medium"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Briefcase className="h-4 w-4" /> I'm looking for a job
            </button>
            <button
              type="button"
              onClick={() => setMode("company")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                mode === "company"
                  ? "border-primary bg-primary-soft/50 font-medium"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Building2 className="h-4 w-4" /> I'm hiring
            </button>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>
                {mode === "company" ? "Register your company" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "company"
                  ? "You'll be the company manager. Pick a plan and add HR recruiters right after signing up."
                  : "One account to browse every open role and track your applications. Always free."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {mode === "company" ? (
                  <div>
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="name">{mode === "company" ? "Your name" : "Full name"}</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {error ? (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? "Creating…"
                    : mode === "company"
                      ? "Register & choose a plan"
                      : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
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
