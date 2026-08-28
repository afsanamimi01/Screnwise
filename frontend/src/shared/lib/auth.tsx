import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authLogin, authRegister } from "./api";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "./auth-storage";
import type { Role, User } from "./types";

type AuthValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setUser(stored.user);
      setToken(stored.token);
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const persist = (next: { token: string; user: User } | null) => {
      if (next) {
        setUser(next.user);
        setToken(next.token);
        setStoredAuth(next);
      } else {
        setUser(null);
        setToken(null);
        clearStoredAuth();
      }
    };

    return {
      user,
      token,
      ready,
      login: async (email, password) => {
        const result = await authLogin(email, password);
        persist(result);
        return result.user;
      },
      register: async (name, email, password, role) => {
        const result = await authRegister(name, email, password, role);
        persist(result);
        return result.user;
      },
      logout: () => persist(null),
    };
  }, [user, token, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const roleLabels: Record<Role, string> = {
  hr: "HR / recruiter",
  manager: "Hiring manager",
  candidate: "Candidate",
  admin: "Admin",
};

export function homeForRole(role: Role) {
  if (role === "candidate") return "/my-applications";
  if (role === "manager") return "/manager";
  return "/dashboard";
}

/** Access rule: a job's rank board is visible only to its creator and admins. */
export function canViewBoard(user: User | null, createdBy: string) {
  if (!user) return false;
  return user.role === "admin" || user.id === createdBy;
}
