import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { paymentSchedule, PACKAGES, ADDONS, type PackageKey } from "@/lib/engagement";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paymentNumber: 2 | 3 = body.payment_number;
  const successPath: string | undefined = body.success_path;
  if (paymentNumber !== 2 && paymentNumber !== 3) {
    return NextResponse.json({ error: "Invalid payment_number" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: client, error } = await admin
    .from("clients")
    .select("id, name, email, project_name, package, addon_competitive_audit, addon_internal_messaging, addon_rush_delivery, addon_pitch_deck, veteran_discount, custom_price, project_total, revision_round_balance, payment_2_status, payment_3_status, stripe_customer_id")
    .eq("supabase_user_id", user.id)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (client.package === "pro_bono") {
    return NextResponse.json({ error: "No payment required" }, { status: 400 });
  }

  const statusField = `payment_${paymentNumber}_status` as "payment_2_status" | "payment_3_status";
  if (client[statusField] === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const [, p2, p3] = paymentSchedule(client.project_total);
  const baseAmountCents = paymentNumber === 2 ? Math.round(p2 * 100) : Math.round(p3 * 100);
  const revisionBalance = Number(client.revision_round_balance) || 0;
  const revisionCents = Math.round(revisionBalance * 100);

  if (baseAmountCents === 0 && revisionCents === 0) {
    return NextResponse.json({ error: "Amount is zero" }, { status: 400 });
  }

  // Create or retrieve Stripe customer
  let customerId = client.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: client.name,
      metadata: { client_id: client.id },
    });
    customerId = customer.id;
    await admin.from("clients").update({ stripe_customer_id: customerId }).eq("id", client.id);
  }

  const gateLabel = paymentNumber === 2 ? "Gate 2 — Voice Review" : "Final Delivery";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const pkg = PACKAGES[client.package as PackageKey];
  const pctLabel = paymentNumber === 2 ? "25%" : "25%";
  const descParts: string[] = [
    `Payment ${paymentNumber} of 3 · ${gateLabel}`,
    "",
    `${pkg.label} Package — $${pkg.price.toLocaleString()}`,
  ];
  if (client.addon_competitive_audit) {
    descParts.push(`${ADDONS.competitive_audit.label} — +$${ADDONS.competitive_audit.price.toLocaleString()}`);
  }
  if (client.addon_internal_messaging) {
    descParts.push(`${ADDONS.internal_messaging.label} — +$${ADDONS.internal_messaging.price.toLocaleString()}`);
  }
  if (client.addon_rush_delivery) {
    descParts.push(`${ADDONS.rush_delivery.label} — +$${ADDONS.rush_delivery.price.toLocaleString()}`);
  }
  if (client.addon_pitch_deck) {
    descParts.push(`${ADDONS.pitch_deck.label} — +$${ADDONS.pitch_deck.price.toLocaleString()}`);
  }
  if (client.veteran_discount && !client.custom_price) {
    descParts.push("Veteran Discount — 15% off");
  }
  if (client.custom_price) {
    descParts.push(`Custom pricing applied`);
  }
  descParts.push(`Project Total: $${Number(client.project_total).toLocaleString()} · This payment: ${pctLabel}`);

  const revisionRounds = revisionBalance > 0
    ? Math.round(revisionBalance / 350)
    : 0;

  const lineItems: {
    price_data: { currency: string; unit_amount: number; product_data: { name: string; description?: string } };
    quantity: number;
  }[] = [];

  if (baseAmountCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: baseAmountCents,
        product_data: {
          name: `Vantage — ${client.project_name}`,
          description: descParts.join("\n"),
        },
      },
      quantity: 1,
    });
  }

  if (revisionCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(350 * 100),
        product_data: {
          name: `Additional Revision Round — ${client.project_name}`,
        },
      },
      quantity: revisionRounds,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: successPath
      ? `${appUrl}${successPath}`
      : `${appUrl}/payment?success=p${paymentNumber}`,
    cancel_url: `${appUrl}/payment`,
    metadata: {
      client_id: client.id,
      payment_number: String(paymentNumber),
      revision_balance_charged: String(revisionBalance),
    },
  });

  return NextResponse.json({ url: session.url });
}
