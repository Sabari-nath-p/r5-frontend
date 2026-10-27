import type { Metadata } from "next";
import ShopProviders from "@/lib/shop/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "R5atelier — Crafted with Love",
  description:
    "Unique crochet creations, thoughtful gifts and creative paper products — made to add warmth, joy and personality to your everyday moments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ShopProviders>{children}</ShopProviders>
      </body>
    </html>
  );
}
