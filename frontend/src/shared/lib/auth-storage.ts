/**
 * The single source of truth for the signed-in session in the browser.
 *
 * `auth.tsx` writes it on login/register/logout; `api.ts` reads the token to
 * attach the `Authorization` header. Kept in its own module so those two files
 * don't have to import each other.
 *
 * Uses sessionStorage (per-tab) rather than localStorage (shared across all
 * tabs of the origin) so different tabs can hold independent logged-in actors.
 */
import type { User } from "./types";

const STORAGE_KEY = "screenwise.auth";

export type StoredAuth = { token: string; user: User };

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(value: StoredAuth): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearStoredAuth(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}
