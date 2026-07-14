import { Resend } from "resend";

export const AUTOMATIC_CLIENT_NOTIFICATION_EVENTS = [
  "discovery_received",
  "gate_feedback_received",
] as const;

export const APPROVAL_GATED_CLIENT_NOTIFICATION_EVENTS = [
  "portal_welcome",
  "deliverables_ready",
  "final_package_available",
  "revision_balance_added",
] as const;

export type AutomaticClientNotificationEvent =
  (typeof AUTOMATIC_CLIENT_NOTIFICATION_EVENTS)[number];

export type ApprovalGatedClientNotificationEvent =
  (typeof APPROVAL_GATED_CLIENT_NOTIFICATION_EVENTS)[number];

export type ClientNotificationEvent =
  | AutomaticClientNotificationEvent
  | ApprovalGatedClientNotificationEvent;

export type ClientNotificationStatus =
  | "pending"
  | "approved"
  | "sent"
  | "failed";

export type NotificationTemplatePayload = {
  clientName: string;
  projectName: string;
  portalUrl: string;
  setupUrl?: string;
  gateLabel?: string;
  deliverablesList?: string;
  finalPackageUrl?: string;
  revisionBalance?: string;
};

export type RenderedNotification = {
  subject: string;
  text: string;
};

export type NotificationTemplate = {
  eventType: ClientNotificationEvent;
  templateVersion: string;
  requiresApproval: boolean;
  render: (payload: NotificationTemplatePayload) => RenderedNotification;
};

type SupabaseAdminClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export function shouldSendAutomatically(eventType: ClientNotificationEvent) {
  return AUTOMATIC_CLIENT_NOTIFICATION_EVENTS.includes(
    eventType as AutomaticClientNotificationEvent
  );
}

export function buildNotificationDedupeKey({
  eventType,
  clientId,
  entityId,
  version,
}: {
  eventType: ClientNotificationEvent;
  clientId: string;
  entityId?: string | number | null;
  version?: string | number | null;
}) {
  return [eventType, clientId, entityId ?? version ?? "current"].join(":");
}

export function isFinalPackageReady(client: {
  package: string;
  payment_3_status: string | null;
  deliverable_files?: { file_name?: string | null } | null;
}) {
  const hasFile = Boolean(client.deliverable_files?.file_name);
  const unlocked = client.package === "pro_bono" || client.payment_3_status === "paid";
  return hasFile && unlocked;
}

