"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ApiAuthUser } from "@/lib/api-types";
import { refreshTokens, requestOtp, verifyOtp } from "./client";
import { clearSession, loadSession, saveSession, type StoredSession } from "./storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: ApiAuthUser | null;
  isAdmin: boolean;
  requestOtp: typeof requestOtp;
  verifyOtp: (email: string, otp: string, name?: string) => Promise<void>;
  logout: () => void;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // Read localStorage after mount (not via a lazy useState initializer) so the
    // server-rendered and first-client-rendered output match; only this effect's
    // post-mount update can safely reflect the browser-only session state.
    const stored = loadSession();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(stored);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null;

    const exp = decodeExpiry(session.accessToken);
    const needsRefresh = !exp || exp * 1000 < Date.now() + 30_000;
    if (!needsRefresh) return session.accessToken;

    try {
      const result = await refreshTokens(session.refreshToken);
      const next: StoredSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
      saveSession(next);
      setSession(next);
      return next.accessToken;
    } catch {
      clearSession();
      setSession(null);
      setStatus("unauthenticated");
      return null;
    }
  }, [session]);

  const handleVerifyOtp = useCallback(async (email: string, otp: string, name?: string) => {
    const result = await verifyOtp(email, otp, name);
    const next: StoredSession = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
    saveSession(next);
    setSession(next);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    isAdmin: session?.user?.role === "ADMIN",
    requestOtp,
    verifyOtp: handleVerifyOtp,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
