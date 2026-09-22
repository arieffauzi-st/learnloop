# LearnLoop 🎒

A warm homework & class-progress platform for three roles — **student**, **teacher**, **parent** — plus a public enrollment funnel.

**Stack:** React (Vite + TS + Tailwind) · FastAPI (uv) · SQLite (WAL) · Keycloak (OIDC, PKCE) · Jenkins CI · Docker Compose + Caddy

## Features

- **Teacher:** classes with join codes, assignments (future-due validated), submission roster (submitted / late / missing)
- **Student:** join classes, submit/resubmit (latest-wins, server-stamped timestamps), XP & streaks, parent link code
- **Parent:** link to children via code, read-only progress summary (level, streak, per-class XP bars, missing work)
- **Public:** trial-class enrollment form (validated, rate-limited)
- **Auth:** Keycloak hosted login, JWT (RS256 via JWKS), role-based access enforced server-side

## Quick start (dev)

```bash
docker compose up          # keycloak :8080 · backend :8000 · frontend :5173
```

Demo users (realm `learnloop`, import happens on Keycloak boot):
`teacher-demo` / `student-demo` / `parent-demo` — password `demo-password`.

Backend tests:

```bash
cd backend && uv sync --group dev && uv run pytest -q
```

## Production deploy (fresh VPS runbook)

Prereqs: Docker + Compose plugin, a domain pointing at the VPS.

```bash
git clone https://github.com/arieffauzi-st/learnloop && cd learnloop
cp .env.example .env          # set DOMAIN + admin password
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy terminates TLS automatically (Let's Encrypt). Keycloak is available at `https://<domain>` (hosted pages) — to reach the admin console, port-forward or add a Caddy route for `/auth/admin/*` temporarily.

### Keycloak setup

1. `keycloak/realm-export.json` is auto-imported on first boot (`--import-realm`).
2. It contains: client `learnloop-web` (public, PKCE S256), realm roles student/teacher/parent, role→token-claim mapper, demo users.
3. For production, change demo passwords or delete them after creating real accounts.

### Frontend env

`VITE_KEYCLOAK_ISSUER` (e.g. `https://auth.example.com/realms/learnloop`) and `VITE_API_URL` (e.g. `https://example.com/api/v1`) at build time.

## Architecture

Single deployable backend, one SQLite file, self-hosted Keycloak. Full details in [`docs/architecture.md`](docs/architecture.md) (ERD, permission model, API contract).

**Authorization (RLS-analog):** SQLite has no row-level security, so authorization is enforced explicitly in one place — every query is filtered by the caller's identity (`classes.teacher_id == me`, `parent_links.parent_id == me`), wrong-role → 403, out-of-scope → **404** (no existence leaks). Server-stamped `submitted_at` + computed `is_late` keep submission integrity out of client hands; latest-wins resubmits preserve `first_submitted_at` and bump `version` (409 on race).

**Multi-agent workflow:** this repo is built by role-based AI agents (PO → analyst → architect → dev → reviewer) coordinating through GitHub issues/PRs and this project's conventions — see the PR templates and issue labels (`role:*`) for the audit trail.

## CI

Jenkins (`Jenkinsfile`): backend `ruff` + `pytest` · frontend `tsc` + `vitest` + `build` · `docker compose config` validation — on every PR and push to `main`.


## Security notes

- No secrets live in this repository — all configuration is 12-factor via environment variables (see `.env.example`).
- The demo accounts (`*-demo` / `demo-password`) are **intentional** for trying the live demo; they contain only seeded data and cannot access real users (sub re-linking is restricted, see issue #58).
- Backend authorization is enforced server-side per role; JWTs are RS256 validated against Keycloak's JWKS.
- Before forking for production: rotate all demo credentials, remove demo users from `keycloak/realm-export.json`, and set a strong `KC_ADMIN_PASSWORD`.
