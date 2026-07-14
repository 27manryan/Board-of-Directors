"use client";

import { useState, useTransition } from "react";
import {
  approveClientProfileAction,
  publishClientProfileToNotionAction,
  regenerateClientProfileAction,
} from "../actions";

type ProfileSummary = {
  id: string;
  version: number;
  status: string;
  profile_markdown: string;
  approved_at: string | null;
  notion_synced_at: string | null;
  generated_at: string;
};

export function ClientProfilePanel({
  clientId,
  profile,
}: {
  clientId: string;
  profile: ProfileSummary | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(label: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? `${label} complete.` : result.error);
    });
  }

  const excerpt = profile?.profile_markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .slice(0, 3)
    .join(" ");

  return (
    <div className="space-y-2 min-w-[220px]">
      <div>
        <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Internal Profile</p>
        {profile ? (
          <>
            <p className="text-[10px] text-navy uppercase tracking-widest">
              v{profile.version} · {profile.status}
            </p>
            {excerpt && <p className="text-[10px] text-muted mt-1 line-clamp-2">{excerpt}</p>}
            {profile.notion_synced_at && (
              <p className="text-[9px] text-[#2D5C2D] uppercase tracking-widest mt-1">
                Published to Notion
              </p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted">No profile yet.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("Regeneration", () => regenerateClientProfileAction(clientId))}
          className="text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
        >
          Regenerate
        </button>
        {profile && profile.status !== "approved" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run("Approval", () => approveClientProfileAction(profile.id))}
            className="text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
          >
            Approve
          </button>
        )}
        {profile && profile.status === "approved" && !profile.notion_synced_at && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run("Publish", () => publishClientProfileToNotionAction(profile.id))}
            className="text-[9px] uppercase tracking-widest text-navy border border-navy px-2 py-1 disabled:opacity-40"
          >
            Publish to Notion
          </button>
        )}
      </div>
      {message && <p className="text-[9px] text-muted">{message}</p>}
    </div>
  );
}
