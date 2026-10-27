import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart — R5atelier",
};

// Cart, customer session and order data are all browser-side and per-customer,
// so there is no static shell worth prerendering. This opts the subtree out of
// Cache Components' static-shell requirement in one place.
export const instant = false;

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
