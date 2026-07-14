import { revalidateTag } from "next/cache";

export const NOTION_CACHE_TTL_SECONDS = 60;

export const NOTION_CACHE_TAGS = {
  gateStatus: "notion-gate-status",
  drafting: "notion-drafting",
  discovery: "notion-discovery",
} as const;

export function invalidateNotionCache(
  ...areas: (keyof typeof NOTION_CACHE_TAGS)[]
) {
  for (const area of areas) {
    revalidateTag(NOTION_CACHE_TAGS[area]);
  }
}
