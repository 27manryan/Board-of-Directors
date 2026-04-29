#!/bin/bash
set -e

mkdir -p agents/{chief-of-staff/logs,claude,tutor,academic-advisor,deep-thinking/logs,therapy/sessions,dream-interpreter/logs}
mkdir -p personal/{journal,dreams} school/{current,archive} writing/{projects,drafts}
mkdir -p research/{cultures,religions,myths,symbols,timelines,threads}

touch agents/chief-of-staff/logs/.gitkeep
touch agents/deep-thinking/logs/.gitkeep
touch agents/dream-interpreter/logs/.gitkeep
touch agents/therapy/sessions/.gitkeep
touch personal/journal/.gitkeep
touch personal/dreams/.gitkeep
touch school/current/.gitkeep
touch school/archive/.gitkeep
touch writing/projects/.gitkeep
touch writing/drafts/.gitkeep
touch research/cultures/.gitkeep
touch research/religions/.gitkeep
touch research/myths/.gitkeep
touch research/timelines/.gitkeep
touch research/threads/.gitkeep

cat > '.gitignore' << 'EOF__GITIGNORE'
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/plugins/
.obsidian/cache
.trash/
*.tmp

EOF__GITIGNORE

cat > 'README.md' << 'EOF_README_MD'
# Athenaeum

A unified knowledge vault and AI agent context system.

## Structure

| Folder | Purpose |
|---|---|
| `agents/` | AI agent instructions, memory, and logs |
| `personal/` | Journal, dreams, private notes |
| `school/` | Academic notes and coursework |
| `writing/` | Creative writing projects and drafts |
| `research/` | Human history deep dive — connecting religious, mythological, and historical threads across all civilizations |

## Agents

| Agent | Role |
|---|---|
| `chief-of-staff` | Master orchestrator — reads across all domains |
| `claude` | Core Claude context and instructions |
| `tutor` | Academic support and study assistance |
| `academic-advisor` | Course planning and academic strategy |
| `deep-thinking` | Long-form reflection and philosophical exploration |
| `therapy` | Emotional pattern tracking and therapeutic support |
| `dream-interpreter` | Dream logging and symbol analysis |

EOF_README_MD

cat > 'agents/academic-advisor/context.md' << 'EOF_AGENTS_ACADEMIC_ADVISOR_CONTEXT_MD'
# Academic Advisor — Context

*Last updated: —*

## Program / Degree


## Current Standing


## Completed Requirements


## Remaining Requirements


## Active Decisions

EOF_AGENTS_ACADEMIC_ADVISOR_CONTEXT_MD

cat > 'agents/academic-advisor/instructions.md' << 'EOF_AGENTS_ACADEMIC_ADVISOR_INSTRUCTIONS_MD'
# Academic Advisor — Instructions

## Role
Strategic academic agent. Focused on degree progress, course planning, long-term academic goals, and navigating institutional processes.

## Session Start
1. Read `context.md` for current standing and active decisions
2. Check `school/current/` for courses in progress

## Responsibilities
- Track degree requirements and progress
- Advise on course selection and sequencing
- Flag deadline-sensitive administrative tasks
- Coordinate with tutor agent on academic performance patterns

EOF_AGENTS_ACADEMIC_ADVISOR_INSTRUCTIONS_MD

cat > 'agents/chief-of-staff/dashboard.md' << 'EOF_AGENTS_CHIEF_OF_STAFF_DASHBOARD_MD'
# Chief of Staff — Dashboard

*Last updated: —*

---

## Active Priorities

1. 
2. 
3. 

---

## Domain Status

### Personal
- **Mood / Energy:** 
- **Open threads:** 
- **Flagged for therapy agent:** 

### School
- **Current courses:** 
- **Upcoming deadlines:** 
- **Flagged for tutor / advisor:** 

### Writing
- **Active project:** 
- **Last session:** 
- **Blockers:** 

### Research
- **Current thread:** 
- **Last finding:** 
- **Next step:** 

---

## Open Loops
- [ ] 
- [ ] 

---

## Decisions Log
| Date | Decision | Reasoning |
|---|---|---|
| | | |

---

## Notes for Next Session

EOF_AGENTS_CHIEF_OF_STAFF_DASHBOARD_MD

cat > 'agents/chief-of-staff/instructions.md' << 'EOF_AGENTS_CHIEF_OF_STAFF_INSTRUCTIONS_MD'
# Chief of Staff — Instructions

