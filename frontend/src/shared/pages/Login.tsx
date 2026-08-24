import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { mockUsers } from "@/shared/lib/mock-data";

export function Login() {
  useEffect(() => {
    document.title = "Sign in — Screenwise";
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("nadia@screenwise.io");
  const [password, setPassword] = useState("demo1234");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const user = login(email);
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
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>

            <div className="mt-6 rounded-lg border bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Demo accounts</p>
              <div className="space-y-1">
                {mockUsers
                  .filter((u) => u.active)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setEmail(u.email)}
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
  );
}
