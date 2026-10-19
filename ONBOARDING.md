---
authored_by: ai
date: 2026-10-19
status: active
---

# Lido Pool Onboarding: pixel game demo

A browser pixel game, built as an onboarding demo for Lido Finance (Phaser 4 + Vite + TypeScript, static site on GitHub Pages).
Audience: People/HR team at Lido, who will look at it as a concept.

## Decisions (Шэф, 19.10.2026)

- Separate URL: own repo `rudkovskii/lido-onboarding`, GitHub Pages `/lido-onboarding/`.
- Language: **English** everywhere in the UI.
- Companion: a **goose** follows the newcomer (pun on GOOSE, the DAO's goal framework; grants are EGGs).
- World (reworked 19.10 evening): a bright **tech campus** in the spirit of a big glass ring office, with the **Lido pool** in its courtyard.
  Nothing rustic: pale stone walkways, manicured lawns, rows of round trees, benches, a café kiosk.
- Structure content: **public information only** (lido.fi, research.lido.fi). No names of people, no internal unit names.
- Policies: **phantom** (invented, plausible). Every policy screen says so.
- Scope: **demo with 3 mini-games** -> show to the team -> collect feedback.
- The URL is public: splash says "Prototype · not an official Lido product · policies are fictional". No official Lido logo.

## Concept mapping

| Concept | In the game |
|---|---|
| The newcomer | Generic character in a teal hoodie (no real person) |
| Companion | Goose, follows the newcomer |
| Office | **Onboarding HQ**, an open-space office behind the door of the ring building |
| Reference book | **Handbook** at the reception desk: three tabs = three tracks, "Add to plan" for a card or "Add whole track" |
| Cards in progress | **Co-working terrace** on the campus: every card in your plan is a desk with a monitor |
| Stages | **New** (monitor off) -> **Started** (monitor on) -> **Practiced** (chart) -> **Mastered** (green check, a badge pops up) |
| Mastered cards | **Learned** badge wall in the office |
| Progress screen | **My onboarding plan** whiteboard in the office |
| Mini-games entry | Info totem on the campus plaza ("Mini-games"), 3 games (below) |
| Progress | Path to **"Onboarded"**, 8 levels by share of all cards mastered |

While you answer in a mini-game, your newcomer walks to the desk of the card and works through it (autorun).

## The three mini-games (content: `content/lido/cards.json`)

1. **Pool Rules** (phantom policies). Scenario cards: a situation -> answer **OK / Violation / Ask first**, then the rule
   and its explanation. Plus a recall task: rule title -> pick the correct rule text out of 4.
2. **Who's Who** (structure). "Who decides / where does this go?" multiple choice from `structureQuestions`,
   plus card front <-> back matching in both directions.
3. **Staking 101** (glossary). Term -> meaning and meaning -> term, multiple choice, both directions.

A card is mastered after 4 correct answers (1 for New -> Started, 2 for Started -> Practiced, 1 for Practiced -> Mastered).

## Content

`content/lido/cards.json`: `tracks`, `cards` (`id`, `track`, `front`, `back`, `band`), `scenarios` (policies),
`structureQuestions`. Edit content there; the game reads it at build time.
