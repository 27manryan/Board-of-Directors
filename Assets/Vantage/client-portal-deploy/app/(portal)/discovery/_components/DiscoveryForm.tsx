"use client";

import { useState } from "react";

interface DiscoveryFormProps {
  questions: { heading: string; questionText: string }[];
  alreadySubmitted: boolean;
  submittedAt: string | null;
  previousAnswers: Record<string, string> | null;
}

export default function DiscoveryForm({
  questions,
  alreadySubmitted,
  submittedAt,
  previousAnswers,
}: DiscoveryFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (previousAnswers) return { ...previousAnswers };
    const init: Record<string, string> = {};
    for (const q of questions) init[q.heading] = "";
    return init;
  });
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = submitted || submitting;

  function updateAnswer(heading: string, text: string) {
    setAnswers((prev) => ({ ...prev, [heading]: text }));
  }

  const filledCount = Object.values(answers).filter((v) => v.trim()).length;

  async function handleSubmit() {
    setError(null);

    if (filledCount === 0) {
      setError("Please answer at least one question before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = Object.entries(answers)
        .filter(([, text]) => text.trim())
        .map(([heading, answer]) => ({ heading, answer: answer.trim() }));

      const res = await fetch("/api/discovery/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.heading} className="card">
            <div className="px-4 sm:px-6 py-4 border-b border-[#ECE8E0]">
              <p className="label mb-1">{q.heading}</p>
              <p className="text-sm text-navy leading-relaxed">{q.questionText}</p>
            </div>
            <div className="px-4 sm:px-6 py-4">
              {isLocked ? (
                <div className="text-sm text-navy whitespace-pre-wrap leading-relaxed">
                  {answers[q.heading]?.trim() || (
                    <span className="text-muted italic">No response</span>
                  )}
                </div>
              ) : (
                <textarea
                  value={answers[q.heading] ?? ""}
                  onChange={(e) => updateAnswer(q.heading, e.target.value)}
                  placeholder="Type your response here…"
                  rows={4}
                  className="input-field resize-y min-h-[100px] text-sm leading-relaxed"
                  autoFocus={i === 0}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="card">
          <div className="px-4 sm:px-6 py-6">
            {submitted ? (
              <div className="border-l-2 border-gold pl-4">
                <p className="text-sm font-medium text-navy">
                  Discovery submitted &#10003;
                </p>
                <p className="text-xs text-muted mt-1">
                  {submittedAt
                    ? `Submitted ${new Date(submittedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : "Ryan has been notified and will follow up to schedule your discovery call."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted mb-4">
                  {filledCount} of {questions.length} questions answered
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Submit Discovery Responses"}
                </button>
                <p className="text-xs text-muted mt-3 max-w-sm leading-relaxed">
                  Once submitted, your responses will be locked and Ryan will be
                  notified to schedule your discovery call.
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
