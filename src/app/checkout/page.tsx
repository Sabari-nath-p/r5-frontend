"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CountryCodeSelect from "@/components/shop/CountryCodeSelect";
import OrderSummary from "@/components/shop/OrderSummary";
import { openCashfreeCheckout } from "@/lib/shop/cashfree";
import { useCart } from "@/lib/shop/cart-context";
import { useShopAuth } from "@/lib/shop/auth-context";
import { ApiError, placeOrder, type PlaceOrderInput } from "@/lib/shop/client";
import type { ApiPaymentMethod } from "@/lib/api-types";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

const EMPTY_ADDRESS = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipcode: "",
  country: "India",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, ready, subtotal, clear } = useCart();
  const { status, user, getToken } = useShopAuth();

  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ApiPaymentMethod>("COD");

  // Guest checkout second step: the same payload is reposted with this code.
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set the moment an order exists, so emptying the cart afterwards does not
  // bounce the customer back to /cart mid-redirect.
  const [placed, setPlaced] = useState(false);

  const isSignedIn = status === "authenticated";

  useEffect(() => {
    // Prefill from the account once it is known, without clobbering anything
    // the customer has already typed.
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName((current) => current || user.name || "");
    setEmail((current) => current || user.email || "");
    setPhone((current) => current || user.phone || "");
    setCountryCode((current) => (current === "+91" ? user.countryCode || "+91" : current));
  }, [user]);

  useEffect(() => {
    if (ready && lines.length === 0 && !placed) {
      router.replace("/cart");
    }
  }, [ready, lines.length, placed, router]);

  const items = useMemo(
    () =>
      lines.map((line) => ({
        productId: line.productId,
        variationId: line.variationId,
        quantity: line.quantity,
      })),
    [lines]
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload: PlaceOrderInput = {
      items,
      address: {
        addressLine1: address.addressLine1.trim(),
        addressLine2: address.addressLine2.trim() || undefined,
        city: address.city.trim(),
        state: address.state.trim(),
        zipcode: address.zipcode.trim(),
        country: address.country.trim() || "India",
      },
      phone: phone.trim(),
      countryCode,
      paymentMethod,
      notes: notes.trim() || undefined,
      // A signed-in customer is identified by their token; guests send their
      // details, plus the OTP once they have been emailed one.
      ...(isSignedIn
        ? {}
        : { name: name.trim(), email: email.trim().toLowerCase(), otp: otp.trim() || undefined }),
    };

    try {
      const token = isSignedIn ? await getToken() : null;
      const result = await placeOrder(payload, token);

      if (result.otpRequired) {
        setOtpRequired(true);
        setOtp("");
        setNotice(result.message);
        return;
      }

      setPlaced(true);

      if (result.payment) {
        // Cashfree: hand off to the gateway, which navigates away. The cart is
        // left alone here and cleared by /checkout/status once the order is
        // confirmed, so a failed handoff does not lose it.
        await openCashfreeCheckout(result.payment.paymentSessionId);
        return;
      }

      clear();
      router.replace(
        `/checkout/status?order_number=${encodeURIComponent(result.order.orderNumber)}`
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "We could not place your order. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready || lines.length === 0) {
    return (
      <>
        <Navbar active="Shop" />
        <main className={shop.page}>
          <div className="container">
            <p className={shop.loading}>Loading your cart…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar active="Shop" />

      <main className={shop.page}>
        <div className="container">
          <header className={shop.head}>
            <h1 className={`display ${shop.title}`}>
              Secure <span>Checkout</span>
            </h1>
            <p className={shop.sub}>
              <Lock size={13} /> Your details are only used to deliver this order.
            </p>
          </header>

          <form className={styles.layout} onSubmit={submit}>
            <div className={styles.main}>
              {error && <div className={shop.error}>{error}</div>}
              {!error && notice && <div className={shop.notice}>{notice}</div>}

              <section className={shop.card}>
                <h2 className={shop.cardTitle}>Contact</h2>

                {isSignedIn ? (
                  <p className={styles.signedIn}>
                    <ShieldCheck size={16} />
                    Ordering as <strong>{user?.name ?? user?.email}</strong>
                    <span>({user?.email})</span>
                  </p>
                ) : (
                  <>
                    <p className={styles.guestHint}>
                      Checking out as a guest.{" "}
                      <Link href="/login?next=/checkout" className={shop.linkBtn}>
                        Sign in instead
                      </Link>
                    </p>
                    <div className={shop.fieldRow}>
                      <div className={shop.field}>
                        <label htmlFor="co-name">Full name</label>
                        <input
                          id="co-name"
                          required
                          autoComplete="name"
                          disabled={otpRequired}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className={shop.field}>
                        <label htmlFor="co-email">Email address</label>
                        <input
                          id="co-email"
                          type="email"
                          required
                          autoComplete="email"
                          disabled={otpRequired}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className={shop.field}>
                  <label htmlFor="co-phone">Phone number</label>
                  <div className={shop.phoneRow}>
                    <CountryCodeSelect
                      id="co-country-code"
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                    <input
                      id="co-phone"
                      required
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                {otpRequired && (
                  <div className={shop.field}>
                    <label htmlFor="co-otp">Verification code</label>
                    <input
                      id="co-otp"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      placeholder="000000"
                      className={styles.otpInput}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <span className={shop.hint}>
                      Sent to {email}. Enter it to confirm this order.
                    </span>
                  </div>
                )}
              </section>

              <section className={shop.card}>
                <h2 className={shop.cardTitle}>Delivery address</h2>

                <div className={shop.field}>
                  <label htmlFor="co-line1">Address line 1</label>
                  <input
                    id="co-line1"
                    required
                    autoComplete="address-line1"
                    placeholder="Flat / house number, street"
                    value={address.addressLine1}
                    onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                  />
                </div>

                <div className={shop.field}>
                  <label htmlFor="co-line2">Address line 2 (optional)</label>
                  <input
                    id="co-line2"
                    autoComplete="address-line2"
                    placeholder="Landmark, area"
                    value={address.addressLine2}
                    onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                  />
                </div>

                <div className={shop.fieldRow}>
                  <div className={shop.field}>
                    <label htmlFor="co-city">City</label>
                    <input
                      id="co-city"
                      required
                      autoComplete="address-level2"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                  </div>
                  <div className={shop.field}>
                    <label htmlFor="co-state">State</label>
                    <input
                      id="co-state"
                      required
                      autoComplete="address-level1"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className={shop.fieldRow}>
                  <div className={shop.field}>
                    <label htmlFor="co-zip">Zipcode / PIN</label>
                    <input
                      id="co-zip"
                      required
                      autoComplete="postal-code"
                      value={address.zipcode}
                      onChange={(e) => setAddress({ ...address, zipcode: e.target.value })}
                    />
                  </div>
                  <div className={shop.field}>
                    <label htmlFor="co-country">Country</label>
                    <input
                      id="co-country"
                      required
                      autoComplete="country-name"
                      value={address.country}
                      onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className={shop.field}>
                  <label htmlFor="co-notes">Delivery notes (optional)</label>
                  <textarea
                    id="co-notes"
                    placeholder="Anything we should know about the delivery?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </section>

              <section className={shop.card}>
                <h2 className={shop.cardTitle}>Payment</h2>

                <div className={styles.payOptions}>
                  <label
                    className={paymentMethod === "COD" ? styles.payOptionActive : styles.payOption}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                    />
                    <Banknote size={22} />
                    <span>
                      <strong>Cash on delivery</strong>
                      Pay the courier when your parcel arrives.
                    </span>
                  </label>

                  <label
                    className={
                      paymentMethod === "CASHFREE" ? styles.payOptionActive : styles.payOption
                    }
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASHFREE"
                      checked={paymentMethod === "CASHFREE"}
                      onChange={() => setPaymentMethod("CASHFREE")}
                    />
                    <CreditCard size={22} />
                    <span>
                      <strong>Pay online</strong>
                      UPI, cards, net banking and wallets via Cashfree.
                    </span>
                  </label>
                </div>
              </section>
            </div>

            <OrderSummary lines={lines} subtotal={subtotal}>
              <button type="submit" className={shop.primary} disabled={busy}>
                <ShoppingBag size={17} />
                {busy
                  ? "Please wait…"
                  : otpRequired
                    ? "Verify and place order"
                    : !isSignedIn
                      ? "Continue"
                      : paymentMethod === "COD"
                        ? "Place order"
                        : "Pay now"}
              </button>
              <p className={styles.secureNote}>
                <Lock size={12} /> Prices and stock are re-checked by our server before your
                order is accepted.
              </p>
            </OrderSummary>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
