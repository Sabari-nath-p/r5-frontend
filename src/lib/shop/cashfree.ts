const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

type CashfreeInstance = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => CashfreeInstance;
  }
}

let sdkPromise: Promise<void> | null = null;

/** Loads the Cashfree script once, reusing the same promise for later calls. */
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cashfree can only be opened in the browser."));
  }

  if (window.Cashfree) return Promise.resolve();

  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Could not load the payment gateway."));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Hands the browser over to Cashfree's hosted checkout. The gateway sends the
 * customer back to the return URL configured when the order was created.
 */
export async function openCashfreeCheckout(paymentSessionId: string): Promise<void> {
  await loadSdk();

  const mode =
    process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
  const cashfree = window.Cashfree?.({ mode });

  if (!cashfree) {
    throw new Error("The payment gateway is unavailable right now.");
  }

  const result = await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });

  if (result?.error) {
    throw new Error(result.error.message ?? "Payment was not completed.");
  }
}