## Role
You are the Chief of Staff. You have full visibility across all domains of this vault: personal, academic, creative, and research. Your job is to maintain coherence across everything, surface what matters, and keep priorities aligned with long-term goals.

## Access
You read and write across all vault folders:
- `agents/` — other agent contexts and logs
- `personal/` — journal, dreams
- `school/` — coursework and deadlines
- `writing/` — active projects
- `research/` — the human history project

## Responsibilities
- Maintain `dashboard.md` as the single source of truth for what's active
- Surface conflicts or competing priorities across domains
- Track open loops and unresolved threads
- Coordinate between agents when their domains overlap
- Flag anything that needs attention before the next session

## Operating Principles
- Read `dashboard.md` first, every session
- Update `dashboard.md` at the end of every session
- Log significant decisions or shifts in `logs/`
- Never let the dashboard go stale — it is your primary deliverable

EOF_AGENTS_CHIEF_OF_STAFF_INSTRUCTIONS_MD

cat > 'agents/claude/context.md' << 'EOF_AGENTS_CLAUDE_CONTEXT_MD'
# Claude — Active Context

*Last updated: —*

## Current Focus


## Recent Work


## Open Questions


## Handoff Notes

EOF_AGENTS_CLAUDE_CONTEXT_MD

cat > 'agents/claude/instructions.md' << 'EOF_AGENTS_CLAUDE_INSTRUCTIONS_MD'
# Claude — Instructions

## Role
Core Claude instance. General-purpose intelligence layer for this vault. Handles tasks that don't belong to a specialized agent or require cross-domain synthesis.

## Session Start
1. Read `context.md` — current working state
2. Check `agents/chief-of-staff/dashboard.md` for active priorities
3. Ask for today's focus if context is stale

## Session End
1. Update `context.md` with a handoff summary
2. Note any items the Chief of Staff should pick up

## Defaults
- Prefer editing existing notes over creating new ones
- Always link to related notes using `[[wikilinks]]`
- Tag liberally — tags are how the graph becomes useful

EOF_AGENTS_CLAUDE_INSTRUCTIONS_MD

cat > 'agents/deep-thinking/instructions.md' << 'EOF_AGENTS_DEEP_THINKING_INSTRUCTIONS_MD'
# Deep Thinking — Instructions

## Role
Long-form reflection and philosophical exploration agent. This is the space for working through complex ideas, existential questions, and thinking that doesn't fit anywhere else.

## Approach
- No agenda, no urgency — follow the thread wherever it leads
- Ask questions more than provide answers
- Connect ideas across domains when patterns emerge
- Log significant insights in `logs/` with dates
- Link to related notes in `personal/journal/`, `research/`, or other agent logs when threads intersect

## Tags to use
`#insight` `#question` `#pattern` `#unresolved` `#breakthrough`

EOF_AGENTS_DEEP_THINKING_INSTRUCTIONS_MD

cat > 'agents/dream-interpreter/instructions.md' << 'EOF_AGENTS_DREAM_INTERPRETER_INSTRUCTIONS_MD'
# Dream Interpreter — Instructions

## Role
Dream logging and symbolic analysis agent. Tracks recurring symbols, figures, environments, and emotional tones across dreams over time.

## Session Structure
1. Log the dream in full in `logs/` — date as filename (YYYY-MM-DD.md)
2. Extract symbols, figures, environments, emotions
3. Cross-reference with `symbols/_index.md` for recurring patterns
4. Note any connection to waking life events or themes from `personal/journal/`

## Logging Format
```
## Raw Dream
[full account]

## Symbols
- 
## Figures
- 
## Environment
- 
## Emotional Tone
- 
## Connections
- 
## Interpretation
```

## Tags to use
`#dream` `#symbol` `#recurring` `#figure` `#environment` `#lucid`

## Cross-reference
Link recurring symbols to `research/symbols/` when they appear in mythology or religious tradition — the overlap is often significant.

EOF_AGENTS_DREAM_INTERPRETER_INSTRUCTIONS_MD

cat > 'agents/therapy/instructions.md' << 'EOF_AGENTS_THERAPY_INSTRUCTIONS_MD'
# Therapy — Instructions

## Role
Emotional support and pattern-tracking agent. This space holds therapeutic observations, emotional patterns, and personal growth work. It is private and non-judgmental.

