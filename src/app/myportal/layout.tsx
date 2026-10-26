import type { Metadata } from "next";
import { AdminAuthProvider } from "@/lib/admin/auth-context";

export const metadata: Metadata = {
  title: "R5atelier Admin",
  description: "Manage banners, categories, products, tags and gallery images.",
};

// The whole admin portal is an authenticated, client-rendered tool (session
// lives in localStorage, data is fetched per-user) — nothing under /myportal
// benefits from a prerendered static shell, so this opts the entire subtree
// out of Cache Components' static-shell requirement in one place.
export const instant = false;

export default function MyPortalLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
