import type { ApiAuthUser } from "@/lib/api-types";

// Deliberately distinct from the admin portal's key, so signing in to the shop
// never disturbs an admin session open in the same browser.
const SESSION_KEY = "r5_shop_session";

export type ShopSession = {
  accessToken: string;
  refreshToken: string;
  user: ApiAuthUser;
};

export function loadShopSession(): ShopSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ShopSession) : null;
  } catch {
    return null;
  }
}

export function saveShopSession(session: ShopSession) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearShopSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
