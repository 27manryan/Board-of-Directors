const PROFILE_PACKAGE_DELIVERABLES: Record<string, string[]> = {
  foundation: ["D01", "D02", "D03", "D04"],
  clarity: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08"],
  command: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10"],
  pro_bono: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10"],
};

const PROFILE_DELIVERABLES: Record<string, string> = {
  D01: "Positioning Statement",
  D02: "Core Value Proposition",
  D03: "Key Messages",
  D04: "Elevator Pitch",
  D05: "Audience Personas",
  D06: "Audience-Specific Messaging",
  D07: "Tone Guide",
  D08: "Sample Copy",
  D09: "Competitive Positioning",
  D10: "Internal Messaging Guide",
};

function profileDeliverablesForClient(client: ClientProfileClientInput) {
  const codes = new Set(PROFILE_PACKAGE_DELIVERABLES[client.package] ?? []);
  if (!["command", "pro_bono"].includes(client.package)) {
    if (client.addon_competitive_audit) codes.add("D09");
    if (client.addon_internal_messaging) codes.add("D10");
  }
  return Array.from(codes).map((code) => PROFILE_DELIVERABLES[code] ?? code);
}

export type ClientProfileStatus = "draft" | "approved" | "superseded";
export type ClientProfileVisibility = "internal";

export type ClientProfileClientInput = {
  id: string;
  name: string;
  email: string;
  project_name: string;
  package: string;
  addon_competitive_audit: boolean;
  addon_internal_messaging: boolean;
  addon_rush_delivery: boolean;
  addon_pitch_deck: boolean;
  veteran_discount: boolean;
  custom_price: number | null;
  project_total: number;
  current_gate: number;
  payment_1_status: string;
  payment_2_status: string;
  payment_3_status: string;
  revision_round_balance: number;
  created_at?: string | null;
};

export type DiscoveryAnswer = {
  prompt: string;
  answer: string;
};

export type ClientProfile = {
  client: {
    name: string;
    email: string;
  };
  engagement: {
    projectName: string;
    package: string;
    addOns: string[];
    projectTotal: number;
    deliverables: string[];
    currentGate: number;
    paymentStatus: string[];
    revisionRoundBalance: number;
  };
  businessContext: {
    discoveryAnswers: DiscoveryAnswer[];
  };
  objectives: string[];
  priorityAudiences: string[];
  offersAndDifferentiators: string[];
  voiceAndMessagingSignals: string[];
  constraintsAndSensitivities: string[];
  stakeholdersAndApprovals: string[];
  openQuestions: string[];
};

export type ClientProfileDraft = {
  status: ClientProfileStatus;
  visibility: ClientProfileVisibility;
  version: number;
  profile: ClientProfile;
  profileMarkdown: string;
  inputSnapshot: {
    clientId: string;
    discoveryAnswerKeys: string[];
    generatedAt: string;
  };
};

const ADDON_LABELS: Array<[keyof ClientProfileClientInput, string]> = [
  ["addon_competitive_audit", "Competitive Audit"],
  ["addon_internal_messaging", "Internal Messaging"],
  ["addon_rush_delivery", "Rush Delivery"],
  ["addon_pitch_deck", "Pitch Deck"],
];

function cleanDiscoveryAnswers(answers: Record<string, string>): DiscoveryAnswer[] {
  return Object.entries(answers)
    .map(([prompt, answer]) => ({ prompt: prompt.trim(), answer: answer.trim() }))
    .filter((entry) => entry.prompt.length > 0 && entry.answer.length > 0);
}

function answersMatching(
  answers: DiscoveryAnswer[],
  patterns: RegExp[]
) {
  return answers
    .filter((entry) => patterns.some((pattern) => pattern.test(entry.prompt)))
    .map((entry) => entry.answer);
}

export function buildClientProfileDraft({
  client,
  discoveryAnswers,
  version,
}: {
  client: ClientProfileClientInput;
  discoveryAnswers: Record<string, string>;
  version: number;
}): ClientProfileDraft {
  const cleanedAnswers = cleanDiscoveryAnswers(discoveryAnswers);
  const addOns = ADDON_LABELS
    .filter(([key]) => Boolean(client[key]))
    .map(([, label]) => label);

  const deliverables = profileDeliverablesForClient(client);

  const profile: ClientProfile = {
    client: {
      name: client.name,
      email: client.email,
    },
    engagement: {
      projectName: client.project_name,
      package: client.package,
      addOns,
      projectTotal: Number(client.project_total),
      deliverables,
      currentGate: Number(client.current_gate),
      paymentStatus: [
        `Payment 1: ${client.payment_1_status}`,
        `Payment 2: ${client.payment_2_status}`,
        `Payment 3: ${client.payment_3_status}`,
      ],
      revisionRoundBalance: Number(client.revision_round_balance),
    },
    businessContext: {
      discoveryAnswers: cleanedAnswers,
    },
    objectives: answersMatching(cleanedAnswers, [/goal/i, /objective/i, /success/i]),
    priorityAudiences: answersMatching(cleanedAnswers, [/audience/i, /customer/i, /client/i]),
    offersAndDifferentiators: answersMatching(cleanedAnswers, [/offer/i, /different/i, /service/i]),
    voiceAndMessagingSignals: answersMatching(cleanedAnswers, [/voice/i, /tone/i, /message/i, /brand/i]),
    constraintsAndSensitivities: answersMatching(cleanedAnswers, [/constraint/i, /sensitive/i, /avoid/i, /concern/i]),
    stakeholdersAndApprovals: answersMatching(cleanedAnswers, [/stakeholder/i, /approv/i, /decision/i]),
    openQuestions: [],
  };

  const generatedAt = new Date().toISOString();
  return {
    status: "draft",
    visibility: "internal",
    version,
    profile,
    profileMarkdown: renderClientProfileMarkdown(profile),
    inputSnapshot: {
      clientId: client.id,
      discoveryAnswerKeys: cleanedAnswers.map((answer) => answer.prompt),
      generatedAt,
    },
  };
}

export function renderClientProfileMarkdown(profile: ClientProfile) {
  const lines = [
    `# ${profile.client.name} Profile`,
    "",
    "Internal working profile. Do not send this directly to the client.",
    "",
    "## Engagement",
    "",
    `- Project: ${profile.engagement.projectName}`,
    `- Package: ${profile.engagement.package}`,
    `- Add-ons: ${profile.engagement.addOns.join(", ") || "None"}`,
    `- Current gate: ${profile.engagement.currentGate}`,
    `- Project total: $${profile.engagement.projectTotal.toLocaleString()}`,
    "",
    "## Deliverables",
    "",
    ...profile.engagement.deliverables.map((deliverable) => `- ${deliverable}`),
    "",
    "## Discovery Signals",
    "",
    ...(
      profile.businessContext.discoveryAnswers.length > 0
        ? profile.businessContext.discoveryAnswers.map(
            (answer) => `- ${answer.prompt}: ${answer.answer}`
          )
        : ["- No discovery answers recorded yet."]
    ),
    "",
    "## Constraints and Sensitivities",
    "",
    ...(
      profile.constraintsAndSensitivities.length > 0
        ? profile.constraintsAndSensitivities.map((item) => `- ${item}`)
        : ["- None identified yet."]
    ),
  ];

  return lines.join("\n");
}

export function nextProfileVersion(existingVersions: Array<{ version: number }>) {
  if (existingVersions.length === 0) return 1;
  return Math.max(...existingVersions.map((row) => Number(row.version))) + 1;
}
