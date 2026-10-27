import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — R5atelier",
};

// Cart, customer session and order data are all browser-side and per-customer,
// so there is no static shell worth prerendering. This opts the subtree out of
// Cache Components' static-shell requirement in one place.
export const instant = false;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
