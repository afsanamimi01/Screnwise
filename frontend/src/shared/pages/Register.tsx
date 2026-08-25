import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { CreateAccountSubmitButton } from "@/shared/components/buttons/Buttons";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import "./Register.css";

const roles: { value: Role; label: string; hint: string }[] = [
  { value: "hr", label: "HR / recruiter", hint: "Post jobs, screen CVs, shortlist and email." },
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
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("hr");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await register(name || email.split("@")[0] || "New user", email, password, role);
      navigate(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-page__container">
        <Link to="/" className="register-page__brand">
          <div className="register-page__brand-icon">
            <Sparkles className="register-page__brand-icon-glyph" />
          </div>
          <span className="register-page__brand-name">Screenwise</span>
        </Link>
        <Card className="register-page__card">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Pick the role you want to explore. Admin accounts are seeded, not self-registered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="register-page__form">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="register-page__input"
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
                  className="register-page__input"
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
                  className="register-page__input"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label>Role</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                  className="register-page__role-group"
                >
                  {roles.map((r) => (
                    <label key={r.value} className="register-page__role-option">
                      <RadioGroupItem value={r.value} className="register-page__role-radio" />
                      <span>
                        <span className="register-page__role-label">{r.label}</span>
                        <span className="register-page__role-hint">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <CreateAccountSubmitButton submitting={submitting} />
            </form>
            <p className="register-page__footer-text">
              Already have an account?{" "}
              <Link to="/login" className="register-page__footer-link">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
