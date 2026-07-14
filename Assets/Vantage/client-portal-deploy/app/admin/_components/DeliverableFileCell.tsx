"use client";

import { useRef, useState } from "react";

export function DeliverableFileCell({
  clientId,
  initialFileName,
}: {
  clientId: string;
  initialFileName: string | null;
}) {
  const [fileName, setFileName] = useState(initialFileName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("client_id", clientId);
      fd.append("file", file);
      const res = await fetch("/api/admin/deliverable-file", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setFileName(data.file_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the final package for this client?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deliverable-file?client_id=${clientId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Remove failed");
      setFileName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-[160px]">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />
      {fileName ? (
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-medium text-[#2D5C2D] uppercase tracking-widest truncate max-w-[90px]"
            title={fileName}
          >
            ✓ {fileName}
          </span>
          <a
            href={`/api/deliverables/download?client_id=${clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-muted uppercase tracking-widest hover:text-navy"
          >
            View
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-[9px] text-muted uppercase tracking-widest hover:text-navy disabled:opacity-50"
          >
            {busy ? "…" : "Replace"}
          </button>
          <button
            onClick={handleRemove}
            disabled={busy}
            className="text-[9px] text-red-400 uppercase tracking-widest hover:text-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-[10px] font-medium uppercase tracking-widest text-navy border border-navy px-2 py-1 hover:bg-navy hover:text-cream-100 transition-colors disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload PDF"}
        </button>
      )}
      {error && <p className="text-[9px] text-red-700 mt-1">{error}</p>}
    </div>
  );
}
