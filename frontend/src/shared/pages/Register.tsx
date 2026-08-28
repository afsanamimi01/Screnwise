import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";

const roles: { value: Role; label: string; hint: string }[] = [
  { value: "hr", label: "HR / recruiter", hint: "Post jobs, screen CVs, shortlist and email." },
  { value: "manager", label: "Hiring manager", hint: "Review shortlists and leave feedback." },
  { value: "candidate", label: "Candidate", hint: "Apply to roles and track your status." },
];

export default function Register() {
  usePageTitle("Create an account — Screenwise");
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("hr");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register(name || email.split("@")[0] || "New user", email, password, role);
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
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Pick the role you want to explore. Admin accounts are seeded, not self-registered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
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
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(v) => setRole(v as Role)}
                    className="mt-2 space-y-2"
                  >
                    {roles.map((r) => (
                      <label
                        key={r.value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary-soft/50"
                      >
                        <RadioGroupItem value={r.value} className="mt-0.5" />
                        <span>
                          <span className="font-medium">{r.label}</span>
                          <span className="block text-xs text-muted-foreground">{r.hint}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                {error ? (
                  <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating…" : "Create account"}
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
