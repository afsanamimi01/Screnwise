import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authLogin, authRegisterCandidate, authRegisterCompany } from "./api";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "./auth-storage";
import type { Role, User } from "./types";

type CompanySignup = {
  companyName: string;
  name: string;
  email: string;
  password: string;
};

type AuthValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  /** Public self-serve signup — always a candidate. */
  register: (name: string, email: string, password: string) => Promise<User>;
  /** Organisation signup — creates a company + its manager account. */
  registerCompany: (payload: CompanySignup) => Promise<User>;
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
      register: async (name, email, password) => {
        const result = await authRegisterCandidate(name, email, password);
        persist(result);
        return result.user;
      },
      registerCompany: async (payload) => {
        const result = await authRegisterCompany(payload);
        persist({ token: result.token, user: result.user });
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
  manager: "Company manager",
  candidate: "Candidate",
  superadmin: "Super admin",
};

export function homeForRole(role: Role) {
  if (role === "candidate") return "/my-applications";
  if (role === "superadmin") return "/admin";
  // manager and hr share the recruiter workspace
  return "/dashboard";
}

/**
 * Access rule: a job's rank board is visible to the super admin and to any
 * member of the company that owns the job. The server enforces this too.
 */
export function canViewBoard(user: User | null, companyId: string) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return !!user.companyId && user.companyId === companyId;
}
