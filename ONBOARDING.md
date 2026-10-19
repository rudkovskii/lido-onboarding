---
authored_by: ai
date: 2026-10-19
status: active
---

# Lido Pool Onboarding: pixel game demo

Fork of the Polish-learning farm game (`Изучение польского/Игра/app`, repo `rudkovskii/polski-quest`, commit a2a8590),
adapted as an onboarding demo for Lido Finance. Audience: People/HR team at Lido, who will look at it as a concept.

## Decisions (Шэф, 19.10.2026)

- Separate URL: own repo `rudkovskii/lido-onboarding`, GitHub Pages `/lido-onboarding/`. The Polish game is not touched.
- Language: **English** everywhere in the UI.
- Companion: a **goose** follows the newcomer instead of the cat (pun on GOOSE, the DAO's goal framework; grants are EGGs).
- World: farm → **Lido campus by the pool** (Lido = a public pool). Same growing mechanic, renamed.
- Structure content: **public information only** (lido.fi, research.lido.fi). No names of people, no internal unit names.
- Policies: **phantom** (invented, plausible). Every policy screen says so.
- Scope: **demo with 3 mini-games** → show to the team → collect feedback.
- The URL is public: splash says "Prototype · not an official Lido product · policies are fictional". No official Lido logo.

## Concept mapping

| Farm | Onboarding |
|---|---|
| Hero by Dima's photo | Generic newcomer (no real person) |
| Cat Rudy | Goose |
| House with Słownik desk | Onboarding HQ with the **Handbook** desk: pick cards to "plant" |
| Garden beds with words | **Knowledge garden** by the pool: cards grow seed → sprout → bush → harvest |
| Harvest box / pantry jars | "Learned" shelf: cards you've mastered |
| Board with 5 games | Board with 3 games (below) |
| Path to A1, 20 levels | Path to **"Onboarded"**, levels by share of all cards learned |
| Beaver, Zagroda, Polska games, Polish TTS, RU→PL dictionary, custom words, spell game | Removed |

## The three mini-games (content: `content/lido/cards.json`)

1. **Pool Rules** (phantom policies). Scenario cards: a situation → answer **OK / Violation / Ask first**, then the rule
   and its explanation. Plus a recall task: rule title → pick the correct rule text out of 4.
2. **Who's Who** (structure). "Who decides / where does this go?" multiple choice from `structureQuestions`,
   plus card front ↔ back matching in both directions.
3. **Staking 101** (glossary). Term → meaning and meaning → term, multiple choice, both directions.

Answering waters the plants (same autorun as on the farm). A card is "learned" when harvested.

## Content

`content/lido/cards.json`: `tracks`, `cards` (`id`, `track`, `front`, `back`, `band`), `scenarios` (policies),
`structureQuestions`. Edit content there; the game reads it at build time.
