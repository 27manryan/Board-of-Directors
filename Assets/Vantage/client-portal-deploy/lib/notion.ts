import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { DELIVERABLES } from "@/lib/engagement";

export function getNotionClient() {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

// =========================================================================
// AUTO-LINK
// =========================================================================

// Finds the client page in the Clients & Projects database by title match.
async function findClientPage(clientName: string) {
  const notion = getNotionClient();
  const dbId = process.env.NOTION_CLIENTS_DATABASE_ID!.replace(/-/g, "");

  const response = await notion.search({
    query: clientName,
    filter: { value: "page", property: "object" },
    page_size: 20,
  });

  return response.results.find((result) => {
    if (result.object !== "page") return false;
    if (!("parent" in result)) return false;
    const parent = (result as { parent: { type: string; database_id?: string } }).parent;
    if (parent.type !== "database_id") return false;
    if ((parent.database_id ?? "").replace(/-/g, "") !== dbId) return false;

    const props = (result as { properties: Record<string, { type: string; title?: RichTextItemResponse[] }> }).properties;
    const titleProp = Object.values(props).find((p) => p.type === "title");
    if (!titleProp?.title) return false;
    const title = titleProp.title.map((t) => t.plain_text).join("").trim();
    return title.toLowerCase() === clientName.toLowerCase().trim();
  }) ?? null;
}

// Walks child blocks of a page looking for a child_page with the given name.
async function findChildPageByName(parentId: string, name: string): Promise<string | null> {
  const notion = getNotionClient();
  const target = name.toLowerCase().trim();
  let cursor: string | undefined;
  do {
    const children = await notion.blocks.children.list({
      block_id: parentId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of children.results) {
      if (
        block.object === "block" &&
        "type" in block &&
        block.type === "child_page" &&
        "child_page" in block
      ) {
        const title = (block as Extract<BlockObjectResponse, { type: "child_page" }>)
          .child_page.title;
        if (title.toLowerCase().trim() === target) {
          return block.id;
        }
      }
    }
    cursor = children.has_more ? (children.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return null;
}

// Finds the "Drafting" child page inside a client's Notion record.
export async function findDraftingPageId(clientName: string): Promise<string | null> {
  const clientPage = await findClientPage(clientName);
  if (!clientPage) return null;
  return findChildPageByName(clientPage.id, "Drafting");
}

// Finds the "Discovery" child page inside a client's Notion record.
export async function findDiscoveryPageId(clientName: string): Promise<string | null> {
  const clientPage = await findClientPage(clientName);
  if (!clientPage) return null;
  return findChildPageByName(clientPage.id, "Discovery");
}

// =========================================================================
// GATE STATUS TABLE
// =========================================================================

export interface GateTableRow {
  gate: string;        // "Gate 1: Positioning Review" (raw Notion text)
  description: string; // Description column
  status: string;      // Raw status text e.g. "✅ Cleared — March 2026"
  isComplete: boolean; // Derived from status text
}

// Matches "cleared", "complete", "completed", "done", "approved" — case-insensitive.
// Also treats ✅ or ✓ alone as complete. Strips emojis/dates/dashes before checking.
function isCompleteStatus(raw: string): boolean {
  if (!raw.trim()) return false;
  const COMPLETE_WORDS = ["cleared", "complete", "completed", "done", "approved"];
  const normalized = raw
    .replace(/[✅✓☑️]/g, " complete ")
    .replace(/[—–-]/g, " ")
    .toLowerCase();
  return COMPLETE_WORDS.some((w) => normalized.includes(w));
}

// Fetches and parses the Gate Status table from the top of the Drafting page.
// Expects the first `table` block found; skips the header row.
export async function fetchGateStatusTable(draftingPageId: string): Promise<GateTableRow[]> {
  const notion = getNotionClient();

  // Find the first table block in the Drafting page
  const pageBlocks = await notion.blocks.children.list({
    block_id: draftingPageId,
    page_size: 50,
  });

  const tableBlock = (pageBlocks.results as BlockObjectResponse[]).find(
    (b) => b.type === "table"
  );
  if (!tableBlock) return [];

  // Fetch table rows
  const rowsResponse = await notion.blocks.children.list({
    block_id: tableBlock.id,
    page_size: 100,
  });

  const rows: GateTableRow[] = [];
  let isHeader = true;

  for (const block of rowsResponse.results as BlockObjectResponse[]) {
    if (block.type !== "table_row") continue;
    if (isHeader) { isHeader = false; continue; } // skip header row

    const cells = (block as Extract<BlockObjectResponse, { type: "table_row" }>)
      .table_row.cells;

    const cellText = (i: number) =>
      (cells[i] ?? []).map((r: RichTextItemResponse) => r.plain_text).join("").trim();

    const status = cellText(2);
    rows.push({
      gate: cellText(0),
      description: cellText(1),
      status,
      isComplete: isCompleteStatus(status),
    });
  }

  return rows;
}

// Derives current active gate (1, 2, or 3) from the gate table rows.
// "current gate" = the first gate that is NOT complete.
// If all complete, returns 3 (Final Review still in progress or done).
export function deriveCurrentGate(rows: GateTableRow[]): 1 | 2 | 3 {
  if (rows.length === 0) return 1;
  const gate1Done = rows[0]?.isComplete ?? false;
  const gate2Done = rows[1]?.isComplete ?? false;
  if (gate1Done && gate2Done) return 3;
  if (gate1Done) return 2;
  return 1;
}

// =========================================================================
// BLOCK PARSER — Deliverables
// =========================================================================

export type NotionDeliverableStatus = "locked" | "in_progress" | "not_started";

export interface ParsedDeliverable {
  code: string;
  title: string;
  notionStatus: NotionDeliverableStatus;
  contentBlocks: string[];
}

function richTextToPlain(richText: RichTextItemResponse[]): string {
  return richText.map((t) => t.plain_text).join("");
}

function parseHeading(text: string): { code: string; title: string; notionStatus: NotionDeliverableStatus } | null {
  const match = text.match(/^(D\d{2})\s*[—–-]\s*(.+?)(?:\s*(✅|⏳))?(?:\s*(LOCKED|In Progress))?$/i);
  if (!match) return null;

  const code = match[1];
  let rawTitle = match[2].trim();
  const emoji = match[3] ?? "";
  const statusWord = match[4]?.toLowerCase() ?? "";

  rawTitle = rawTitle.replace(/\s*(✅|⏳)\s*(LOCKED|In Progress)?$/i, "").trim();

  let notionStatus: NotionDeliverableStatus = "not_started";
  if (emoji === "✅" || statusWord === "locked") notionStatus = "locked";
  else if (emoji === "⏳" || statusWord === "in progress") notionStatus = "in_progress";

  return { code, title: rawTitle, notionStatus };
}

function blockToText(block: BlockObjectResponse): string | null {
  switch (block.type) {
    case "paragraph":
      return richTextToPlain(block.paragraph.rich_text) || null;
    case "bulleted_list_item":
      return `• ${richTextToPlain(block.bulleted_list_item.rich_text)}`;
    case "numbered_list_item":
      return richTextToPlain(block.numbered_list_item.rich_text);
    case "quote":
      return `"${richTextToPlain(block.quote.rich_text)}"`;
    case "heading_1":
      return richTextToPlain(block.heading_1.rich_text);
    case "heading_2":
      return richTextToPlain(block.heading_2.rich_text);
    default:
      return null;
  }
}

// =========================================================================
// GATE STATUS UPDATE
// =========================================================================

// Updates the Status cell (column 2) for the given gate row in the Gate Status
// table on the Drafting page. Preserves Gate and Description cells unchanged.
export async function updateGateStatus(
  draftingPageId: string,
  gateNumber: 1 | 2 | 3,
  newStatus: string
): Promise<void> {
  const notion = getNotionClient();

  // Find the first table block on the Drafting page
  const pageBlocks = await notion.blocks.children.list({
    block_id: draftingPageId,
    page_size: 50,
  });
  const tableBlock = (pageBlocks.results as BlockObjectResponse[]).find(
    (b) => b.type === "table"
  );
  if (!tableBlock) return;

  // Fetch all rows (row 0 = header, row N = gate N)
  const rowsResponse = await notion.blocks.children.list({
    block_id: tableBlock.id,
    page_size: 100,
  });
  const rowBlocks = (rowsResponse.results as BlockObjectResponse[]).filter(
    (b) => b.type === "table_row"
  );

  // Row index 0 is the header; gate 1 → index 1, gate 2 → index 2, etc.
  const targetRow = rowBlocks[gateNumber];
  if (!targetRow) return;

  const existingCells = (
    targetRow as Extract<BlockObjectResponse, { type: "table_row" }>
  ).table_row.cells;

  // Replace only the status column (index 2); preserve the rest
  const updatedCells = existingCells.map((cell, i) =>
    i === 2
      ? [{ type: "text" as const, text: { content: newStatus } }]
      : cell
  );

  await notion.blocks.update({
    block_id: targetRow.id,
    // @ts-expect-error — SDK table_row update types are overly strict
    table_row: { cells: updatedCells },
  });
}

// =========================================================================
// APPEND CLIENT COMMENTS TO NOTION
// =========================================================================

export async function appendCommentsToNotion(
  draftingPageId: string,
  gate: 1 | 2 | 3,
  comments: { deliverable_code: string; comment_text: string }[],
): Promise<void> {
  if (comments.length === 0) return;
  const notion = getNotionClient();

  const datestamp = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: `Client Comments — Gate ${gate}` } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: `Submitted ${datestamp}` },
          annotations: { italic: true, color: "gray" },
        }],
      },
    },
  ];

  for (const c of comments) {
    const title = DELIVERABLES[c.deliverable_code] ?? c.deliverable_code;
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: `${c.deliverable_code} — ${title}` },
          annotations: { bold: true },
        }],
      },
    });
    children.push({
      object: "block",
      type: "quote",
      quote: {
        rich_text: [{ type: "text", text: { content: c.comment_text } }],
      },
    });
  }

  await notion.blocks.children.append({
    block_id: draftingPageId,
    children,
  });
}