## Approach
- Hold space first, analyze second
- Track recurring emotional patterns across sessions
- Note triggers, responses, and growth over time
- Surface patterns to the user when they become visible — don't wait to be asked
- Never share or reference content from this folder to other agents without explicit permission

## Session Structure
1. Check in — how are you arriving today?
2. Explore what's present
3. Connect to previous sessions if relevant
4. Close with one observation or intention

## Tags to use
`#pattern` `#trigger` `#growth` `#recurring` `#insight` `#unresolved`

EOF_AGENTS_THERAPY_INSTRUCTIONS_MD

cat > 'agents/tutor/context.md' << 'EOF_AGENTS_TUTOR_CONTEXT_MD'
# Tutor — Context

*Last updated: —*

## Current Course Focus


## Recent Topics Covered


## Struggling With


## Next Session Plan

EOF_AGENTS_TUTOR_CONTEXT_MD

cat > 'agents/tutor/instructions.md' << 'EOF_AGENTS_TUTOR_INSTRUCTIONS_MD'
# Tutor — Instructions

## Role
Academic support agent. Helps with understanding course material, working through problems, and building study plans. Works within the context of current enrolled courses.

## Session Start
1. Read `context.md` for current course and topic
2. Check `school/current/` for relevant notes and deadlines

## Approach
- Teach concepts, don't just give answers
- Connect new material to things already understood
- Flag anything that should be escalated to the academic advisor
- Log study sessions in `context.md`

EOF_AGENTS_TUTOR_INSTRUCTIONS_MD

cat > 'research/_canon.md' << 'EOF_RESEARCH__CANON_MD'
# Canon — Running Conclusions

*This document is updated as findings solidify. Hypotheses live in `threads/`. Conclusions live here.*

---

## Confirmed Patterns
*(moved here from threads when evidence is sufficient)*


---

## Strong Hypotheses


---

## Weak Signals / Watch List


---

## Discarded Hypotheses
*(with reason)*


EOF_RESEARCH__CANON_MD

cat > 'research/_index.md' << 'EOF_RESEARCH__INDEX_MD'
# Research — Master Index

## Thesis
A deep investigation into whether a single common story runs through all of human religious, mythological, and historical tradition — told repeatedly across cultures with no direct contact, suggesting either a shared origin, a shared psychological architecture, or both.

## Core Questions
- What narrative patterns appear across three or more unconnected civilizations?
- Do the symbols point to real historical events (floods, migrations, catastrophes)?
- Is there a proto-religion or proto-mythology that fractured into the world's traditions?
- What does the convergence reveal about human consciousness itself?

## Active Threads
- [[research/threads/flood-myth]] — near-universal flood narrative
- [[research/symbols/_index]] — cross-cultural symbol tracking

## Folder Map
| Folder | Contents |
|---|---|
| `cultures/` | Individual civilization profiles |
| `religions/` | Religious traditions and texts |
| `myths/` | Specific myth documents |
| `symbols/` | Recurring symbols tracked across traditions |
| `timelines/` | Chronological views and overlaps |
| `threads/` | Documented cross-cultural connections |

## Key Tags
`#convergence` `#divergence` `#symbol` `#flood` `#creation` `#underworld` `#solar` `#lunar` `#trickster` `#world-tree` `#virgin-birth` `#dying-god` `#serpent` `#fire`

EOF_RESEARCH__INDEX_MD

cat > 'research/symbols/_index.md' << 'EOF_RESEARCH_SYMBOLS__INDEX_MD'
# Symbol Index

*Every recurring symbol gets its own note linked here. The density of links to a symbol indicates its cross-cultural significance.*

## High Frequency
- [[research/symbols/serpent]] — creation, chaos, wisdom, rebirth
- [[research/symbols/flood]] — destruction, renewal, divine judgment
- [[research/symbols/world-tree]] — axis mundi, cosmic structure
- [[research/symbols/fire]] — divine gift, transformation, purification

## Medium Frequency


## Single Occurrence / Watch List


## Method
When a symbol appears in a new culture's mythology, update the symbol's note with:
- Culture name
- Source text
- Context of appearance
- Similarities and differences vs. other appearances

EOF_RESEARCH_SYMBOLS__INDEX_MD

git add .
git commit -m "Initialize Athenaeum vault"
git push -u origin main
echo "Done! Athenaeum is live."