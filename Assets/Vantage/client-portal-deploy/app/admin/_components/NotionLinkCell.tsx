"use client";

import { useState, useTransition } from "react";
import { autoLinkNotionAction, setNotionPageIdAction } from "../actions";

export function NotionLinkCell({
  clientId,
  clientName,
  initialPageId,
}: {
  clientId: string;
  clientName: string;
  initialPageId: string | null;
}) {
  const [pageId, setPageId] = useState(initialPageId);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAutoLink() {
    setError(null);
    startTransition(async () => {
      const res = await autoLinkNotionAction(clientId, clientName);
      if (res.ok) {
        setPageId(res.pageId);
        setShowManual(false);
      } else {
        setError(res.error);
        setShowManual(true);
      }
    });
  }

  function handleManualSave() {
    if (!manualInput.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await setNotionPageIdAction(clientId, manualInput.trim());
      if (res.ok) {
        setPageId(res.pageId);
        setShowManual(false);
        setManualInput("");
      } else {
        setError(res.error);
      }
    });
  }

  if (pageId && !showManual) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-[#2D5C2D] uppercase tracking-widest">✓ Linked</span>
        <button
          onClick={() => { setShowManual(true); setManualInput(pageId); }}
          className="text-[10px] text-muted uppercase tracking-widest hover:text-navy"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[160px]">
      {!showManual ? (
        <button
          onClick={handleAutoLink}
          disabled={isPending}
          className="text-[10px] font-medium uppercase tracking-widest text-navy border border-navy px-2 py-1 hover:bg-navy hover:text-cream-100 transition-colors disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Auto-Link"}
        </button>
      ) : (
        <div className="flex gap-1.5 items-center">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Notion page ID…"
            className="input-field text-[11px] py-1 px-2 flex-1 min-w-0"
            onKeyDown={(e) => e.key === "Enter" && handleManualSave()}
          />
          <button
            onClick={handleManualSave}
            disabled={isPending || !manualInput.trim()}
            className="text-[10px] font-medium uppercase tracking-widest text-navy border border-navy px-2 py-1 hover:bg-navy hover:text-cream-100 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {isPending ? "…" : "Save"}
          </button>
        </div>
      )}

      {!showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="block text-[9px] text-muted uppercase tracking-widest hover:text-navy"
        >
          Paste ID manually
        </button>
      )}

      {error && <p className="text-[9px] text-red-700">{error}</p>}
    </div>
  );
}
