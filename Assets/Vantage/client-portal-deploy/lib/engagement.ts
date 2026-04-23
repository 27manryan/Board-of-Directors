// Vantage engagement model — single source of truth for packages, deliverables,
// add-ons, pricing, and which deliverables a given client should see toggles for.
// To update fixed prices, edit the price values below — changes propagate everywhere.

export const PACKAGES = {
  foundation: { label: "Foundation", price: 1500, baseDeliverables: ["D01", "D02", "D03", "D04"] },
  clarity:    { label: "Clarity",    price: 3000, baseDeliverables: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08"] },
  command:    { label: "Command",    price: 6000, baseDeliverables: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10"] },
  pro_bono:   { label: "Pro Bono",   price: 0 as number, baseDeliverables: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10"] },
} as const;

export type PackageKey = keyof typeof PACKAGES;

export const ADDONS = {
  competitive_audit:  { label: "Competitive Audit (D09)",  price: 750, deliverable: "D09" },
  internal_messaging: { label: "Internal Messaging (D10)", price: 750, deliverable: "D10" },
  rush_delivery:      { label: "Rush Delivery (under 2 weeks)", price: 500 },
  pitch_deck:         { label: "Pitch Deck Narrative",          price: 1200 },
} as const;

export type AddonKey = keyof typeof ADDONS;

// Deliverable add-ons are disabled on Command/Pro Bono (already included).
// Service add-ons (rush, pitch deck) are available on all paid packages.
export const DELIVERABLE_ADDON_KEYS: AddonKey[] = ["competitive_audit", "internal_messaging"];
export const SERVICE_ADDON_KEYS: AddonKey[] = ["rush_delivery", "pitch_deck"];

// D01-D10 are reviewable. D11/D12 are compiled / post-delivery audit (no client toggle).
export const DELIVERABLES: Record<string, string> = {
  D01: "Positioning Statement",
  D02: "Core Value Proposition",
  D03: "Key Messages",
  D04: "Elevator Pitch",
  D05: "Audience Persona",
  D06: "Tone of Voice Guide",
  D07: "Brand Story Narrative",
  D08: "Sample Copy",
  D09: "Competitive Positioning",
  D10: "Internal Messaging Guide",
  D11: "Implementation Strategy",
  D12: "Quarterly Messaging Audit",
};

export const TOGGLEABLE_CODES = ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10"] as const;

export interface ClientEngagement {
  package: PackageKey;
  addon_competitive_audit: boolean;
  addon_internal_messaging: boolean;
  addon_rush_delivery: boolean;
  addon_pitch_deck: boolean;
  veteran_discount?: boolean;
  custom_price?: number | null;
}

const NO_ADDONS_PACKAGES: PackageKey[] = ["command", "pro_bono"];

// Deliverables this client gets a visibility toggle for, in order.
export function deliverablesForClient(c: ClientEngagement): string[] {
  const set = new Set<string>(PACKAGES[c.package].baseDeliverables);
  if (!NO_ADDONS_PACKAGES.includes(c.package)) {
    if (c.addon_competitive_audit) set.add("D09");
    if (c.addon_internal_messaging) set.add("D10");
  }
  return TOGGLEABLE_CODES.filter((code) => set.has(code));
}

// Total project price. Priority: custom_price > pro_bono ($0) > veteran discount > base + addons.
export function projectTotal(c: ClientEngagement): number {
  if (c.custom_price != null && c.custom_price > 0) return c.custom_price;
  if (c.package === "pro_bono") return 0;

  let total: number = PACKAGES[c.package].price;
  if (!NO_ADDONS_PACKAGES.includes(c.package)) {
    if (c.addon_competitive_audit) total += ADDONS.competitive_audit.price;
    if (c.addon_internal_messaging) total += ADDONS.internal_messaging.price;
  }
  if (c.addon_rush_delivery) total += ADDONS.rush_delivery.price;
  if (c.addon_pitch_deck) total += ADDONS.pitch_deck.price;
  if (c.veteran_discount) total = Math.round(total * 0.85);
  return total;
}

// 50/25/25 split. Returns [0,0,0] for pro bono.
export function paymentSchedule(total: number): [number, number, number] {
  if (total === 0) return [0, 0, 0];
  const p1 = Math.round(total * 0.5);
  const p2 = Math.round(total * 0.25);
  const p3 = total - p1 - p2;
  return [p1, p2, p3];
}

export const REVISION_ROUND_PRICE = 350;

export const GATES = {
  1: { label: "Gate 1", name: "Positioning Review" },
  2: { label: "Gate 2", name: "Voice Review" },
  3: { label: "Gate 3", name: "Final Review" },
} as const;
