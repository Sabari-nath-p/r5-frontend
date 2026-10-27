"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck, UserRound } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CountryCodeSelect from "@/components/shop/CountryCodeSelect";
import { useShopAuth } from "@/lib/shop/auth-context";
import { ApiError } from "@/lib/shop/client";
import shop from "@/components/shop/shop.module.css";
import styles from "./page.module.css";

type Step = "email" | "otp" | "profile";

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account/orders";
  const { status, requestOtp, verifyOtp, saveProfile, profileComplete } = useShopAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Someone who is already signed in and has a complete profile has nothing
    // to do here.
    if (status === "authenticated" && profileComplete && step !== "profile") {
      router.replace(next);
    }
  }, [status, profileComplete, step, next, router]);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { expiresInMinutes } = await requestOtp(email.trim().toLowerCase());
      setNotice(`We emailed a code to ${email.trim()}. It expires in ${expiresInMinutes} minutes.`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() });

      // A brand new account has no name or phone yet, so collect them before
      // sending the customer on.
      if (!result.profileComplete) {
        setName(result.user.name ?? "");
        setPhone(result.user.phone ?? "");
        setCountryCode(result.user.countryCode ?? "+91");
        setNotice("Almost there — tell us who you are.");
        setStep("profile");
        return;
      }

      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ name: name.trim(), phone: phone.trim(), countryCode });
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={`${shop.card} ${styles.card}`}>
        <span className={styles.badge} aria-hidden="true">
          {step === "email" ? <Mail size={22} /> : step === "otp" ? <ShieldCheck size={22} /> : <UserRound size={22} />}
        </span>

        <h1 className={`display ${styles.title}`}>
          {step === "email" && "Sign in"}
          {step === "otp" && "Enter your code"}
          {step === "profile" && "Welcome to R5atelier"}
        </h1>
        <p className={styles.lead}>
          {step === "email" && "We will email you a one-time code — no password needed."}
          {step === "otp" && "Check your inbox for the six-digit code."}
          {step === "profile" && "We just need a name and number for your deliveries."}
        </p>

        {error && <div className={shop.error}>{error}</div>}
        {!error && notice && <div className={shop.notice}>{notice}</div>}

        {step === "email" && (
          <form onSubmit={submitEmail}>
            <div className={shop.field}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className={shop.primary} disabled={busy}>
              {busy ? "Sending…" : "Send code"} <ArrowRight size={17} />
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp}>
            <div className={shop.field}>
              <label htmlFor="login-otp">One-time code</label>
              <input
                id="login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                placeholder="000000"
                className={styles.otpInput}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button type="submit" className={shop.primary} disabled={busy}>
              {busy ? "Verifying…" : "Verify and continue"} <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className={styles.back}
              onClick={() => {
                setStep("email");
                setOtp("");
                setNotice(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={submitProfile}>
            <div className={shop.field}>
              <label htmlFor="login-name">Full name</label>
              <input
                id="login-name"
                required
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={shop.field}>
              <label htmlFor="login-phone">Phone number</label>
              <div className={shop.phoneRow}>
                <CountryCodeSelect
                  id="login-country"
                  value={countryCode}
                  onChange={setCountryCode}
                />
                <input
                  id="login-phone"
                  required
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <button type="submit" className={shop.primary} disabled={busy}>
              {busy ? "Saving…" : "Finish"} <ArrowRight size={17} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className={shop.page}>
        <div className="container">
          <Suspense fallback={<p className={shop.loading}>Loading…</p>}>
            <LoginFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
