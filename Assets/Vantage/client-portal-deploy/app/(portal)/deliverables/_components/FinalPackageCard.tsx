"use client";

import { useState } from "react";

export default function FinalPackageCard({
  fileName,
  unlocked,
  isProBono,
}: {
  fileName: string;
  unlocked: boolean;
  isProBono: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_number: 3, success_path: "/deliverables" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment setup failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="card mb-8">
      <div className="px-4 sm:px-8 py-6 border-b border-[#ECE8E0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="label mb-2">Final Delivery</p>
          <h2 className="font-serif text-2xl font-semibold text-navy">Your Compiled Package</h2>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${
            unlocked ? "bg-[#E6F0E6] text-[#2D5C2D]" : "bg-[#FFF8E6] text-[#7A5500]"
          }`}
        >
          {unlocked ? "Unlocked" : "Locked"}
        </span>
      </div>
      <div className="px-4 sm:px-8 py-6">
        {unlocked ? (
          <>
            <a href="/api/deliverables/download" className="btn-primary inline-block">
              Download Final Package
            </a>
            <p className="text-xs text-muted mt-3">{fileName} · PDF</p>
          </>
        ) : (
          <>
            <p className="text-sm text-navy/80 leading-relaxed mb-4 max-w-lg">
              Your final compiled deliverable package is ready.
              {isProBono ? "" : " Completing your final payment unlocks the download."}
            </p>
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting to Stripe…" : "Pay & Unlock Final Delivery"}
            </button>
            {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
