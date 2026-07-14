"use client";

import { useState, useTransition } from "react";
import {
  sendDeliverablesReadyNotificationAction,
  sendFinalPackageNotificationAction,
  sendWelcomeNotificationAction,
} from "../actions";

type SendResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function ClientNotificationButtons({
  clientId,
  finalPackageReady,
  sentEvents,
}: {
  clientId: string;
  finalPackageReady: boolean;
  sentEvents: string[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSend(label: string, action: () => Promise<SendResult>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? `${label} sent.` : result.error);
    });
  }

  const sent = new Set(sentEvents);

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={isPending || sent.has("portal_welcome")}
        onClick={() => runSend("Welcome", () => sendWelcomeNotificationAction(clientId))}
        className="text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
      >
        {sent.has("portal_welcome") ? "Welcome Sent" : "Send Welcome"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => runSend("Deliverables notice", () => sendDeliverablesReadyNotificationAction(clientId))}
        className="block text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
      >
        Notify Deliverables
      </button>
      <button
        type="button"
        disabled={isPending || !finalPackageReady || sent.has("final_package_available")}
        onClick={() => runSend("Final package notice", () => sendFinalPackageNotificationAction(clientId))}
        className="block text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
      >
        {sent.has("final_package_available") ? "Final Notice Sent" : "Notify Final"}
      </button>
      {message && <p className="text-[9px] text-muted max-w-[180px]">{message}</p>}
    </div>
  );
}
