# Agent Guide

This repository is a single-user, self-hosted research app. It preserves the existing research UI and pipeline, but must not depend on Eazo login, Eazo AI routing, Eazo runtime configuration, or platform-only services.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Bun.
- Local SQLite through Drizzle ORM and `better-sqlite3`.
- `i18next` + `react-i18next` with `en-US` and `zh-CN`.
- OpenAI-compatible chat completions for the research pipeline.
- SearXNG or Bing RSS for search; all retrieved pages remain untrusted.

## Product Contract

- Single owner instance only. No public registration.
- `AUTH_MODE=owner` is the safe default and uses an administrator login. `AUTH_MODE=none` is an explicit local-only mode that uses a fixed local owner identity.
- Unknown or missing auth mode values must fall back to `owner`.
- Administrator passwords must be hashed with Argon2id.
- Authentication uses an HttpOnly, SameSite=Lax cookie backed by a session row in the local SQLite database.
- In `owner` mode, `/` is private and redirects unauthenticated users to `/login`. In `none` mode, `/` is open and uses the local owner.
- Private API routes call `await requireAuth(request)` and scope data by the authenticated user id.
- The local `users` table remains the owner table for research reports.
- LLM settings are stored server-side. API keys are AES-256-GCM encrypted with `APP_ENCRYPTION_KEY`.
- Research tuning values are stored in the local `research_settings` table and must be applied to new research tasks.
- Saved API keys are never returned to the browser. The settings API returns only whether a key exists and a masked suffix.
- The Settings test action must make a real request to the configured OpenAI-compatible endpoint.
- Do not add a custom login UI outside `src/app/login/`.
- Do not add Eazo SDK dependencies or hosted Eazo scripts.

## Research Pipeline

Keep the Planner → Search → Read → Extract → Verify → Write flow in `src/lib/research/`.

- Model calls flow through `src/lib/research/model.ts` and `src/lib/llm/`.
- Web retrieval stays in `src/lib/research/web.ts`.
- Preserve DNS/IP validation, private-address blocking, redirect limits, response size limits, and timeouts.
- Reports are saved to the local SQLite database after generation. Saving failure must not discard the generated report in the UI.
- User-visible copy belongs in both locale JSON files.

## Data and API Boundaries

- Drizzle schema lives under `src/lib/db/schema/`.
- Query helpers live under `src/lib/db/queries/`.
- API route handlers parse input, authenticate, call typed query/service helpers, and return a response.
- Components and pages call typed helpers from `src/lib/api/`, not raw `fetch` or direct `request()` calls.
- Never trust a user id supplied by request input.
- Commit generated Drizzle migrations after schema changes.
- Keep private credentials, API keys, and session tokens out of source, locale JSON, public assets, and logs.
- `APP_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Backups are required; losing it makes saved API keys unrecoverable.

## Deployment

- `Dockerfile` and `docker-compose.yml` are the supported self-hosted deployment path.
- SQLite data must live under `DATABASE_PATH` or the Docker `app_data` volume.
- `bun run db:migrate` or the Docker start command runs migrations before the app starts.
- Create or reset the administrator with `bun run admin:create` and the `ADMIN_*` environment variables, then remove `ADMIN_PASSWORD`.
- Public deployments must use `AUTH_MODE=owner`, set `SESSION_COOKIE_SECURE=true`, and terminate HTTPS at a trusted reverse proxy.
- `AUTH_MODE=none` must never be the default and must be documented as trusted-network-only.

## Coding Rules

- Use the `@/` path alias.
- Keep files focused and split by ownership when a file exceeds its practical size limit.
- Component files use `kebab-case.tsx`; component exports use named `PascalCase` functions.
- API helpers use `camelCase` functions under `src/lib/api/`.
- Use token-backed Tailwind classes and CSS variables for product UI.
- Keep `globals.css` imports at the top.
- Keep shared CSS limited to tokens, base defaults, reusable primitives, and cross-feature utilities.
- Mobile layouts need touch-friendly controls, no horizontal overflow, and safe-area-aware fixed elements.
- Use `data-el` only as an optional stable selection anchor, never for behavior.
- Read existing code before changing authentication, model calls, search, or persistence.

## Commands

```bash
bun install
bun run admin:create
bun run db:migrate
bun run lint
bun run build
bunx tsc --noEmit
bun test
```

## Final Check

- No `@eazo` import or Eazo runtime URL remains in app code.
- Every API route uses owner-session authentication unless `AUTH_MODE=none` is explicitly enabled.
- LLM keys are encrypted and never returned by the settings API.
- Reports are scoped to the authenticated administrator.
- User-visible copy exists in both locales.
- Docker Compose runs the app with a persistent SQLite data volume.
- `bun run lint` and `bun run build` pass.
