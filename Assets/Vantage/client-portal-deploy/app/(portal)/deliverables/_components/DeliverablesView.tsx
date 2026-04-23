"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DeliverableCard } from "./DeliverableCard";
import type { NotionDeliverableStatus } from "@/lib/notion";

const SESSION_KEY = "vantage_draft_comments";

interface DeliverableData {
  code: string;
  title: string;
  notionStatus: NotionDeliverableStatus;
  contentBlocks: string[];
  existingComments: { text: string; submittedAt: string }[];
}

export default function DeliverablesView({
  deliverables,
  gate,
  gateName,
  paymentRequired,
  alreadySubmitted,
  autoSubmit,
}: {
  deliverables: DeliverableData[];
  gate: 1 | 2 | 3;
  gateName: string;
  paymentRequired: boolean;
  alreadySubmitted: boolean;
  autoSubmit: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitFired = useRef(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setDrafts(JSON.parse(saved));
    } catch {}
  }, []);

  function updateDraft(code: string, text: string) {
    setDrafts((prev) => {
      const next = { ...prev, [code]: text };
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const doSubmit = useCallback(async (retries = 3): Promise<void> => {
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
    } catch {}

    const comments = Object.entries(stored)
      .filter(([, text]) => text.trim())
      .map(([code, text]) => ({ deliverable_code: code, comment_text: text.trim() }));

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments }),
    });

    if (res.status === 402 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return doSubmit(retries - 1);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Submission failed");
    }

    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  useEffect(() => {
    if (autoSubmit && !autoSubmitFired.current && !submitted) {
      autoSubmitFired.current = true;
      setSubmitting(true);
      setError(null);
      doSubmit()
        .then(() => {
          setSubmitted(true);
          window.history.replaceState({}, "", "/deliverables");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Submission failed"))
        .finally(() => setSubmitting(false));
    }
  }, [autoSubmit, submitted, doSubmit]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      if (paymentRequired) {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_number: 2,
            success_path: "/deliverables?auto_submit=true",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Payment setup failed");
        window.location.href = data.url;
        return;
      }

      await doSubmit();
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {deliverables.map((d) => (
          <DeliverableCard
            key={d.code}
            code={d.code}
            title={d.title}
            notionStatus={d.notionStatus}
            contentBlocks={d.contentBlocks}
            existingComments={d.existingComments}
            draftComment={drafts[d.code] ?? ""}
            onDraftChange={(text) => updateDraft(d.code, text)}
            disabled={submitted || submitting}
          />
        ))}
      </div>

      <div className="mt-10">
        <div className="card">
          <div className="px-4 sm:px-8 py-6 border-b border-[#ECE8E0]">
            <p className="label mb-2">Gate {gate} — {gateName}</p>
            <h2 className="font-serif text-2xl font-semibold text-navy">Submit for Review</h2>
            <p className="text-sm text-muted mt-2 max-w-lg">
              {gate === 1 && "When you're satisfied with your comments on the positioning and value proposition, submit this gate for Ryan's review."}
              {gate === 2 && "When you've reviewed the full draft for voice and broad direction, submit this gate for Ryan's review."}
              {gate === 3 && "When you've flagged your final wordsmithing and detail notes, submit for final delivery."}
            </p>
          </div>

          <div className="px-4 sm:px-8 py-8">
            {submitted ? (
              <div className="border-l-2 border-gold pl-4">
                <p className="text-sm font-medium text-navy">Gate {gate} submitted &#10003;</p>
                <p className="text-xs text-muted mt-1">
                  Ryan has been notified and will follow up within 1&ndash;2 business days.
                </p>
              </div>
            ) : submitting && autoSubmit ? (
              <div className="border-l-2 border-gold pl-4">
                <p className="text-sm font-medium text-navy">Completing submission&hellip;</p>
                <p className="text-xs text-muted mt-1">Payment received. Submitting your comments now.</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Submitting…"
                    : paymentRequired
                    ? `Pay & Submit Gate ${gate}`
                    : `Submit Gate ${gate} for Review`}
                </button>
                <p className="text-xs text-muted mt-3 max-w-sm leading-relaxed">
                  {paymentRequired
                    ? "Your 25% payment will be processed via Stripe before your comments are submitted."
                    : "This notifies Ryan that you're ready for the next stage. All comments you've entered above are included in the notification."}
                </p>
                {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
