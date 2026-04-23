"use client";

import { useState, useTransition } from "react";
import { addRevisionRoundAction, clearRevisionBalanceAction } from "../actions";
import { REVISION_ROUND_PRICE } from "@/lib/engagement";

export function RevisionRoundButton({
  clientId,
  currentBalance,
}: {
  clientId: string;
  currentBalance: number;
}) {
  const [balance, setBalance] = useState(currentBalance);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rounds = Math.round(balance / REVISION_ROUND_PRICE);

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addRevisionRoundAction(clientId);
      if (res.ok) {
        setBalance(res.newBalance);
      } else {
        setError(res.error);
      }
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      const res = await clearRevisionBalanceAction(clientId);
      if (res.ok) {
        setBalance(0);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-1">
      {balance > 0 && (
        <p className="text-[10px] text-[#7A5500] mb-1">
          +${balance.toLocaleString()} revision {rounds === 1 ? "round" : `rounds (${rounds})`}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="text-[9px] font-medium uppercase tracking-widest text-muted hover:text-navy transition-colors disabled:opacity-50"
        >
          +Rev Round
        </button>
        {balance > 0 && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="text-[9px] font-medium uppercase tracking-widest text-red-400 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
      {error && <p className="text-[9px] text-red-700 mt-0.5">{error}</p>}
    </div>
  );
}
