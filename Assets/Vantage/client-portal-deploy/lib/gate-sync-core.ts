export type Gate = 1 | 2 | 3;

export interface GateRow {
  gate: string;
  description: string;
  status: string;
  isComplete: boolean;
}

export interface GateClient {
  id: string;
  current_gate: number | null;
  notion_drafting_page_id: string | null;
}

export interface GateSyncDependencies {
  fetchRows: (pageId: string) => Promise<GateRow[]>;
  persistGate: (clientId: string, gate: Gate) => Promise<void>;
}

function normalizeGate(value: number | null): Gate {
  if (value === 3) return 3;
  if (value === 2) return 2;
  return 1;
}

function deriveGate(rows: GateRow[]): Gate {
  if (rows.length === 0) return 1;
  const gate1Done = rows[0]?.isComplete ?? false;
  const gate2Done = rows[1]?.isComplete ?? false;
  if (gate1Done && gate2Done) return 3;
  if (gate1Done) return 2;
  return 1;
}

export function resolveGate(storedGate: number | null, rows: GateRow[]): Gate {
  return Math.max(normalizeGate(storedGate), deriveGate(rows)) as Gate;
}

export async function syncGate(
  client: GateClient,
  dependencies: GateSyncDependencies
): Promise<{ gate: Gate; rows: GateRow[]; notionAvailable: boolean }> {
  const storedGate = normalizeGate(client.current_gate);

  if (!client.notion_drafting_page_id) {
    return { gate: storedGate, rows: [], notionAvailable: true };
  }

  let rows: GateRow[];
  try {
    rows = await dependencies.fetchRows(client.notion_drafting_page_id);
  } catch {
    return { gate: storedGate, rows: [], notionAvailable: false };
  }

  const gate = resolveGate(storedGate, rows);
  if (gate > storedGate) {
    await dependencies.persistGate(client.id, gate);
  }

  return { gate, rows, notionAvailable: true };
}
