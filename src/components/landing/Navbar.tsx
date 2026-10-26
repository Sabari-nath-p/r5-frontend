import Link from "next/link";
import { ChevronDown, Heart, Search, ShoppingBag, User } from "lucide-react";
import type { ApiCategory } from "@/lib/api";
import styles from "./Navbar.module.css";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/#shop" },
  { label: "Gift Sets", href: "/#gift-sets" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

interface NavbarProps {
  active?: string;
  cartCount?: number;
  categories?: ApiCategory[];
}

export default function Navbar({ active = "Home", cartCount = 1, categories = [] }: NavbarProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true">
            <Heart size={18} strokeWidth={2.5} />
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoName}>R5atelier</span>
            <span className={styles.logoTagline}>Made with love</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul>
            <li key="Home">
              <Link
                href="/"
                className={active === "Home" ? styles.active : undefined}
              >
                Home
              </Link>
            </li>

            {categories.length > 0 && (
              <li className={styles.navDropdown}>
                <button
                  type="button"
                  className={active === "Categories" ? styles.active : undefined}
                >
                  Categories <ChevronDown size={14} />
                </button>
                <ul className={styles.dropdownMenu}>
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link href={`/category/${category.id}`}>{category.name}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {links.slice(1).map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={link.label === active ? styles.active : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <label className={styles.search}>
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input type="search" placeholder="Search handmade happiness..." />
          </label>

          <button type="button" className={styles.iconBtn} aria-label="Account">
            <User size={19} strokeWidth={1.8} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Wishlist">
            <Heart size={19} strokeWidth={1.8} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Cart">
            <ShoppingBag size={19} strokeWidth={1.8} />
            {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
