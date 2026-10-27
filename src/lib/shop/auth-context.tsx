"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiAuthUser } from "@/lib/api-types";
import {
  refreshTokens,
  requestOtp,
  updateProfile,
  verifyOtp,
  type ShopAuthResult,
} from "./client";
import {
  clearShopSession,
  loadShopSession,
  saveShopSession,
  type ShopSession,
} from "./session-storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type VerifyInput = {
  email: string;
  otp: string;
  name?: string;
  phone?: string;
  countryCode?: string;
};

type ShopAuthValue = {
  status: AuthStatus;
  user: ApiAuthUser | null;
  /** True once we hold a name and a phone number for the account. */
  profileComplete: boolean;
  requestOtp: (email: string) => Promise<{ expiresInMinutes: number }>;
  verifyOtp: (input: VerifyInput) => Promise<ShopAuthResult>;
  saveProfile: (dto: { name?: string; phone?: string; countryCode?: string }) => Promise<void>;
  logout: () => void;
  getToken: () => Promise<string | null>;
};

const ShopAuthContext = createContext<ShopAuthValue | null>(null);

function decodeExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

function isComplete(user: ApiAuthUser | null): boolean {
  return !!user?.name?.trim() && !!user?.phone?.trim();
}

export function ShopAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ShopSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // localStorage is browser-only, so this has to wait for mount to keep the
    // server and first client render identical.
    const stored = loadShopSession();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(stored);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  const persist = useCallback((result: ShopAuthResult) => {
    const next: ShopSession = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
    saveShopSession(next);
    setSession(next);
    setStatus("authenticated");
    return next;
  }, []);

  const logout = useCallback(() => {
    clearShopSession();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null;

    const exp = decodeExpiry(session.accessToken);
    // Refresh a little early so a token cannot expire mid-request.
    const needsRefresh = !exp || exp * 1000 < Date.now() + 30_000;
    if (!needsRefresh) return session.accessToken;

    try {
      const result = await refreshTokens(session.refreshToken);
      return persist(result).accessToken;
    } catch {
      logout();
      return null;
    }
  }, [session, persist, logout]);

  const handleRequestOtp = useCallback(async (email: string) => {
    const { expiresInMinutes } = await requestOtp(email);
    return { expiresInMinutes };
  }, []);

  const handleVerifyOtp = useCallback(
    async (input: VerifyInput) => {
      const result = await verifyOtp(input);
      persist(result);
      return result;
    },
    [persist]
  );

  const saveProfile = useCallback(
    async (dto: { name?: string; phone?: string; countryCode?: string }) => {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const user = await updateProfile(token, dto);
      setSession((current) => {
        if (!current) return current;
        const next = { ...current, user };
        saveShopSession(next);
        return next;
      });
    },
    [getToken]
  );

  const value = useMemo<ShopAuthValue>(
    () => ({
      status,
      user: session?.user ?? null,
      profileComplete: isComplete(session?.user ?? null),
      requestOtp: handleRequestOtp,
      verifyOtp: handleVerifyOtp,
      saveProfile,
      logout,
      getToken,
    }),
    [status, session, handleRequestOtp, handleVerifyOtp, saveProfile, logout, getToken]
  );

  return <ShopAuthContext.Provider value={value}>{children}</ShopAuthContext.Provider>;
}

export function useShopAuth(): ShopAuthValue {
  const ctx = useContext(ShopAuthContext);
  if (!ctx) throw new Error("useShopAuth must be used within ShopAuthProvider");
  return ctx;
}
