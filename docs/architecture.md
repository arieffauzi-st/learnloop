# LearnLoop — Architecture

**Status:** Approved (Architect output) · **Stack:** React (Vite + TS + Tailwind) · FastAPI · SQLite · Keycloak (OIDC)
**Related:** [requirements.md](requirements.md) · [mockup-spec.md](mockup-spec.md) · [roadmap.md](roadmap.md)

## 1. Overview

LearnLoop is a homework & class-progress platform with three roles (student, teacher, parent) plus a public enrollment funnel. This is a portfolio MVP: single deployable backend, single SQLite file, self-hosted Keycloak as the identity provider. The design optimizes for (a) demonstrating full-stack judgment — auth, role-based authorization, data integrity on submissions — and (b) a one-evening build.

```
                     ┌─────────────────────────────┐
   Browser ──────────►  React SPA (Vite + TS +      │
                     │  Tailwind) — static files   │
                     └──────────┬──────────────────┘
                                │ JSON over HTTPS
                                │ (OIDC access token in
                                │  Authorization header)
                     ┌──────────▼──────────────────┐
                     │  FastAPI (uvicorn)          │
                     │  /api/v1 — routers per      │
                     │  domain, Pydantic schemas   │
                     │  authn: JWT validation      │
                     │  authz: role dependencies   │
                     └───────┬─────────────┬───────┘
                             │             │
                  ┌──────────▼───┐   ┌─────▼──────────────┐
                  │ SQLite       │   │ Keycloak (Docker)  │
                  │ (WAL mode,   │   │ realm: learnloop   │
                  │ single file) │   │ realm-export.json  │
                  └──────────────┘   └────────────────────┘
```

## 2. Stack decisions & rationale

| Decision | Choice | Why (and what we gave up) |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | Fast DX, type safety against a hand-written API client. |
| Backend | FastAPI (Python) | Pydantic validation ≈ cheap data integrity; auto OpenAPI docs are portfolio eye-candy; async-friendly. |
| Database | SQLite (single file, WAL mode) | Zero ops; fine for single-writer MVP. Non-goal: Postgres. All timestamps stored **UTC**. |
| Identity | Self-hosted Keycloak, realm `learnloop`, config shipped as `realm-export.json` | Real OIDC flows (auth code + PKCE), real role management, and the export file doubles as documentation. Rationale over rolling our own JWT auth: education companies take auth seriously; demonstrating IdP integration is worth the ops cost. |
| Auth transport | Authorization: Bearer access token on every API call; SPA holds tokens in memory (no localStorage persistence) | Standard SPA + OIDC pattern. |
| Deployment | Frontend static (Vercel/Netlify), backend + Keycloak on one VPS behind Caddy (TLS) | Cheapest path to a public URL. |

## 3. Repository layout (monorepo)

```
learnloop/
├─ docs/                    # requirements, mockup-spec, architecture, roadmap
├─ keycloak/realm-export.json
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # FastAPI app, CORS, router mounting
│  │  ├─ core/config.py     # pydantic-settings (env: DB URL, Keycloak issuer, etc.)
│  │  ├─ core/security.py   # JWT verification (JWKS cache), role extraction
│  │  ├─ core/deps.py       # get_current_user, require_role(...)
│  │  ├─ db.py              # SQLAlchemy engine/session, WAL pragma
│  │  ├─ models.py          # ORM models (below)
│  │  ├─ schemas/           # Pydantic request/response models
│  │  └─ routers/           # auth.py classes.py assignments.py submissions.py
│  │  │                     # parents.py enrollment.py
│  ├─ tests/                # pytest + httpx TestClient, tmp SQLite per test
│  └─ pyproject.toml
├─ frontend/
│  ├─ src/
│  │  ├─ api/               # typed client generated from OpenAPI (openapi-typescript)
│  │  ├─ auth/              # OIDC context, token refresh, login redirect
│  │  ├─ pages/             # Login, TeacherDashboard, StudentDashboard,
│  │  │                     # ParentDashboard, JoinClass, Landing
│  │  └─ components/
│  └─ vite.config.ts        # dev proxy /api → :8000
└─ docker-compose.yml       # keycloak + backend (dev)
```

## 4. Authentication & authorization

### 4.1 Flows (maps to A1–A3)

