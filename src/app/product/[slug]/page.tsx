import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Breadcrumb from "@/components/product/Breadcrumb";
import Gallery from "@/components/product/Gallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductTabs from "@/components/product/ProductTabs";
import RelatedProducts from "@/components/product/RelatedProducts";
import { getCategories, getProductBySlug, getProducts } from "@/lib/api";
import styles from "./page.module.css";

// Product slugs aren't known at build time, so this route renders per-request
// instead of shipping a prerendered static shell.
export const instant = false;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product, categories] = await Promise.all([getProductBySlug(slug), getCategories()]);

  if (!product || product.status !== "ACTIVE") {
    notFound();
  }

  const relatedList = await getProducts({
    categoryId: product.categoryId,
    status: "ACTIVE",
    limit: 5,
  });
  const related = relatedList.items.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <>
      <Navbar active="Shop" categories={categories} />
      <main>
        <Breadcrumb category={product.category.name} current={product.name} />

        <section className="container">
          <div className={styles.top}>
            <Gallery images={product.images} name={product.name} />
            <ProductInfo product={product} />
          </div>
        </section>

        <div className="container">
          <hr className={styles.divider} />
        </div>

        <div className="container">
          <ProductTabs product={product} />
        </div>

        <div className="container">
          <RelatedProducts products={related} />
        </div>
      </main>
      <Footer />
    </>
  );
}
