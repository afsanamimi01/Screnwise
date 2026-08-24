import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mockUsers } from "./mock-data";
import type { Role, User } from "./types";

type AuthValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, role?: Role) => User;
  register: (name: string, email: string, role: Role) => User;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const STORAGE_KEY = "screenwise.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const persist = (u: User | null) => {
      setUser(u);
      try {
        if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    };

    return {
      user,
      ready,
      login: (email, role) => {
        const found = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const next: User =
          found ??
          ({
            id: `u-${Date.now()}`,
            name: email.split("@")[0] ?? "User",
            email,
            role: role ?? "hr",
            active: true,
            createdAt: new Date().toISOString().slice(0, 10),
          } as User);
        persist(next);
        return next;
      },
      register: (name, email, role) => {
        const next: User = {
          id: role === "candidate" ? "u-cand-1" : `u-${Date.now()}`,
          name,
          email,
          role,
          active: true,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        persist(next);
        return next;
      },
      logout: () => persist(null),
    };
  }, [user, ready]);

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
