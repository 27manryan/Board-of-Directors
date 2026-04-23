"use client";

import { useState, useTransition } from "react";
import { togglePaymentAction } from "../actions";

export function PaymentToggle({
  clientId,
  paymentNumber,
  initialPaid,
  amount,
}: {
  clientId: string;
  paymentNumber: 1 | 2 | 3;
  initialPaid: boolean;
  amount: number;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !paid;
    setPaid(next);
    startTransition(async () => {
      try {
        await togglePaymentAction(clientId, paymentNumber, next);
      } catch {
        setPaid(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-widest border transition-colors disabled:opacity-60 ${
        paid
          ? "bg-navy text-cream-100 border-navy"
          : "bg-transparent text-muted border-[#ECE8E0] hover:border-navy hover:text-navy"
      }`}
      title={`Payment ${paymentNumber}: $${amount.toLocaleString()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${paid ? "bg-gold" : "bg-cream-300"}`} />
      P{paymentNumber}
    </button>
  );
}
