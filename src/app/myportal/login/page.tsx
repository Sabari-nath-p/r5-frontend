"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError } from "@/lib/admin/client";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const { status, isAdmin, requestOtp, verifyOtp } = useAdminAuth();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      router.replace("/myportal");
    }
  }, [status, isAdmin, router]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtp(email);
      setNotice(`OTP sent — expires in ${res.expiresInMinutes} minute(s).`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email, otp, name || undefined);
      router.replace("/myportal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.brand}>
          R5atelier <span>Admin</span>
        </p>
        <p className={styles.subtitle}>
          {step === "email" ? "Sign in with your email" : `Enter the OTP sent to ${email}`}
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {notice && !error && <p className={styles.success}>{notice}</p>}

        {step === "email" ? (
          <form className={styles.form} onSubmit={handleRequestOtp}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@r5atelier.com"
                autoFocus
              />
            </div>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleVerifyOtp}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="otp">
                OTP
              </label>
              <input
                id="otp"
                type="text"
                required
                inputMode="numeric"
                className={styles.input}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="759409"
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? "Verifying…" : "Verify & Sign in"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                setStep("email");
                setError(null);
                setNotice(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