export function notificationTemplateFor(
  eventType: ClientNotificationEvent
): NotificationTemplate {
  const portalLink = (payload: NotificationTemplatePayload) =>
    `Open the portal here: ${payload.portalUrl}`;

  const templates: Record<ClientNotificationEvent, NotificationTemplate> = {
    portal_welcome: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: true,
      render: (payload) => ({
        subject: `Welcome to the Vantage portal: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `Your Vantage portal is ready for ${payload.projectName}. This is where you can review released work, submit feedback, and check payment steps.`,
          "",
          payload.setupUrl
            ? `Set your password here: ${payload.setupUrl}`
            : portalLink(payload),
          "",
          "Ryan",
        ].join("\n"),
      }),
    },
    deliverables_ready: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: true,
      render: (payload) => ({
        subject: `New deliverables are ready: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `New deliverables are ready in the portal for ${payload.projectName}.`,
          "",
          payload.deliverablesList ? `Available now:\n${payload.deliverablesList}` : "",
          "",
          portalLink(payload),
          "",
          "Ryan",
        ]
          .filter((line) => line !== "")
          .join("\n"),
      }),
    },
    final_package_available: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: true,
      render: (payload) => ({
        subject: `Final package available: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `Your final package for ${payload.projectName} is available in the portal.`,
          "",
          payload.finalPackageUrl ?? portalLink(payload),
          "",
          "Ryan",
        ].join("\n"),
      }),
    },
    revision_balance_added: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: true,
      render: (payload) => ({
        subject: `Revision round added: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `A revision round has been added for ${payload.projectName}.`,
          payload.revisionBalance ? `Current revision balance: ${payload.revisionBalance}` : "",
          "",
          portalLink(payload),
          "",
          "Ryan",
        ]
          .filter((line) => line !== "")
          .join("\n"),
      }),
    },
    discovery_received: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: false,
      render: (payload) => ({
        subject: `Discovery received: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `I received your discovery responses for ${payload.projectName}. I will review them and fold them into the next working pass.`,
          "",
          portalLink(payload),
          "",
          "Ryan",
        ].join("\n"),
      }),
    },
    gate_feedback_received: {
      eventType,
      templateVersion: "2026-06-27",
      requiresApproval: false,
      render: (payload) => ({
        subject: `${payload.gateLabel ?? "Gate"} feedback received: ${payload.projectName}`,
        text: [
          `Hi ${payload.clientName},`,
          "",
          `I received your ${payload.gateLabel ?? "gate"} feedback for ${payload.projectName}. I will review it and follow up from there.`,
          "",
          portalLink(payload),
          "",
          "Ryan",
        ].join("\n"),
      }),
    },
  };

  return templates[eventType];
}

export function portalUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.vantagestrat.co";
}

export async function recordClientNotification({
  admin,
  clientId,
  eventType,
  dedupeKey,
  recipientEmail,
  payload,
  status,
}: {
  admin: SupabaseAdminClient;
  clientId: string;
  eventType: ClientNotificationEvent;
  dedupeKey: string;
  recipientEmail: string;
  payload: NotificationTemplatePayload;
  status?: ClientNotificationStatus;
}) {
  const template = notificationTemplateFor(eventType);
  const existingQuery = admin
    .from("client_notifications")
    .select("id, status, provider_message_id, payload");
  const existing = await existingQuery
    .eq("client_id", clientId)
    .eq("event_type", eventType)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing?.data) {
    return existing.data;
  }

  const inserted = await admin
    .from("client_notifications")
    .insert({
      client_id: clientId,
      event_type: eventType,
      dedupe_key: dedupeKey,
      recipient_email: recipientEmail,
      status:
        status ??
        (shouldSendAutomatically(eventType) ? "approved" : "pending"),
      template_version: template.templateVersion,
      payload,
    })
    .select("id, status, provider_message_id, payload")
    .single();

  if (inserted?.error) {
    throw new Error(inserted.error.message);
  }
  return inserted?.data ?? null;
}

export async function sendClientNotification({
  admin,
  notificationId,
  eventType,
  recipientEmail,
  payload,
}: {
  admin: SupabaseAdminClient;
  notificationId: string;
  eventType: ClientNotificationEvent;
  recipientEmail: string;
  payload: NotificationTemplatePayload;
}) {
  const rendered = notificationTemplateFor(eventType).render(payload);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: "Vantage Portal <notifications@vantagestrat.co>",
      to: recipientEmail,
      subject: rendered.subject,
      text: rendered.text,
    });

    const messageId = response.data?.id ?? null;
    await admin
      .from("client_notifications")
      .update({
        status: "sent",
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", notificationId);

    return { ok: true as const, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed";
    await admin
      .from("client_notifications")
      .update({
        status: "failed",
        last_error: message,
      })
      .eq("id", notificationId);

    return { ok: false as const, error: message };
  }
}

export async function recordAndMaybeSendClientNotification({
  admin,
  clientId,
  eventType,
  entityId,
  recipientEmail,
  payload,
}: {
  admin: SupabaseAdminClient;
  clientId: string;
  eventType: ClientNotificationEvent;
  entityId?: string | number | null;
  recipientEmail: string;
  payload: NotificationTemplatePayload;
}) {
  const dedupeKey = buildNotificationDedupeKey({
    eventType,
    clientId,
    entityId,
  });
  const notification = await recordClientNotification({
    admin,
    clientId,
    eventType,
    dedupeKey,
    recipientEmail,
    payload,
  });

  if (!notification?.id || notification.status === "sent") {
    return notification;
  }

  if (!shouldSendAutomatically(eventType) && notification.status !== "approved") {
    return notification;
  }

  await sendClientNotification({
    admin,
    notificationId: String(notification.id),
    eventType,
    recipientEmail,
    payload,
  });

  return notification;
}

export async function approveAndSendClientNotification({
  admin,
  clientId,
  eventType,
  entityId,
  recipientEmail,
  payload,
}: {
  admin: SupabaseAdminClient;
  clientId: string;
  eventType: ApprovalGatedClientNotificationEvent;
  entityId?: string | number | null;
  recipientEmail: string;
  payload: NotificationTemplatePayload;
}) {
  const dedupeKey = buildNotificationDedupeKey({
    eventType,
    clientId,
    entityId,
  });

  const notification = await recordClientNotification({
    admin,
    clientId,
    eventType,
    dedupeKey,
    recipientEmail,
    payload,
    status: "approved",
  });

  if (!notification?.id) {
    return { ok: false as const, error: "Notification could not be recorded." };
  }

  if (notification.status === "sent") {
    return { ok: true as const, alreadySent: true };
  }

  await admin
    .from("client_notifications")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      payload,
      last_error: null,
    })
    .eq("id", notification.id);

  return sendClientNotification({
    admin,
    notificationId: String(notification.id),
    eventType,
    recipientEmail,
    payload,
  });
}
