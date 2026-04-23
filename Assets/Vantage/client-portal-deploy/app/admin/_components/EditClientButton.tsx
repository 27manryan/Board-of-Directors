"use client";

import { useState } from "react";
import { EditClientPanel } from "./EditClientPanel";
import type { PackageKey } from "@/lib/engagement";

interface ClientSnapshot {
  id: string;
  name: string;
  email: string;
  project_name: string;
  package: PackageKey;
  addon_competitive_audit: boolean;
  addon_internal_messaging: boolean;
  addon_rush_delivery: boolean;
  addon_pitch_deck: boolean;
  veteran_discount: boolean;
  custom_price: number | null;
  project_total: number;
}

export function EditClientButton({ client }: { client: ClientSnapshot }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-medium uppercase tracking-widest text-muted hover:text-navy transition-colors"
      >
        Edit
      </button>
      {open && <EditClientPanel client={client} onClose={() => setOpen(false)} />}
    </>
  );
}
