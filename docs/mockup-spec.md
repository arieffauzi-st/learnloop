# LearnLoop — UI Design Spec (for Stitch / AI mockup generation)

## Product one-liner
LearnLoop is a warm, playful homework & class-progress platform for elementary-age kids (7–12): teachers assign homework, kids submit it, parents watch progress like a game — not a spreadsheet.

## Design direction
- **Mood:** warm, friendly, low-clutter. Rounded corners (12–16px), soft shadows, generous whitespace.
- **Palette:** warm cream background (#FFF9F0), primary coral (#FF6B6B), secondary teal (#4ECDC4), accent sunny yellow (#FFD93D), dark text #2D3436. Kid-friendly but not childish — parents & teachers must take it seriously.
- **Typography:** rounded sans (e.g. Baloo 2 / Nunito) for headings, clean sans (Inter) for body.
- **Playful elements:** XP progress bars styled like game level bars, streak flames 🔥, confetti on homework submit, emoji badges.
- **Personas to design for:** Kid (student, big touch targets, minimal text), Teacher (efficient, list/table oriented), Parent (read-only, glanceable).

## Screens

### 1. Landing / Enrollment funnel (public)
- Hero: product name + tagline "Homework that feels like play", illustration area, CTA "Book a trial class".
- 3 feature cards (For Kids / For Parents / For Teachers) with icons.
- "Book a trial class" form section: parent name, email, child's age (number), submit button → success state with confirmation message.
- Footer: simple.

### 2. Auth
- Login page: email + password, role-agnostic (role resolved server-side).
- Signup: email, password, name, role picker as 3 illustrated cards (🎓 Student / 🍎 Teacher / 👨‍👩‍👧 Parent).

### 3. Student dashboard (kid view)
- Header: avatar, XP bar + level, streak flame counter.
- Card grid of enrolled classes (class color + emoji per class).
- Inside a class: assignment list as "quest cards" — title, due date chip (green=on time window, orange=due soon, red=late), status badge (todo ✏️ / done ✅).
- Assignment detail: instructions, textarea + optional link input, big "Turn in 🚀" button.
- On submit: full-screen confetti + "+10 XP" animation.

### 4. Teacher dashboard
- Header with teacher name; stat chips (classes, students, assignments due this week).
- Class list → class detail with two tabs:
  - **Assignments:** table (title, due, submitted/total, late count) + "New assignment" button → modal form (title, instructions, due date).
  - **Students:** table (name, streak, XP, submissions on-time %) — ops view.

### 5. Parent dashboard (read-only)
- Child selector (if >1 child; default single child).
- Summary card: level, streak, weekly submitted count.
- Per-class progress: XP bar per class, list of assignments with status chips (done ✅ / todo ✏️ / late ⚠️).
- Warm empty state if no submissions yet ("No homework yet — the adventure starts soon!").

## Components inventory
Button (primary/secondary), Card, StatusBadge (todo/done/late/due-soon), XPBar, StreakChip, Modal (assignment form, join class), Table, FormInput, JoinCodeBox (big letter-spacing code display), ConfettiOverlay, EmptyState.

## States to mock
Loading (skeleton), empty (per role), error (inline form errors), success (confetti / success banner).

## Notes for the AI generator
- Mobile-responsive: student view is primary on mobile; teacher tables can be desktop-first.
- Do not invent navigation beyond the screens listed; keep routing: /, /login, /signup, /student, /student/class/:id, /student/assignment/:id, /teacher, /teacher/class/:id, /parent, /book.
