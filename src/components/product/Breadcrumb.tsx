import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "./Breadcrumb.module.css";

export default function Breadcrumb({
  category,
  current,
}: {
  category: string;
  current: string;
}) {
  return (
    <nav className={`container ${styles.breadcrumb}`} aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <ChevronRight size={13} className={styles.sep} aria-hidden="true" />
      <Link href="/#shop">{category}</Link>
      <ChevronRight size={13} className={styles.sep} aria-hidden="true" />
      <span className={styles.current}>{current}</span>
    </nav>
  );
}
