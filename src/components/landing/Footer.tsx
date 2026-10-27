"use client";

import { Heart, Send } from "lucide-react";
import InstagramIcon from "../icons/InstagramIcon";
import styles from "./Footer.module.css";

const quickLinks = ["Home", "Shop", "Categories", "Gift Sets", "About Us", "Contact"];
const careLinks = [
  "Track Order",
  "Shipping Policy",
  "Return & Refund",
  "FAQs",
  "Size Guide",
  "Care Instructions",
];

function SocialIcon({ kind }: { kind: "instagram" | "facebook" | "pinterest" | "youtube" }) {
  switch (kind) {
    case "instagram":
      return <InstagramIcon />;
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 21v-7h2.5l.5-3H14V9c0-.9.3-1.5 1.7-1.5H17V4.8C16.6 4.7 15.7 4.6 14.6 4.6 12.3 4.6 10.8 6 10.8 8.5V11H8v3h2.8v7" />
        </svg>
      );
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 19c.8-2.3 1.6-5 2.1-7.1.3-1.3 2.4-1.5 3.1-.2.5.9.3 2.3-.2 3.3-.6 1.2.2 2.3 1.5 2.1 2-.3 3-2.4 3-4.6 0-2.9-2.4-5.1-5.6-5.1-3.6 0-5.9 2.6-5.9 5.4 0 1 .3 1.7.9 2.3" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="M10.5 9.8v4.4l4-2.2-4-2.2Z" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <a href="#" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true">
              <Heart size={16} strokeWidth={2.5} />
            </span>
            <span>
              <span className={styles.logoName}>R5atelier</span>
              <span className={styles.logoTagline}>Made with love</span>
            </span>
          </a>
          <p className={styles.desc}>
            Handmade crochet items, thoughtful gifts and creative paper
            products crafted to make life a little more beautiful.
          </p>
          <div className={styles.socials}>
            {(["instagram", "facebook", "pinterest", "youtube"] as const).map((kind) => (
              <a href="#" key={kind} aria-label={kind} className={styles.socialBtn}>
                <SocialIcon kind={kind} />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.col}>
          <h4>Quick Links</h4>
          <ul>
            {quickLinks.map((l) => (
              <li key={l}>
                <a href="#">{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.col}>
          <h4>Customer Care</h4>
          <ul>
            {careLinks.map((l) => (
              <li key={l}>
                <a href="#">{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.newsletter}>
          <h4>Subscribe to Our Newsletter</h4>
          <p>Get the latest updates, new arrivals and special offers.</p>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email" required />
            <button type="submit" aria-label="Subscribe">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>© 2026 R5atelier. All rights reserved.</p>
        <p>
          Made with <Heart size={13} fill="currentColor" /> for handmade lovers
        </p>
      </div>
    </footer>
  );
}
