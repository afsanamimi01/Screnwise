import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SignInSubmitButton, DemoAccountPickerButton } from "@/shared/components/buttons/Buttons";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { mockUsers } from "@/shared/lib/mock-data";
import "./Login.css";

export function Login() {
  useEffect(() => {
    document.title = "Sign in — Screenwise";
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("nadia@screenwise.io");
  const [password, setPassword] = useState("demo1234");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__container">
        <Link to="/" className="login-page__brand">
          <div className="login-page__brand-icon">
            <Sparkles className="login-page__brand-icon-glyph" />
          </div>
          <span className="login-page__brand-name">Screenwise</span>
        </Link>
        <Card className="login-page__card">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use one of the demo accounts below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="login-page__form">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-page__input"
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
                  className="login-page__input"
                  required
                />
              </div>
              <SignInSubmitButton submitting={submitting} />
            </form>

            <div className="login-page__demo-box">
              <p className="login-page__demo-label">Demo accounts</p>
              <div className="login-page__demo-list">
                {mockUsers
                  .filter((u) => u.active)
                  .map((u) => (
                    <DemoAccountPickerButton key={u.id} email={u.email} role={u.role} onPick={setEmail} />
                  ))}
              </div>
            </div>

            <p className="login-page__footer-text">
              No account yet?{" "}
              <Link to="/register" className="login-page__footer-link">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
