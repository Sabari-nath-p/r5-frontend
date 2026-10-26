"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth-context";
import styles from "./AdminShell.module.css";

const navItems = [
  { label: "Dashboard", href: "/myportal" },
  { label: "Banners", href: "/myportal/banners" },
  { label: "Categories", href: "/myportal/categories" },
  { label: "Products", href: "/myportal/products" },
  { label: "Tags", href: "/myportal/tags" },
  { label: "Gallery", href: "/myportal/gallery" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, isAdmin, user, logout } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myportal/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className={styles.centerState}>Loading…</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className={styles.notAdminBox}>
        <h2>Not authorized</h2>
        <p>
          Signed in as {user?.email}, but this account doesn&apos;t have admin access. Ask an
          existing admin to grant the ADMIN role to this email.
        </p>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={() => {
            logout();
            router.replace("/myportal/login");
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/myportal" className={styles.brand}>
          R5atelier <span>Admin</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.email}>{user?.email}</span>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => {
              logout();
              router.replace("/myportal/login");
            }}
          >
            Sign out
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
