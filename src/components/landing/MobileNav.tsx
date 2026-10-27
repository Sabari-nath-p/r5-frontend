"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import InstagramIcon from "../icons/InstagramIcon";
import type { ApiCategory } from "@/lib/api";
import styles from "./Navbar.module.css";

/**
 * The phone/tablet half of the header. Below 900px the inline nav is hidden,
 * so this drawer carries the same links plus the category list and search.
 */
export default function MobileNav({
  links,
  categories,
  active,
}: {
  links: { label: string; href: string }[];
  categories: ApiCategory[];
  active: string;
}) {
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.burger}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {open && (
        <div className={styles.drawerBackdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHead}>
              <span className={styles.drawerTitle}>Menu</span>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <label className={styles.drawerSearch}>
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              <input type="search" placeholder="Search handmade happiness…" />
            </label>

            <nav className={styles.drawerNav} aria-label="Mobile">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={link.label === active ? styles.drawerLinkActive : styles.drawerLink}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {categories.length > 0 && (
                <>
                  <button
                    type="button"
                    className={styles.drawerLink}
                    onClick={() => setCategoriesOpen((value) => !value)}
                    aria-expanded={categoriesOpen}
                  >
                    Categories
                    <ChevronDown
                      size={16}
                      className={categoriesOpen ? styles.chevronOpen : undefined}
                    />
                  </button>

                  {categoriesOpen && (
                    <div className={styles.drawerSub}>
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/category/${category.id}`}
                          onClick={() => setOpen(false)}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </nav>

            <a
              href="https://www.instagram.com/r5atelier/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.drawerInstagram}
            >
              <InstagramIcon size={17} /> Follow on Instagram
            </a>
          </div>
        </div>
      )}
    </>
  );
}
