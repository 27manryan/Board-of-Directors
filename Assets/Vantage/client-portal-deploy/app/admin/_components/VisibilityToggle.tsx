"use client";

import { useState, useTransition } from "react";
import { toggleVisibilityAction } from "../actions";

export function VisibilityToggle({
  clientId,
  deliverableCode,
  initialReleased,
}: {
  clientId: string;
  deliverableCode: string;
  initialReleased: boolean;
}) {
  const [released, setReleased] = useState(initialReleased);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !released;
    setReleased(next); // optimistic
    startTransition(async () => {
      try {
        await toggleVisibilityAction(clientId, deliverableCode, next);
      } catch {
        setReleased(!next); // rollback
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex items-center w-10 h-5 transition-colors duration-150 focus:outline-none disabled:opacity-60 ${
        released ? "bg-navy" : "bg-cream-300"
      }`}
      aria-label={`Toggle ${deliverableCode} visibility`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white transform transition-transform duration-150 ${
          released ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