- **Signup (A1):** SPA redirects to Keycloak hosted login page (realm `learnloop`). Registration is enabled in the realm with a custom user attribute `role` (student/teacher/parent) captured on the registration form (Keycloak registration flow extension in the realm export). On first API call the backend **provisions a local profile row** keyed by the `sub` claim: `users(keycloak_sub, email, role, name)` — the local DB never stores passwords.
- **Login (A2):** Auth code + PKCE via the SPA; Keycloak issues access + refresh tokens. Access token carries realm role and the `role` attribute. SPA routes to the dashboard matching the token role; backend `require_role` enforces it anyway.
- **Parent–child link (A3):** Student dashboard exposes a **link code** (8 chars, distinct from the 6-char class join code). Parent enters it → backend creates a `parent_children` row. Parents manage links themselves (no teacher involvement); a student can rotate/revoke their code.

### 4.2 Backend authorization model

No database-level RLS (SQLite has none) — authorization is enforced in one place, explicitly:

- `get_current_user` dependency: validates JWT signature against Keycloak's JWKS (cached, auto-refresh), checks `iss`/`aud`/`exp`, upserts the local profile, returns a `User(sub, role, id)` object.
- `require_role("teacher")` and friends: dependency factories on every router.
- **Ownership checks are query-level**: every query is filtered by the caller's identity (e.g. teacher queries `Assignment WHERE class.teacher_id = me`). A wrong-role or out-of-scope request returns `403` with a generic body — no existence leaks.
- Backend never trusts the token's `role` alone for writes that mutate role-scoped data — the local profile's role is the source of truth, refreshed on login.

### 4.3 Token handling in the SPA

In-memory access token + silent refresh via refresh token (Keycloak session cookie). 401 handling: one refresh attempt, then redirect to login. Route guards match `role` claim to route role; server errors remain the real gate.

## 5. Data model

SQLite via SQLAlchemy 2.0. All FKs `ON DELETE CASCADE` except `parent_children` which cascades on unlink only.

```
users            id PK · keycloak_sub UNIQUE · email · name · role CHECK(student|teacher|parent) · created_at

classes          id PK · teacher_id FK users · name · join_code CHAR(6) UNIQUE · created_at
enrollments      id PK · class_id FK · student_id FK · joined_at
                 UNIQUE(class_id, student_id)

assignments      id PK · class_id FK · title · instructions · due_at (UTC)
submissions      id PK · assignment_id FK · student_id FK · text · link_url NULL
                 · submitted_at (UTC, server-set) · is_late BOOL · version INT
                 UNIQUE(assignment_id, student_id)      ← one row per (assignment, student)

parent_links     id PK · parent_id FK users · student_id FK · created_at
                 UNIQUE(parent_id, student_id)          ← cap: ≤3 children per parent (app-enforced)
link_codes       student_id PK/FK users · code CHAR(8) UNIQUE · rotated_at

trial_requests   id PK · parent_name · email · child_age · created_at · status DEFAULT('new')
```

### 5.1 Submission integrity (S3 — the data-integrity point)

- `submitted_at` and `is_late` are **server-computed, never client-supplied**: `is_late = submitted_at > due_at` (UTC comparison) at write time. A late submission is stored and flagged — never silently accepted as on-time.
- **Latest-wins resubmit:** one row per (assignment, student); resubmit is an UPDATE that overwrites text/link, bumps `version`, recomputes `submitted_at`/`is_late`, and preserves the *earliest* `submitted_at` in a `first_submitted_at` column so "was ever late" and "currently late" are both answerable. (If we decide earliest-late should stick for grading fairness, T3 uses `first_submitted_at` for the late flag — decision recorded here, trivially changeable.)
- Optimistic concurrency: UPDATE ... WHERE version = :expected returns 409 on race, client refetches. Rare in practice, cheap to have.
- Teacher submission list (T3) is a LEFT JOIN of enrollments × assignments × submissions giving `submitted / late / missing` per student in one query.

### 5.2 XP & streaks (S4/P2)

Derived, not stored as truth: `xp = 10 × on_time_submissions + 5 × late_submissions`, streak = consecutive assignments with a submission by due date. Computed in a small `progress.py` service from submissions; if it ever needs to persist (badges, history), a `progress_events` append-only table is the extension point — not an in-place counter.

## 6. API surface (`/api/v1`)

```
GET   /me                                → profile for current token (any role)
POST  /me/link-code                      (student) rotate link code
GET   /me/link-code                      (student)

POST   /classes                          (teacher) create class → join code
GET    /classes                          (teacher|student) own classes
POST   /classes/{id}/assignments         (teacher, owner) T2; 422 if due_at in past
GET    /classes/{id}/assignments         (teacher owner | enrolled student)
GET    /assignments/{id}/submissions     (teacher owner) T3: roster + status

POST   /classes/join {join_code}         (student) S1; 404 unknown, 409 already joined
POST   /assignments/{id}/submit          (student enrolled) S3; server stamps time
PUT    /assignments/{id}/submit          (student) resubmit, latest-wins

GET    /parent/children                  (parent)
GET    /parent/children/{id}/summary     (parent, linked only) P1+P2 payload
POST   /parent/link {link_code}          (parent) A3

POST   /enrollment/trial                 (public) E1; validation + simple IP rate limit
GET    /health                           (public)
```

