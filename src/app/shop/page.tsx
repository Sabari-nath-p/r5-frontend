import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ShopCatalog from "@/components/shop/ShopCatalog";
import { getCategories, getProducts, getTags } from "@/lib/api";
import styles from "./page.module.css";

export const metadata = {
  title: "Shop — R5atelier",
  description: "Browse every handmade crochet creation, gift and paper product.",
};

// The listing reads ?q= / ?category= off the request, so it renders per-request
// rather than shipping a prerendered static shell.
export const instant = false;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const { q = "", category = "", tag = "" } = await searchParams;

  // The whole active catalogue is fetched once; filtering happens in the
  // browser, so changing a filter is instant instead of a round-trip.
  const [productList, categories, tags] = await Promise.all([
    getProducts({ status: "ACTIVE", limit: 200 }),
    getCategories(),
    getTags(),
  ]);

  return (
    <>
      <Navbar active="Shop" categories={categories} />
      <main>
        <section className={styles.head}>
          <div className="container">
            <h1 className={`display ${styles.heading}`}>
              Shop <span>Everything</span>
            </h1>
            <p className={styles.lead}>
              Every handmade piece in one place — search, filter by category and find
              the one that feels like you.
            </p>
          </div>
        </section>

        <div className="container">
          <ShopCatalog
            products={productList.items}
            categories={categories}
            tags={tags}
            initialQuery={q}
            initialCategory={category}
            initialTag={tag}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
