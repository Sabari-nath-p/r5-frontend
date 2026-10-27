import type { Metadata } from "next";
import { Anton, Comic_Neue } from "next/font/google";
import CartBar from "@/components/shop/CartBar";
import ShopProviders from "@/lib/shop/providers";
import "./globals.css";

/*
 * The storefront's look comes from Comic Sans and Impact, which only exist on
 * desktop machines — phones fell through the whole stack to the generic
 * `cursive`/`sans-serif`, so mobile rendered a handwriting script instead.
 * These two webfonts are the closest matches and sit at the end of each stack:
 * a machine that has the real font still uses it, everything else now gets a
 * downloaded font that looks the same rather than whatever the OS picks.
 */
const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-comic",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-anton",
});

export const metadata: Metadata = {
  title: "R5atelier — Crafted with Love",
  description:
    "Unique crochet creations, thoughtful gifts and creative paper products — made to add warmth, joy and personality to your everyday moments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${comicNeue.variable} ${anton.variable}`}>
      <body>
        <ShopProviders>
          {children}
          {/* Floats over every storefront page while the cart has items. */}
          <CartBar />
        </ShopProviders>
      </body>
    </html>
  );
}
