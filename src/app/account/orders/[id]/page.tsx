import { Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import OrderView from "./OrderView";
import shop from "@/components/shop/shop.module.css";

/**
 * The shell renders on the server; the order itself is fetched in the browser
 * with the customer's token, so it sits behind a Suspense boundary.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <main className={shop.page}>
        <div className="container">
          <Suspense fallback={<p className={shop.loading}>Loading order…</p>}>
            <OrderView id={id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
