"use client";

import { useState, useTransition } from "react";
import { createClientAction, type CreateClientResult } from "../actions";
import { PACKAGES, ADDONS, SERVICE_ADDON_KEYS, projectTotal, paymentSchedule, type PackageKey } from "@/lib/engagement";

const NO_ADDONS: PackageKey[] = ["command", "pro_bono"];

export function CreateClientForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateClientResult | null>(null);
  const [pkg, setPkg] = useState<PackageKey>("foundation");
  const [addonComp, setAddonComp] = useState(false);
  const [addonInt, setAddonInt] = useState(false);
  const [addonRush, setAddonRush] = useState(false);
  const [addonPitch, setAddonPitch] = useState(false);
  const [veteranDiscount, setVeteranDiscount] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState("");

  const isNoAddons = NO_ADDONS.includes(pkg);
  const customPrice = customPriceInput ? parseFloat(customPriceInput) || null : null;
  const isProBono = pkg === "pro_bono";

  const total = projectTotal({
    package: pkg,
    addon_competitive_audit: isNoAddons ? false : addonComp,
    addon_internal_messaging: isNoAddons ? false : addonInt,
    addon_rush_delivery: isProBono ? false : addonRush,
    addon_pitch_deck: isProBono ? false : addonPitch,
    veteran_discount: isProBono || customPrice != null ? false : veteranDiscount,
    custom_price: customPrice,
  });
  const [p1, p2, p3] = paymentSchedule(total);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setResult(null);
    startTransition(async () => {
      const res = await createClientAction(formData);
      setResult(res);
      if (res.ok) {
        form.reset();
        setPkg("foundation");
        setAddonComp(false);
        setAddonInt(false);
        setAddonRush(false);
        setAddonPitch(false);
        setVeteranDiscount(false);
        setCustomPriceInput("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="label block mb-2" htmlFor="name">Client Name</label>
          <input id="name" name="name" type="text" required placeholder="Acme Corp" className="input-field" />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="email">Client Email</label>
          <input id="email" name="email" type="email" required placeholder="contact@client.com" className="input-field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label block mb-2" htmlFor="project">Project Name</label>
          <input id="project" name="project" type="text" required placeholder="Brand Identity & Messaging" className="input-field" />
        </div>

        <div className="sm:col-span-2">
          <label className="label block mb-2" htmlFor="package">Package</label>
          <select
            id="package"
            name="package"
            value={pkg}
            onChange={(e) => setPkg(e.target.value as PackageKey)}
            className="input-field appearance-none"
          >
            {(Object.keys(PACKAGES) as PackageKey[]).map((key) => (
              <option key={key} value={key}>
                {PACKAGES[key].label}{PACKAGES[key].price > 0 ? ` — $${PACKAGES[key].price.toLocaleString()}` : " — $0"}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <p className="label mb-2">
            Add-ons{" "}
            {isNoAddons && <span className="text-muted normal-case tracking-normal text-[11px]">(included in {PACKAGES[pkg].label})</span>}
          </p>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 text-sm ${isNoAddons ? "opacity-40" : "text-navy cursor-pointer"}`}>
              <input
                type="checkbox"
                name="addon_competitive_audit"
                checked={isNoAddons ? false : addonComp}
                onChange={(e) => setAddonComp(e.target.checked)}
                disabled={isNoAddons}
              />
              {ADDONS.competitive_audit.label} — +${ADDONS.competitive_audit.price}
            </label>
            <label className={`flex items-center gap-3 text-sm ${isNoAddons ? "opacity-40" : "text-navy cursor-pointer"}`}>
              <input
                type="checkbox"
                name="addon_internal_messaging"
                checked={isNoAddons ? false : addonInt}
                onChange={(e) => setAddonInt(e.target.checked)}
                disabled={isNoAddons}
              />
              {ADDONS.internal_messaging.label} — +${ADDONS.internal_messaging.price}
            </label>
            <label className={`flex items-center gap-3 text-sm ${isProBono ? "opacity-40" : "text-navy cursor-pointer"}`}>
              <input
                type="checkbox"
                name="addon_rush_delivery"
                checked={isProBono ? false : addonRush}
                onChange={(e) => setAddonRush(e.target.checked)}
                disabled={isProBono}
              />
              {ADDONS.rush_delivery.label} — +${ADDONS.rush_delivery.price.toLocaleString()}
            </label>
            <label className={`flex items-center gap-3 text-sm ${isProBono ? "opacity-40" : "text-navy cursor-pointer"}`}>
              <input
                type="checkbox"
                name="addon_pitch_deck"
                checked={isProBono ? false : addonPitch}
                onChange={(e) => setAddonPitch(e.target.checked)}
                disabled={isProBono}
              />
              {ADDONS.pitch_deck.label} — +${ADDONS.pitch_deck.price.toLocaleString()}
            </label>
          </div>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <label className={`flex items-center gap-3 text-sm ${isProBono || customPrice != null ? "opacity-40" : "text-navy cursor-pointer"}`}>
            <input
              type="checkbox"
              name="veteran_discount"
              checked={isProBono || customPrice != null ? false : veteranDiscount}
              onChange={(e) => setVeteranDiscount(e.target.checked)}
              disabled={isProBono || customPrice != null}
            />
            Veteran Discount (15% off)
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="label block mb-2" htmlFor="custom_price">
            Custom Price Override <span className="text-muted normal-case tracking-normal text-[11px]">(optional — overrides computed pricing)</span>
          </label>
          <input
            id="custom_price"
            name="custom_price"
            type="text"
            value={customPriceInput}
            onChange={(e) => setCustomPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Leave blank to use computed price"
            className="input-field"
          />
        </div>

        {/* Price summary */}
        {!isProBono && (
          <div className="sm:col-span-2 bg-cream-200 border border-[#ECE8E0] p-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="label">Project Total</p>
              <p className="font-serif text-2xl font-semibold text-navy">${total.toLocaleString()}</p>
            </div>
            {total > 0 && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="label text-[9px] mb-1">Payment 1 (50%)</p>
                  <p className="text-navy font-medium">${p1.toLocaleString()}</p>
                  <p className="text-muted text-[10px]">at commitment</p>
                </div>
                <div>
                  <p className="label text-[9px] mb-1">Payment 2 (25%)</p>
                  <p className="text-navy font-medium">${p2.toLocaleString()}</p>
                  <p className="text-muted text-[10px]">before Gate 2 comments</p>
                </div>
                <div>
                  <p className="label text-[9px] mb-1">Payment 3 (25%)</p>
                  <p className="text-navy font-medium">${p3.toLocaleString()}</p>
                  <p className="text-muted text-[10px]">unlocks final delivery</p>
                </div>
              </div>
            )}
          </div>
        )}
        {isProBono && (
          <div className="sm:col-span-2 bg-cream-200 border border-[#ECE8E0] p-4 text-sm text-muted">
            Pro Bono — no balance shown to client.
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
          {isPending ? "Creating…" : "Create Client"}
        </button>
        {result?.ok && (
          <div className="text-xs text-[#2D5C2D] font-medium">
            <p className="mb-1">✓ Client created. Deliver these credentials manually:</p>
            <code className="block bg-cream-200 px-3 py-2 font-mono text-navy">
              {result.email} / {result.tempPassword}
            </code>
          </div>
        )}
        {result && !result.ok && (
          <p className="text-xs text-red-700 font-medium">{result.error}</p>
        )}
      </div>
    </form>
  );
}
