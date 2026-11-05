import Form from "next/form";
import Link from "next/link";
import { DM_Sans, Fraunces } from "next/font/google";
import { ArrowRight, Gift, HandHeart, Search, ShieldCheck } from "lucide-react";
import InstagramIcon from "../icons/InstagramIcon";
import HeroScene from "./HeroScene";
import HeroSpotlight from "./HeroSpotlight";
import { cheapestVariation, toNumber, type ApiCategory, type ApiProduct } from "@/lib/api-types";
import styles from "./Hero.module.css";

const heroDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--hero-display",
});

const heroBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--hero-body",
});

const promises = [
  { icon: HandHeart, label: "100% handmade" },
  { icon: Gift, label: "Perfect for gifting" },
  { icon: ShieldCheck, label: "Safe, reliable delivery" },
];

export default function Hero({
  products,
  categories,
}: {
  products: ApiProduct[];
  categories: ApiCategory[];
}) {
  // Lowest price actually on sale, so the claim can never drift from the catalog.
  const prices = products
    .map((product) => cheapestVariation(product.variations))
    .filter((variation) => variation && variation.stock > 0)
    .map((variation) => toNumber(variation?.price));
  const startingAt = prices.length > 0 ? Math.min(...prices) : null;

  const spotlight = products
    .filter((product) => product.variations.length > 0)
    .slice(0, 5);

  return (
    <section className={`${styles.hero} ${heroDisplay.variable} ${heroBody.variable}`}>
      <HeroScene />
      <div className={styles.scrim} aria-hidden="true" />

      <div className={`container ${styles.layout}`}>
        <div className={styles.copy}>
          <p className={styles.overline}>
            <span aria-hidden="true" /> The handmade crochet marketplace
          </p>

          <h1 className={styles.headline}>
            Handmade crochet, <em>crafted with love.</em>
          </h1>

          <p className={styles.lead}>
            Soft toys, thoughtful gifts and one-of-a-kind pieces, stitched by hand and
            ready to brighten someone&rsquo;s everyday.
          </p>

          <div className={styles.ctaRow}>
            <Link href="/shop" className={styles.cta}>
              Shop the collection
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {startingAt !== null && (
              <p className={styles.startingAt}>
                Pieces from <strong>₹{startingAt}</strong>
              </p>
            )}
          </div>

          <Form action="/shop" className={styles.search} role="search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              placeholder="Search crochet gifts…"
              aria-label="Search products"
              autoComplete="off"
            />
            <button type="submit">Search</button>
          </Form>

          {categories.length > 0 && (
            <nav className={styles.chips} aria-label="Popular categories">
              {categories.slice(0, 4).map((category) => (
                <Link href={`/category/${category.id}`} key={category.id}>
                  {category.name}
                </Link>
              ))}
            </nav>
          )}

          <ul className={styles.promises}>
            {promises.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                {label}
              </li>
            ))}
            <li>
              <a
                href="https://www.instagram.com/r5atelier/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow R5atelier on Instagram"
              >
                <InstagramIcon size={16} />
                @r5atelier
              </a>
            </li>
          </ul>
        </div>

        <HeroSpotlight products={spotlight} />
      </div>
    </section>
  );
}
