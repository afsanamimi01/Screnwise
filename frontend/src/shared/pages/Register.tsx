import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";

const roles: { value: Role; label: string; hint: string }[] = [
  { value: "hr", label: "HR / recruiter", hint: "Post jobs, screen CVs, shortlist and email." },
  { value: "manager", label: "Hiring manager", hint: "Review shortlists and leave feedback." },
  { value: "candidate", label: "Candidate", hint: "Apply to roles and track your status." },
];

export function Register() {
  useEffect(() => {
    document.title = "Create an account — Screenwise";
  }, []);

  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("hr");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const user = register(name || email.split("@")[0] || "New user", email, role);
    navigate(homeForRole(user.role));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
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
              <Button type="submit" className="w-full">
                Create account
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
  );
}
