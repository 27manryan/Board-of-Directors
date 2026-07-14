# Vantage Client Portal Claude Addendum

Read root `AGENTS.md`, root `CLAUDE.md`, and this folder's `AGENTS.md` first.

This file is intentionally small. Provider-neutral portal rules live in `AGENTS.md`. Durable project context lives in `docs/reference/`.

## Claude-specific notes

- If using Claude subagents, mark them as workers and pass only the needed portal files.
- Use Sonnet for inspection, lint fixes, and routine implementation. Reserve Opus for uncertain architecture or voice-sensitive Vantage copy.
- Keep end-of-turn summaries short: changed files, verification output, and the next action if one remains.
