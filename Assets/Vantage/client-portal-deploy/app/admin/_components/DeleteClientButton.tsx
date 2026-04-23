"use client";

import { useTransition } from "react";
import { deleteClientAction } from "../actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete ${clientName}? This removes the auth user, all visibility, comments, and submissions. Cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteClientAction(clientId);
      } catch (e) {
        alert(`Delete failed: ${(e as Error).message}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[10px] font-medium uppercase tracking-widest text-muted hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
