# Plan: Claude's Math Marauder

**Date:** 2026-05-01
**Status:** Ready for execution
**Spec:** `docs/superpowers/specs/2026-05-01-claudes-math-marauder-design.md`
**Plan canonical location:** `claudes-math-marauder/plan.md` (per repo convention; this file is a pointer)
**Per-session implementation specs:** `claudes-math-marauder/sessions/session-NN.md` (14 sessions)

## Why this plan lives outside `docs/superpowers/plans/`

Repo convention (set by `lizzies-petstore`, `phonics-game`) is to keep each game's plan and per-session specs colocated with the game directory: `<game>/plan.md` + `<game>/sessions/session-NN.md`. The writing-plans skill's default path is `docs/superpowers/plans/` — but skill defaults yield to repo conventions / user instructions. This file exists only as a discoverable pointer for anyone searching the canonical plans directory.

## Quick summary

Slay-the-Spire-style branching-map roguelike teaching multiplication and division 0–12 (with stretch facts in 5s/10s/2s families) to a 10-year-old with ADHD + dyslexia. Hybrid combat: tappable answer orbs (default), typed-answer ultimate (~1 in 10 problems), multi-phase boss glyph combos. Comic-book art style rendered procedurally on Canvas 2D — no image assets. Adaptive Leitner spaced-repetition mastery engine. 5 realms, 5 bosses, 16 spells, 4 classes, 6 story chapters. ~5–15 minute sessions. Retry-on-defeat (no run-loss); stakes via 1–2–3⭐ rating. Vanilla JS, no bundler, GitHub Pages deploy.

## Sessions (14 total)

| # | Title | Model |
|---|---|---|
| 1 | Scaffold: Repo Layout, Save Schema, Tooling | Sonnet |
| 2 | Pure-Logic Combat: Mastery, Problem Gen, Distractors | Sonnet |
| 3 | Comic Renderer: Procedural Sprites, FX Library | Opus |
| 4 | Data Authoring Round 1: Realm 1 Playable | Sonnet |
| 5 | Combat: Orb Cast Loop | Sonnet |
| 6 | Combat: Typed Ultimate Spell | Sonnet |
| 7 | Boss Fight: Glyph Combo | Opus |
| 8 | Audio: Web Speech + Synthesized SFX + Settings | Sonnet |
| 9 | Run Map: Branching Graph + Resume | Sonnet |
| 10 | Hub: Wizard's Tower, Deck Builder, Codex | Sonnet |
| 11 | Data Authoring Round 2: Fill the World | Sonnet |
| 12 | Cutscenes, Results Cards, Transitions | Sonnet |
| 13 | Replay Harness, Dev Menu, Fuzzer | Sonnet |
| 14 | Accessibility, iPad QA, Final Polish | Opus |

Read each session's spec before executing it. Each session has its own pre-flight, file list, deliverables, tests, acceptance checklist, and end-of-session ritual.

## Execution

Two execution options:

### 1. Subagent-Driven (recommended)

Run each session in a fresh subagent with the session spec as the prompt. The main agent stays in the user's conversation context; subagents do the heavy lifting. After each subagent completes:
- Review the diff
- Run the listed tests
- Run `marauder-web-review` agent
- Commit + push

### 2. Inline Execution

Work through the sessions sequentially in this conversation. Higher context cost but tighter feedback.

Both approaches respect the per-session test gates listed at the bottom of each `sessions/session-NN.md`.
