[English](README.md) | [简体中文](docs/README.zh-CN.md)

# AI Research Agent

A self-hosted, single-user web research assistant. It plans a research task, searches public sources, reads web pages, extracts and reviews evidence, and produces a cited Markdown report.

The default deployment uses a local SQLite file and does not require a separate database service.

## Features

- End-to-end research pipeline: Planner → Search → Read → Extract → Verify → Write
- OpenAI-compatible model providers, including DeepSeek and OpenAI
- SearXNG support with Bing RSS fallback
- Live research progress for planning, search, page reading, evidence extraction, verification, and report writing
- Automatic research history
- Markdown download for both current and historical reports
- English and Simplified Chinese UI
- Responsive desktop and mobile layouts
- AES-256-GCM encryption for stored API keys
- Argon2id password hashing
- Single-file SQLite database for easy backup and migration
- Docker Compose deployment

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite + Drizzle ORM
- `better-sqlite3`
- i18next / react-i18next
- Docker Compose

## Quick Start

### Docker Compose

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Generate the encryption master key:

```bash
openssl rand -base64 32
```

Set the result in `.env`:

```env
APP_ENCRYPTION_KEY=your_base64_encoded_key
```

3. Update the remaining settings as needed:

```env
AUTH_MODE=owner
DATABASE_PATH=/app/data/research-agent.sqlite
SESSION_COOKIE_SECURE=false
SEARCH_PROVIDER=searxng
SEARXNG_URL=http://searxng:8080
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Administrator
ADMIN_PASSWORD=use_a_strong_password
```

4. Start the application:

```bash
docker compose up -d --build
```

5. Create or reset the administrator:

```bash
docker compose run --rm admin
```

After creating the administrator, remove `ADMIN_PASSWORD` from `.env`.

Open `http://localhost:3000`.

### Local Development

Requirements:

- Node.js 22+
- npm or another compatible package manager
- Bun 1.3+ for running tests
- Network access to your selected model and search providers

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env`, configure it, and run:

```bash
npm run dev
```

`npm run dev` applies pending SQLite migrations automatically.

When using `owner` mode, create the administrator first:

```bash
npm run admin:create
```

## Authentication Modes

### `owner`

Recommended for public and shared deployments:

```env
AUTH_MODE=owner
```

- Unauthenticated users are redirected to `/login`
- Only the owner can change model settings or inspect research history
- Sessions are stored in the local SQLite database
- Cookies use HttpOnly, SameSite=Lax, and a configurable Secure flag

Public deployments should set:

```env
SESSION_COOKIE_SECURE=true
```

### `none`

Only use this mode on localhost, a private network, a VPN, or behind a trusted access layer:

```env
AUTH_MODE=none
```

This mode uses a fixed local owner identity and hides the login and logout flow. Anyone who can reach the port may use the model, consume provider credits, and read report history. Never expose this mode directly to the public internet.

## Model Settings

Open “Model settings” from the top-right menu and configure:

- OpenAI-compatible Base URL
- Model name
- API Key

The application calls:

```text
{BASE_URL}/chat/completions
```

Saved API keys are never returned to the browser; only a masked suffix is displayed. Leaving the API Key field empty while editing keeps the existing saved key.

## Research Parameters

Research settings are stored in SQLite and apply to subsequent research tasks.

| Parameter | Default | Adjustable range |
|---|---:|---:|
| Search queries | 3 | 1–10 |
| Maximum sources | 8 | 1–20 |
| Characters per page | 9,000 | 1,000–50,000 |
| Maximum HTML size | 1,500,000 bytes | 100,000–10,000,000 |
| Maximum claims | 12 | 1–30 |
| Maximum sections | 8 | 1–15 |
| Paragraphs per section | 8 | 1–15 |
| Output tokens per model call | 16,000 | 1,000–64,000 |

Reasoning models generally need a larger output budget; otherwise they may finish reasoning without emitting the final JSON.

## Search Configuration

SearXNG is recommended:

```env
SEARCH_PROVIDER=searxng
SEARXNG_URL=http://searxng:8080
```

The built-in Bing RSS fallback can also be used:

```env
SEARCH_PROVIDER=bing
```

Web retrieval includes DNS/IP validation, private-address blocking, redirect limits, response-size limits, and timeouts.

## Data and Privacy

Default database file:

```text
data/research-agent.sqlite
```

It contains:

- Administrator account and session records
- Encrypted model API key
- Research history, report content, and cited sources
- Research parameter settings

Do not commit the following local files:

```text
.env
.env.*
data/*.sqlite
data/*.sqlite-shm
data/*.sqlite-wal
```

These paths are covered by `.gitignore`. Before committing or pushing, run:

```bash
npm run privacy:check
```

The script checks for common API keys, private keys, credentialed database URLs, personal absolute paths, and ignored local SQLite and `.env` files. It never prints secret values.

Back up `APP_ENCRYPTION_KEY` separately. If it is lost, saved model API keys cannot be decrypted.

## Backup

Stop the application and back up:

```text
data/research-agent.sqlite
```

If WAL files exist, include them too:

```text
data/research-agent.sqlite-shm
data/research-agent.sqlite-wal
```

A safer option is to use SQLite's online backup functionality, or stop the container before copying the complete `app_data` volume.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_PATH` | SQLite file path |
| `AUTH_MODE` | `owner` or `none`; defaults to `owner` |
| `SESSION_COOKIE_SECURE` | Set to `true` for HTTPS |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte AES master key |
| `SEARCH_PROVIDER` | `searxng` or `bing` |
| `SEARXNG_URL` | SearXNG address |
| `NEXT_PUBLIC_APP_TITLE` | Application title |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Application description |
| `ADMIN_EMAIL` | Initial administrator email |
| `ADMIN_NAME` | Initial administrator name |
| `ADMIN_PASSWORD` | Initial administrator password; remove after setup |
| `APP_PORT` | Docker host port; defaults to `3000` |

## Verification

```bash
npm run privacy:check
npm run typecheck
npm run lint
bun test
npm run build
```

## Project Structure

```text
src/app/                 Pages and API routes
src/components/          Shared UI components
src/i18n/                English and Chinese copy
src/lib/auth/            Login, password, and session logic
src/lib/db/              SQLite, Drizzle schema, migrations, and queries
src/lib/llm/             OpenAI-compatible client and key encryption
src/lib/research/        Research pipeline, search, and report export
scripts/create-admin.ts  Administrator initialization
scripts/check-privacy.mjs Privacy check for open-source releases
```

## Security Notes

- Use HTTPS for public deployments
- Keep `owner` mode enabled for public deployments
- Never commit `.env`, SQLite files, or backup directories
- Never enable `AUTH_MODE=none` on an untrusted network
- Active jobs live in the current process; multi-instance deployments need shared rate limits and durable job workers
- Web content is untrusted input; AI evidence review is not equivalent to human fact-checking

## Contributing

Issues and pull requests are welcome. Before opening a pull request, ensure:

- `npm run privacy:check` passes
- `npm run typecheck` passes
- `npm run lint` passes
- `bun test` passes
- `npm run build` passes

## License

This project is licensed under the [MIT License](LICENSE).
