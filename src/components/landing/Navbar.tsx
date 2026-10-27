import Link from "next/link";
import { ChevronDown, Heart, Search } from "lucide-react";
import NavActions from "./NavActions";
import MobileNav from "./MobileNav";
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
  categories?: ApiCategory[];
}

export default function Navbar({ active = "Home", categories = [] }: NavbarProps) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* Left: menu button (phones only) + wordmark */}
        <div className={styles.left}>
          <MobileNav links={links} categories={categories} active={active} />

          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true">
              <Heart size={17} strokeWidth={2.5} />
            </span>
            <span className={styles.logoText}>
              <span className={styles.logoName}>R5atelier</span>
              <span className={styles.logoTagline}>Made with love</span>
            </span>
          </Link>
        </div>

        {/* Centre: primary navigation */}
        <nav className={styles.nav} aria-label="Primary">
          <ul>
            <li>
              <Link href="/" className={active === "Home" ? styles.active : undefined}>
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

        {/* Right: search + account/cart */}
        <div className={styles.actions}>
          <label className={styles.search}>
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input type="search" placeholder="Search handmade happiness…" />
          </label>

          <NavActions />
        </div>
      </div>
    </header>
  );
}