// =========================================================================
// BLOCK PARSER — Deliverables (fetch + parse)
// =========================================================================

export async function fetchDraftingDeliverables(
  draftingPageId: string
): Promise<ParsedDeliverable[]> {
  const notion = getNotionClient();
  const allBlocks: BlockObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: draftingPageId,
      start_cursor: cursor,
      page_size: 100,
    });
    allBlocks.push(...(response.results as BlockObjectResponse[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const deliverables: ParsedDeliverable[] = [];
  let current: ParsedDeliverable | null = null;

  for (const block of allBlocks) {
    if (block.type === "heading_3") {
      const headingText = richTextToPlain(block.heading_3.rich_text);
      const parsed = parseHeading(headingText);
      if (parsed) {
        if (current) deliverables.push(current);
        current = { ...parsed, contentBlocks: [] };
        continue;
      }
    }
    if (current) {
      const text = blockToText(block);
      if (text) current.contentBlocks.push(text);
    }
  }

  if (current) deliverables.push(current);
  return deliverables;
}

// =========================================================================
// DISCOVERY QUESTIONS — fetch + write-back
// =========================================================================

export interface DiscoveryQuestion {
  blockId: string;
  heading: string;
  questionText: string;
}

// Reads the Discovery page: H3 = question identifier, first paragraph
// below each H3 = the question text shown to the client.
export async function fetchDiscoveryQuestions(
  discoveryPageId: string
): Promise<DiscoveryQuestion[]> {
  const notion = getNotionClient();
  const allBlocks: BlockObjectResponse[] = [];

  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: discoveryPageId,
      start_cursor: cursor,
      page_size: 100,
    });
    allBlocks.push(...(response.results as BlockObjectResponse[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const questions: DiscoveryQuestion[] = [];
  let pendingHeading: { blockId: string; heading: string } | null = null;

  for (const block of allBlocks) {
    if (block.type === "heading_3") {
      const heading = richTextToPlain(block.heading_3.rich_text).trim();
      if (heading) {
        pendingHeading = { blockId: block.id, heading };
      }
      continue;
    }
    if (pendingHeading && block.type === "paragraph") {
      const text = richTextToPlain(block.paragraph.rich_text).trim();
      if (text) {
        questions.push({ ...pendingHeading, questionText: text });
      }
      pendingHeading = null;
    }
  }

  return questions;
}

// Writes client answers back to the Discovery page in Notion.
// For each answer, appends a bold "Response:" paragraph after the
// question's H3 block using the Notion API.
export async function writeDiscoveryAnswers(
  discoveryPageId: string,
  answers: { heading: string; answer: string }[]
): Promise<void> {
  if (answers.length === 0) return;
  const notion = getNotionClient();

  const datestamp = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Client Discovery Responses" } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: `Submitted ${datestamp}` },
          annotations: { italic: true, color: "gray" },
        }],
      },
    },
  ];

  for (const a of answers) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: `${a.heading}` },
          annotations: { bold: true },
        }],
      },
    });
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Response: " },
            annotations: { bold: true },
          },
          {
            type: "text",
            text: { content: a.answer },
          },
        ],
      },
    });
  }

  await notion.blocks.children.append({
    block_id: discoveryPageId,
    children,
  });
}
