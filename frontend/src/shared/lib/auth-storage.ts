/**
 * The single source of truth for the signed-in session in the browser.
 *
 * `auth.tsx` writes it on login/register/logout; `api.ts` reads the token to
 * attach the `Authorization` header. Kept in its own module so those two files
 * don't have to import each other.
 */
import type { User } from "./types";

const STORAGE_KEY = "screenwise.auth";

export type StoredAuth = { token: string; user: User };

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(value: StoredAuth): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearStoredAuth(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}
