import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

type AuthValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const USER_STORAGE_KEY = "screenwise.user";
const TOKEN_STORAGE_KEY = "screenwise.token";
const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

async function authRequest(path: string, body: unknown): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Something went wrong");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_STORAGE_KEY);
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      // A user record without a token is stale (e.g. left over from before real
      // auth existed) — treat it as signed out rather than trusting it blindly.
      if (raw && token) {
        setUser(JSON.parse(raw) as User);
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const persist = (u: User | null, token?: string) => {
      setUser(u);
      try {
        if (u && token) {
          window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          window.localStorage.removeItem(USER_STORAGE_KEY);
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        /* ignore */
      }
    };

    return {
      user,
      ready,
      login: async (email, password) => {
        const { token, user: next } = await authRequest("login", { email, password });
        persist(next, token);
        return next;
      },
      register: async (name, email, password, role) => {
        const { token, user: next } = await authRequest("register", { name, email, password, role });
        persist(next, token);
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
