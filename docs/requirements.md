# LearnLoop — Requirements (MVP, one-night portfolio build)

**Stack (revised):** React (Vite + TypeScript + Tailwind) frontend, FastAPI (Python) backend, SQLite database. Mockup-first workflow: UI design spec (docs/mockup-spec.md) → Stitch mockups → build.

Target role context: Full-stack engineer for an education platform (Ottodot-style):
Roblox game library exists elsewhere; this project is the **platform layer** around it.
Out of scope on purpose: game content, grading engines, payments. See docs/roadmap.md for "what we'd build next".

## Roles (users)
- **Teacher**: creates classes, creates assignments, reviews submissions.
- **Student**: joins class via code, views & submits homework.
- **Parent**: views linked child's progress (read-only).
- *(Admin/ops is deferred — roadmap.)*

## User stories & acceptance criteria

### Auth & accounts
- A1. As any user, I can sign up with email/password and pick my role (student / teacher / parent).
  - AC: role stored in profile; RLS enforces role-scoped access; wrong-role access returns error.
- A2. As a user, I can log in and see only the dashboard for my role.
- A3. As a parent, I can link to my child via the child's link code.
  - AC: parent sees only linked children's data. RLS verified.

### Teacher workflows
- T1. As a teacher, I can create a class and get a join code (6 chars).
- T2. As a teacher, I can create assignments (title, instructions, due date) in my class.
  - AC: only the owning teacher can edit; due date cannot be in the past at creation.
- T3. As a teacher, I can see a submission list per assignment (submitted / late / missing per student).

### Student workflows
- S1. As a student, I can join a class with a join code.
- S2. As a student, I see my assignments with status (todo / submitted / late) and due date.
- S3. As a student, I can submit homework (text + optional link) before the due date.
  - AC: one submission per assignment (latest wins on resubmit); server records submitted_at; late submissions flagged, never silently accepted as on-time (data integrity point).
- S4. *(Playful polish)* Submitting shows confetti + streak counter; dashboard has XP-style progress bar.

### Parent workflows
- P1. As a parent, I see my child's classes, assignments and submission status.
- P2. As a parent, I see streak/XP summary — "level up" presentation, not a dry table.

### Enrollment funnel (bonus, matches job desc)
- E1. Public landing page explaining the product with a "Book a trial class" form (name, email, child's age) saved to DB.
  - AC: validation + rate-limit-ish guard; visible to ops via a simple /admin (deferred if time runs out — form data still persists).

## Non-goals (MVP)
- Real-time chat, notifications, email delivery, payments/billing, file uploads, multiple children per parent > 3, mobile app.

## Success criteria for the night
- Deployed on Vercel with public URL, seeded demo data, README with screenshots + architecture notes + RLS explanation.
- All critical paths tested manually end-to-end (teacher→assignment→student submit→parent view).
