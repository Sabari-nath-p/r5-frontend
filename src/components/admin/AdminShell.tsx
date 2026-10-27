"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  GalleryVerticalEnd,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShieldAlert,
  ShoppingBag,
  Tags,
  Shapes,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ToastProvider } from "./Toast";
import styles from "./AdminShell.module.css";

type NavItem = { label: string; href: string; icon: React.ReactNode };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/myportal", icon: <LayoutDashboard size={17} /> },
      { label: "Orders", href: "/myportal/orders", icon: <ShoppingBag size={17} /> },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/myportal/products", icon: <Package size={17} /> },
      { label: "Categories", href: "/myportal/categories", icon: <Shapes size={17} /> },
      { label: "Tags", href: "/myportal/tags", icon: <Tags size={17} /> },
    ],
  },
  {
    label: "Storefront",
    items: [
      { label: "Banners", href: "/myportal/banners", icon: <GalleryVerticalEnd size={17} /> },
      { label: "Gallery", href: "/myportal/gallery", icon: <Images size={17} /> },
    ],
  },
];

/** Longest matching nav href wins, so /myportal/products/new keeps Products lit. */
function isActive(pathname: string, href: string) {
  if (href === "/myportal") return pathname === "/myportal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentLabel(pathname: string) {
  const all = NAV_GROUPS.flatMap((group) => group.items);
  const match = all
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Dashboard";
}

/*
 * The two pieces that need the current URL are split out and wrapped in
 * Suspense below: reading the pathname during a prerender is a browser-only
 * dependency, and on a dynamic route (/myportal/products/[id]) that bails the
 * whole static shell unless it sits behind a boundary. `pathname: null` renders
 * the same markup with nothing highlighted, which is what the server sends.
 */
function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <div>
      {NAV_GROUPS.map((group) => (
        <div className={styles.navGroup} key={group.label}>
          <span className={styles.navGroupLabel}>{group.label}</span>
          {group.items.map((item) => {
            const active = pathname !== null && isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ActiveNavList({ onNavigate }: { onNavigate: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

function Crumb({ pathname }: { pathname: string | null }) {
  return (
    <nav className={styles.crumb} aria-label="Breadcrumb">
      Portal <ChevronRight size={13} />{" "}
      <strong>{pathname === null ? "" : currentLabel(pathname)}</strong>
    </nav>
  );
}

function ActiveCrumb() {
  return <Crumb pathname={usePathname()} />;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, isAdmin, user, logout } = useAdminAuth();
  const router = useRouter();

  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myportal/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function signOut() {
    logout();
    router.replace("/myportal/login");
  }

  if (status === "loading") {
    return (
      <div className={styles.centerState} data-admin-portal>
        <div className={styles.spinner} />
        Loading your portal…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className={styles.gate} data-admin-portal>
        <div className={styles.gateCard}>
          <div className={styles.gateIcon}>
            <ShieldAlert size={21} />
          </div>
          <h2>Not authorized</h2>
          <p>
            Signed in as {user?.email}, but this account doesn&apos;t have admin access. Ask an
            existing admin to grant the ADMIN role to this email.
          </p>
          <button type="button" className={styles.menuItem} onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const initials = (user?.name || user?.email || "?").trim().slice(0, 2);
  const closeNav = () => setNavOpen(false);

  return (
    <ToastProvider>
      <div className={styles.shell} data-admin-portal>
        {navOpen && <div className={styles.backdrop} onClick={closeNav} />}

        <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
          <Link href="/myportal" className={styles.brand} onClick={closeNav}>
            <span className={styles.brandMark}>R5</span>
            <span className={styles.brandText}>
              <strong>R5atelier</strong>
              <span>Admin</span>
            </span>
          </Link>

          <Suspense fallback={<NavList pathname={null} onNavigate={closeNav} />}>
            <ActiveNavList onNavigate={closeNav} />
          </Suspense>

          <div className={styles.sidebarFooter}>
            <a href="/" target="_blank" rel="noreferrer" className={styles.storeLink}>
              <ExternalLink size={15} /> View storefront
            </a>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.burger}
              onClick={() => setNavOpen((open) => !open)}
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
            >
              {navOpen ? <X size={17} /> : <Menu size={17} />}
            </button>

            <Suspense fallback={<Crumb pathname={null} />}>
              <ActiveCrumb />
            </Suspense>

            <span className={styles.topbarSpacer} />

            <div className={styles.account} ref={accountRef}>
              <button
                type="button"
                className={styles.accountButton}
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className={styles.avatar}>{initials}</span>
                <span className={styles.accountEmail}>{user?.email}</span>
              </button>

              {menuOpen && (
                <div className={styles.menu} role="menu">
                  <div className={styles.menuHead}>
                    <strong>{user?.email}</strong>
                    <span>{user?.role}</span>
                  </div>
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.menuItem}
                    role="menuitem"
                  >
                    <ExternalLink size={15} /> View storefront
                  </a>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={signOut}
                    role="menuitem"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
