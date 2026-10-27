import type { Metadata } from "next";
import { Poppins, Fraunces } from "next/font/google";
import ShopProviders from "@/lib/shop/providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "R5atelier — Crafted with Love",
  description:
    "Unique crochet creations, thoughtful gifts and creative paper products — made to add warmth, joy and personality to your everyday moments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${fraunces.variable}`}>
      <body>
        <ShopProviders>{children}</ShopProviders>
      </body>
    </html>
  );
}
