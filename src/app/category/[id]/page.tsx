import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Breadcrumb from "@/components/product/Breadcrumb";
import ProductCard from "@/components/ProductCard";
import { getCategories, getCategory, getProducts } from "@/lib/api";
import styles from "./page.module.css";

// Category ids aren't known at build time, so this route renders per-request
// instead of shipping a prerendered static shell.
export const instant = false;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [category, categories, productList] = await Promise.all([
    getCategory(id),
    getCategories(),
    getProducts({ categoryId: id, status: "ACTIVE", limit: 40 }),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <>
      <Navbar categories={categories} />
      <main>
        <Breadcrumb category="Categories" current={category.name} />

        <div className="container">
          <div className={styles.head}>
            <h1 className={styles.heading}>{category.name}</h1>
            {category.description && <p className={styles.description}>{category.description}</p>}
          </div>
        </div>

        <div className="container">
          <section className={styles.section}>
            {productList.items.length === 0 ? (
              <p className={styles.empty}>No products in this category yet.</p>
            ) : (
              <div className={styles.grid}>
                {productList.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
