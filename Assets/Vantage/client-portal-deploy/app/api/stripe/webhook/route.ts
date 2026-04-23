import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clientId = session.metadata?.client_id;
    const paymentNumber = session.metadata?.payment_number;

    if (!clientId || !paymentNumber) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const pNum = Number(paymentNumber);
    if (pNum !== 2 && pNum !== 3) {
      return NextResponse.json({ error: "Invalid payment_number in metadata" }, { status: 400 });
    }

    const statusField = `payment_${pNum}_status` as "payment_2_status" | "payment_3_status";
    const revisionCharged = Number(session.metadata?.revision_balance_charged) || 0;

    const admin = createAdminClient();
    const updateData: Record<string, unknown> = { [statusField]: "paid" };
    if (revisionCharged > 0) {
      updateData.revision_round_balance = 0;
    }
    const { error } = await admin
      .from("clients")
      .update(updateData)
      .eq("id", clientId);

    if (error) {
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
