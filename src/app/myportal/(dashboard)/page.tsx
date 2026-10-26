import Link from "next/link";
import adminStyles from "@/components/admin/admin.module.css";
import styles from "./page.module.css";

const sections = [
  { label: "Banners", href: "/myportal/banners", description: "Homepage promotional slides." },
  { label: "Categories", href: "/myportal/categories", description: "Shop-by-category tiles." },
  { label: "Products", href: "/myportal/products", description: "Catalog, pricing and stock." },
  { label: "Tags", href: "/myportal/tags", description: "Labels used to filter products." },
  { label: "Gallery", href: "/myportal/gallery", description: "Instagram-style gallery images." },
];

export default function AdminDashboardPage() {
  return (
    <div className={adminStyles.page}>
      <div className={adminStyles.pageHeader}>
        <div>
          <h1 className={adminStyles.title}>Dashboard</h1>
          <p className={adminStyles.subtitle}>Manage the content shown on r5atelier.in.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {sections.map((section) => (
          <Link href={section.href} key={section.href} className={styles.card}>
            <h3>{section.label}</h3>
            <p>{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
