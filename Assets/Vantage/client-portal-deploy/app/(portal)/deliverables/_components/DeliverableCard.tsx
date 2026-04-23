"use client";

import type { NotionDeliverableStatus } from "@/lib/notion";

const STATUS_CONFIG: Record<NotionDeliverableStatus, { label: string; icon: string; style: string }> = {
  locked:      { label: "Approved",    icon: "\u2705", style: "bg-[#E6F0E6] text-[#2D5C2D]" },
  in_progress: { label: "In Progress", icon: "\u231B", style: "bg-[#FFF8E6] text-[#7A5500]" },
  not_started: { label: "Pending",     icon: "",        style: "bg-[#F0EDE8] text-[#6B7FA3]" },
};

export function DeliverableCard({
  code,
  title,
  notionStatus,
  contentBlocks,
  existingComments,
  draftComment,
  onDraftChange,
  disabled,
}: {
  code: string;
  title: string;
  notionStatus: NotionDeliverableStatus;
  contentBlocks: string[];
  existingComments: { text: string; submittedAt: string }[];
  draftComment: string;
  onDraftChange: (text: string) => void;
  disabled: boolean;
}) {
  const config = STATUS_CONFIG[notionStatus];

  return (
    <article className="card">
      <div className="px-4 sm:px-8 py-6 border-b border-[#ECE8E0] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-4">
          <span className="font-serif text-2xl font-semibold text-gold/50 flex-shrink-0 mt-0.5">
            {code}
          </span>
          <h3 className="font-serif text-xl font-semibold text-navy mt-1">{title}</h3>
        </div>
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${config.style}`}>
            {config.icon && <span>{config.icon}</span>}
            {config.label}
          </span>
        </div>
      </div>

      {contentBlocks.length > 0 ? (
        <div className="px-4 sm:px-8 py-6 border-b border-[#ECE8E0] space-y-3">
          {contentBlocks.map((block, i) => (
            <p key={i} className="text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">{block}</p>
          ))}
        </div>
      ) : (
        <div className="px-4 sm:px-8 py-4 border-b border-[#ECE8E0]">
          <p className="text-sm text-muted italic">Content not yet available.</p>
        </div>
      )}

      {existingComments.length > 0 && (
        <div className="px-4 sm:px-8 py-5 border-b border-[#ECE8E0] space-y-3">
          <p className="label mb-3">Previous Comments</p>
          {existingComments.map((c, i) => (
            <div key={i} className="border-l-2 border-gold/40 pl-4">
              <p className="text-sm text-navy/80 leading-relaxed">{c.text}</p>
              <p className="text-[10px] text-muted mt-1">
                {new Date(c.submittedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-8 py-6">
        <p className="label mb-3">Leave a Comment or Revision Request</p>
        <textarea
          value={draftComment}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Enter your feedback, questions, or revision requests here…"
          rows={3}
          className="input-field resize-none"
          disabled={disabled}
        />
      </div>
    </article>
  );
}
