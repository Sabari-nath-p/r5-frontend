"use client";

import { ShopAuthProvider } from "./auth-context";
import { CartProvider } from "./cart-context";

/** Cart and customer session, shared by every storefront page. */
export default function ShopProviders({ children }: { children: React.ReactNode }) {
  return (
    <ShopAuthProvider>
      <CartProvider>{children}</CartProvider>
    </ShopAuthProvider>
  );
}
