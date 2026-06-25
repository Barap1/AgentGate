# Repository Guidelines

## Project Structure & Module Organization

AgentGate is a Next.js App Router project. Route pages and API handlers live in `app/`, with UI components in `components/`. Core guardrail logic is under `lib/guardrail/`, ingestion helpers under `lib/ingest/`, Supabase run-history access under `lib/db/` and `lib/supabase/`, and shared utilities under `lib/utils/`. Demo inputs are in `samples/`, eval cases are in `evals/`, and the local eval runner is `scripts/run-evals.mjs`. Database setup is in `supabase/schema.sql`.

## Build, Test, and Development Commands

- `npm.cmd run dev`: starts the local Next.js dev server.
- `npm.cmd run lint`: runs ESLint across the repo.
- `npm.cmd run build`: builds the production Next.js app and type-checks it.
- `npm.cmd run eval:local`: runs the local guardrail evaluation cases from `evals/cases.json`.

Run `lint` and `build` before handing off changes. Run `eval:local` when changing prompt, provider, parsing, risk, or sanitization behavior.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and the existing App Router patterns. Keep indentation at two spaces. Components use `PascalCase` filenames and exports, for example `ResultPanel.tsx`; helpers use `camelCase` functions in domain folders. Prefer explicit validation at API and ingestion boundaries. Use existing CSS classes in `app/globals.css`; avoid adding UI dependencies unless they replace more code than they add.

## Testing Guidelines

There is no unit-test framework configured. Current checks are ESLint, production build, and the eval runner. Name new eval cases descriptively in `evals/cases.json`, and include both benign and malicious coverage when changing guardrail behavior. For UI changes, manually smoke test `/`, `/sources`, `/runs`, `/docs`, and a saved run detail page when data exists.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `ui changes` and `gitignore update`. Keep commits focused and describe the visible change. Pull requests should include a short summary, verification commands run, screenshots for UI changes, and notes for any API, schema, environment, or Supabase behavior changes.

## Security & Configuration Tips

Do not commit `.env.local`, secrets, or generated dev logs. Provider keys are read from environment variables such as `OPENROUTER_API_KEY` and `GEMINI_API_KEY`; Supabase persistence needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Preserve SSRF, upload, JSON, and request validation checks unless replacing them with an equally strict path.
