# Action Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic Action Guard pipeline that evaluates proposed agent tool actions before execution.

**Architecture:** Add a small `lib/action-guard` module for validation, detection, policy scoring, and pipeline orchestration. Reuse the existing API, Supabase admin, UI, docs, and eval patterns without adding dependencies.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase Postgres, Node eval scripts.

---

### Task 1: Red Eval Harness

**Files:**
- Create: `evals/action-cases.json`
- Create: `scripts/run-action-evals.mjs`
- Modify: `package.json`

- [ ] Add deterministic action cases for secret exfiltration, unsafe files, database export, webhook customer data, safe internal note, prior BLOCK external action, safe shell, and private IP curl.
- [ ] Add `eval:actions` that POSTs each case to `/api/action-guard`.
- [ ] Run `npm.cmd run eval:actions` against the dev server and confirm it fails while the endpoint is missing.

### Task 2: Core Engine

**Files:**
- Create: `lib/action-guard/types.ts`
- Create: `lib/action-guard/validation.ts`
- Create: `lib/action-guard/detectors.ts`
- Create: `lib/action-guard/policies.ts`
- Create: `lib/action-guard/evaluate.ts`

- [ ] Validate request shape using existing validation helpers.
- [ ] Detect secrets, PII, risky targets, file paths, shell commands, and database exports with redacted evidence.
- [ ] Score risk deterministically, apply hard-block policies, and return the requested result shape.
- [ ] Run `npm.cmd run eval:actions` and fix engine/API failures after the route exists.

### Task 3: API And Persistence

**Files:**
- Create: `lib/action-guard/pipeline.ts`
- Create: `app/api/action-guard/route.ts`
- Create: `lib/db/actionDecisions.ts`
- Modify: `supabase/schema.sql`

- [ ] Follow `/api/sanitize` error/auth handling.
- [ ] Persist only redacted payload previews and compact metadata for signed-in users.
- [ ] Add `action_decisions` with RLS and owner-only select policy.

### Task 4: UI

**Files:**
- Create: `components/ActionGuardForm.tsx`
- Create: `components/ActionGuardResultPanel.tsx`
- Create: `app/action-guard/page.tsx`
- Modify: `components/AppHeader.tsx`
- Modify: `app/globals.css`

- [ ] Add presets, demos, action fields, prior input context, and submit handling.
- [ ] Render decision, risk meter, reasons, policies, signals, safe alternative, JSON, and saved ID.
- [ ] Reuse existing visual primitives and keep layout consistent.

### Task 5: Docs And Verification

**Files:**
- Modify: `README.md`
- Modify: `app/docs/page.tsx`

- [ ] Document Action Guard behavior, API shape, examples, persistence, and schema note.
- [ ] Run `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run eval:local`, and `npm.cmd run eval:actions`.
- [ ] Commit clean checkpoints.
