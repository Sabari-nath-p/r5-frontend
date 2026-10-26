import type { ApiAuthUser } from "@/lib/api-types";

const STORAGE_KEY = "r5_admin_session";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: ApiAuthUser;
};

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
