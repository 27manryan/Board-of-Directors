"use client";

import { useState, useTransition, useEffect } from "react";
import { updateClientAction, type UpdateClientData } from "../actions";
import { PACKAGES, ADDONS, projectTotal, paymentSchedule, type PackageKey, type AddonKey } from "@/lib/engagement";

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

const NO_ADDONS: PackageKey[] = ["command", "pro_bono"];

export function EditClientPanel({
  client,
  onClose,
}: {
  client: ClientSnapshot;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<UpdateClientData, never>>({
    name: client.name,
    email: client.email,
    project_name: client.project_name,
    package: client.package,
    addon_competitive_audit: client.addon_competitive_audit,
    addon_internal_messaging: client.addon_internal_messaging,
    addon_rush_delivery: client.addon_rush_delivery,
    addon_pitch_deck: client.addon_pitch_deck,
    veteran_discount: client.veteran_discount,
    custom_price: client.custom_price,
  });
  const [customPriceInput, setCustomPriceInput] = useState(
    client.custom_price != null ? String(client.custom_price) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isNoAddons = NO_ADDONS.includes(form.package);
  const isProBono = form.package === "pro_bono";
  const effectiveForm = {
    ...form,
    addon_competitive_audit: isNoAddons ? false : form.addon_competitive_audit,
    addon_internal_messaging: isNoAddons ? false : form.addon_internal_messaging,
    addon_rush_delivery: isProBono ? false : form.addon_rush_delivery,
    addon_pitch_deck: isProBono ? false : form.addon_pitch_deck,
  };

  const customPrice = customPriceInput ? parseFloat(customPriceInput) || null : null;
  const previewTotal = projectTotal({ ...effectiveForm, custom_price: customPrice });
  const [p1, p2, p3] = paymentSchedule(previewTotal);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateClientAction(client.id, {
        ...effectiveForm,
        custom_price: customPrice,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(onClose, 800);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-cream-100 border-l border-[#ECE8E0] z-50 overflow-y-auto flex flex-col">
        <div className="px-8 py-6 border-b border-[#ECE8E0] bg-navy flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gold mb-0.5">Editing</p>
            <h2 className="font-serif text-lg font-semibold text-cream-100">{client.name}</h2>
          </div>
          <button onClick={onClose} className="text-cream-300/50 hover:text-cream-100 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 px-8 py-6 space-y-5">
          {/* Identity */}
          <div>
            <label className="label block mb-2" htmlFor="edit-name">Client Name</label>
            <input id="edit-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label block mb-2" htmlFor="edit-email">Client Email</label>
            <input id="edit-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label block mb-2" htmlFor="edit-project">Project Name</label>
            <input id="edit-project" value={form.project_name} onChange={(e) => set("project_name", e.target.value)} className="input-field" />
          </div>

          {/* Package */}
          <div>
            <label className="label block mb-2" htmlFor="edit-package">Package</label>
            <select
              id="edit-package"
              value={form.package}
              onChange={(e) => set("package", e.target.value as PackageKey)}
              className="input-field appearance-none"
            >
              {(Object.keys(PACKAGES) as PackageKey[]).map((key) => (
                <option key={key} value={key}>
                  {PACKAGES[key].label}{PACKAGES[key].price > 0 ? ` — $${PACKAGES[key].price.toLocaleString()}` : " — $0"}
                </option>
              ))}
            </select>
          </div>

          {/* Add-ons */}
          <div>
            <p className="label mb-2">
              Add-ons{" "}
              {isNoAddons && <span className="text-muted normal-case tracking-normal text-[11px]">(included in {PACKAGES[form.package].label})</span>}
            </p>
            <div className="space-y-2">
              {(["competitive_audit", "internal_messaging"] as const).map((key) => (
                <label key={key} className={`flex items-center gap-3 text-sm ${isNoAddons ? "opacity-40" : "text-navy cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={isNoAddons ? false : form[`addon_${key}` as "addon_competitive_audit" | "addon_internal_messaging"]}
                    onChange={(e) => set(`addon_${key}` as "addon_competitive_audit" | "addon_internal_messaging", e.target.checked)}
                    disabled={isNoAddons}
                  />
                  {ADDONS[key].label} — +${ADDONS[key].price}
                </label>
              ))}
              {(["rush_delivery", "pitch_deck"] as const).map((key) => (
                <label key={key} className={`flex items-center gap-3 text-sm ${isProBono ? "opacity-40" : "text-navy cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={isProBono ? false : form[`addon_${key}` as "addon_rush_delivery" | "addon_pitch_deck"]}
                    onChange={(e) => set(`addon_${key}` as "addon_rush_delivery" | "addon_pitch_deck", e.target.checked)}
                    disabled={isProBono}
                  />
                  {ADDONS[key].label} — +${ADDONS[key].price.toLocaleString()}
                </label>
              ))}
            </div>
          </div>

          {/* Veteran discount */}
          <div>
            <label className="flex items-center gap-3 text-sm text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={form.veteran_discount}
                onChange={(e) => set("veteran_discount", e.target.checked)}
                disabled={form.package === "pro_bono" || customPrice != null}
              />
              <span className={form.package === "pro_bono" || customPrice != null ? "opacity-40" : ""}>
                Veteran Discount (15% off)
              </span>
            </label>
          </div>

          {/* Custom price */}
          <div>
            <label className="label block mb-2" htmlFor="edit-custom-price">
              Custom Price Override <span className="text-muted normal-case tracking-normal text-[11px]">(optional — overrides all computed pricing)</span>
            </label>
            <input
              id="edit-custom-price"
              type="text"
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Leave blank to use computed price"
              className="input-field"
            />
          </div>

          {/* Price summary */}
          {form.package !== "pro_bono" && (
            <div className="bg-cream-200 border border-[#ECE8E0] p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="label">Project Total</p>
                <p className="font-serif text-xl font-semibold text-navy">${previewTotal.toLocaleString()}</p>
              </div>
              {previewTotal > 0 && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {([p1, p2, p3] as const).map((amt, i) => (
                    <div key={i}>
                      <p className="label text-[9px] mb-0.5">Payment {i + 1}</p>
                      <p className="text-navy font-medium">${amt.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {form.package === "pro_bono" && (
            <div className="bg-cream-200 border border-[#ECE8E0] p-4 text-sm text-muted">
              Pro Bono — no balance shown to client.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#ECE8E0] flex-shrink-0 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className="btn-primary disabled:opacity-50"
          >
            {saved ? "Saved ✓" : isPending ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={onClose} className="text-xs text-muted uppercase tracking-widest hover:text-navy">
            Cancel
          </button>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </>
  );
}