Conventions: JSON only; errors as `{detail: str}`; timestamps ISO-8601 UTC; all list endpoints scoped by the caller's role. Public landing page + form are part of the SPA (no SSR), hitting only `/enrollment/trial` and `/health` unauthenticated.

## 7. Frontend architecture

- **Routing:** react-router; role-matched routes (`/teacher/*`, `/student/*`, `/parent/*`, public `/` and `/login`). Guards read the OIDC context; the API remains the authority.
- **State:** server state via TanStack Query (per-endpoint query keys, mutation + invalidate on submit). No global client store beyond auth context — the app is CRUD-shaped.
- **API client:** generated from FastAPI's OpenAPI schema with openapi-typescript, wrapped in a small fetch layer that attaches the bearer token and centralizes 401 handling.
- **UI:** Tailwind + component set per mockup-spec.md; XP bar / streak / confetti are presentational components fed by `/me`-adjacent progress endpoints (P2 reuses the same XP-bar component as S4).
- **Build:** Vite; dev proxy `/api` → `localhost:8000`; production build is static files.

## 8. Keycloak realm design (`keycloak/realm-export.json`)

- Realm `learnloop`; public OIDC client `learnloop-web` (SPA, standard flow + PKCE, no client secret, redirect URIs locked to deployed origins + localhost dev).
- Registration form extended with a required `role` attribute (radio: student/teacher/parent) via a simple registration-flow tweak in the export; `role` is added to the ID/access token as a user attribute claim.
- Password policy: length ≥ 10. No email verification for MVP (non-goal: email delivery) — documented as a known gap for production.
- The export file is the single source of truth: `docker compose up` mounts it into Keycloak's `--import-realm`, so reviewers can reproduce the IdP in one command.

## 9. Cross-cutting concerns

- **Config:** pydantic-settings; required env: `DATABASE_URL`, `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, `CORS_ORIGINS`, `JOIN_CODE_PEPPER` (optional). No secrets in repo.
- **CORS:** explicit origin allowlist (Vercel origin + localhost dev).
- **Validation:** Pydantic everywhere; `due_at` future-check at T2 creation; enrollment form validates email + age 3–18.
- **Rate limiting (E1):** naive in-memory per-IP counter on `/enrollment/trial` (e.g. 5/hour) — documented as non-durable, replaced by a real limiter when there's more than one backend instance.
- **Logging:** uvicorn access logs + a request-ID middleware; no PII beyond the request path.
- **Testing:** pytest with an isolated SQLite per test (fixtures reset schema); tests target the acceptance criteria by ID — esp. late-flag integrity (S3), ownership 403s (A1/T2), parent scoping (A3/P1), and a join→submit→parent-view happy path.
- **Migration story:** for MVP, `Base.metadata.create_all` on startup + a seed script (`backend/seed.py`) for demo data. Alembic is the first thing to add if the schema evolves beyond the demo.

## 10. Deployment topology

```
VPS:  Caddy (TLS, reverse proxy)
        ├─ /            → static SPA build
        ├─ /api/*       → uvicorn (FastAPI, 127.0.0.1:8000)
        └─ /auth/*      → Keycloak container (8080), realm-import on boot
      SQLite file on a host volume (+ nightly file backup cron)
SPA on Vercel (optional alternative) with VITE_API_BASE / VITE_OIDC_ISSUER at build time.
```

## 11. Known trade-offs & what we'd do next

- **SQLite, single writer** — fine for demo traffic; Postgres is the first production move (SQLAlchemy keeps this a config swap).
- **In-app authz (no RLS)** — requirements originally mentioned RLS; with SQLite the equivalent guarantee lives in query-scoping + dependency-based role checks, centralized and tested. Postgres + RLS revisited in roadmap.
- **No email verification / password reset emails** — Keycloak supports both; deferred only because email delivery is a non-goal.
- **Derived XP not persisted** — recompute is cheap at MVP scale; persist events before adding leaderboards.
- **Manual multi-instance concerns** (rate limit, SQLite) — acceptable for a single-node portfolio deploy.

See [roadmap.md](roadmap.md) for the ordered "build next" list.
