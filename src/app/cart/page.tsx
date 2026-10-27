"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CoverImage from "@/components/CoverImage";
import OrderSummary, { formatMoney } from "@/components/shop/OrderSummary";
import { useCart } from "@/lib/shop/cart-context";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

export default function CartPage() {
  const { lines, ready, subtotal, setQuantity, remove } = useCart();

  return (
    <>
      <Navbar active="Shop" />

      <main className={shop.page}>
        <div className="container">
          <header className={shop.head}>
            <h1 className={`display ${shop.title}`}>
              Your <span>Cart</span>
            </h1>
            <p className={shop.sub}>
              {ready && lines.length > 0
                ? `${lines.length} ${lines.length === 1 ? "item" : "items"} ready to go`
                : "Handmade pieces, waiting for a home"}
            </p>
          </header>

          {!ready ? (
            <p className={shop.loading}>Loading your cart…</p>
          ) : lines.length === 0 ? (
            <div className={`${shop.card} ${shop.empty}`}>
              <ShoppingBag size={44} strokeWidth={1.4} />
              <div>
                <p>Your cart is empty.</p>
                <p className={shop.hint}>Browse the shop and add something you love.</p>
              </div>
              <Link href="/#shop" className={shop.secondary}>
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className={styles.layout}>
              <ul className={styles.lines}>
                {lines.map((line) => (
                  <li key={`${line.productId}:${line.variationId}`} className={styles.line}>
                    <Link href={`/product/${line.slug}`} className={styles.thumb}>
                      <CoverImage
                        src={line.image}
                        alt={line.name}
                        icon={ShoppingBag}
                        tone="lavender"
                        rounded="sm"
                      />
                    </Link>

                    <div className={styles.lineBody}>
                      <Link href={`/product/${line.slug}`} className={styles.lineName}>
                        {line.name}
                      </Link>
                      <span className={styles.lineVariant}>{line.variationName}</span>
                      <span className={styles.linePrice}>{formatMoney(line.price)} each</span>
                    </div>

                    <div className={styles.lineControls}>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${line.name}`}
                          onClick={() =>
                            setQuantity(line.productId, line.variationId, line.quantity - 1)
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${line.name}`}
                          disabled={line.quantity >= line.stock}
                          onClick={() =>
                            setQuantity(line.productId, line.variationId, line.quantity + 1)
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <span className={styles.lineTotal}>
                        {formatMoney(line.price * line.quantity)}
                      </span>

                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Remove ${line.name}`}
                        onClick={() => remove(line.productId, line.variationId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <OrderSummary lines={lines} subtotal={subtotal}>
                <Link href="/checkout" className={shop.primary}>
                  Proceed to Checkout
                </Link>
                <Link href="/#shop" className={styles.continue}>
                  Continue shopping
                </Link>
              </OrderSummary>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
