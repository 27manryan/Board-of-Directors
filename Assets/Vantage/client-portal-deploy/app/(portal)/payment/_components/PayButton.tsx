"use client";

import { useState } from "react";

export default function PayButton({
  paymentNumber,
  amountFormatted,
}: {
  paymentNumber: 2 | 3;
  amountFormatted: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_number: paymentNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="btn-primary w-full text-center sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? "Redirecting to Stripe…" : `Pay Now — ${amountFormatted}`}
      </button>
      {error && (
        <p className="mt-3 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
