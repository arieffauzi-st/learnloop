import { Link } from 'react-router-dom'

const DEMO_ROLES = [
  { role: 'student', emoji: '🎒', label: 'Try as Student', color: 'bg-coral', push: 'btn-push-coral' },
  { role: 'teacher', emoji: '📚', label: 'Try as Teacher', color: 'bg-teal', push: 'btn-push-teal' },
  { role: 'parent', emoji: '🏡', label: 'Try as Parent', color: 'bg-lilac', push: '' },
]

const FEATURES = [
  {
    emoji: '🎮',
    title: 'Gamified missions',
    body: 'Students turn homework into quests and earn rewards as they level up.',
  },
  {
    emoji: '🛠️',
    title: 'Teacher ops console',
    body: 'Teachers create missions and see class progress in one calm console.',
  },
  {
    emoji: '👀',
    title: 'Glanceable parent view',
    body: 'Parents get a warm at-a-glance view of how their kid is doing.',
  },
]

/** Public landing page ("/") for anonymous visitors, styled after the Stitch
 *  landing mockup (design/stitch/landing). Signed-in users never see this —
 *  the root route redirects them to their role dashboard. */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cream font-body text-ink overflow-hidden">
      {/* Ambient decorative glows */}
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-teal/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-coral/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-sunny/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center text-center">
        {/* Hero */}
        <header className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center">
              <img alt="LearnLoop logo" className="w-full h-full object-contain" src="/assets/logo.png" />
            </div>
            <div className="text-left">
              <span className="font-display text-3xl font-bold text-coral block leading-none tracking-tight">
                LearnLoop
              </span>
              <span className="font-display text-xs font-bold text-teal-dark tracking-widest uppercase">
                Kids &amp; School Hub
              </span>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Homework that feels like <span className="text-coral">play</span> <span className="inline-block">✨</span>
          </h1>
          <p className="text-muted mt-4 max-w-xl text-lg leading-relaxed">
            Missions, rewards and happy loops — the school hub where kids want to
            do their homework, and teachers and parents can see it all at a glance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/login"
              className="btn-push-coral px-8 py-3 rounded-full bg-coral text-white font-display font-bold"
            >
              Sign in 🎒
            </Link>
            <Link
              to="/login"
              className="btn-push-teal px-8 py-3 rounded-full bg-teal text-white font-display font-bold"
            >
              Create account 🌱
            </Link>
          </div>
        </header>

        {/* Features strip */}
        <section aria-label="Features" className="grid md:grid-cols-3 gap-4 w-full mt-12">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-6 text-left shadow-sm border border-border-soft"
            >
              <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center text-2xl shadow-inner mb-3">
                {f.emoji}
              </div>
              <h2 className="font-display text-lg font-bold">{f.title}</h2>
              <p className="text-muted text-sm mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Demo CTAs */}
        <section aria-label="Try the demo" className="w-full mt-12">
          <h2 className="font-display text-2xl font-bold">Try the demo 👇</h2>
          <p className="text-muted mt-1">Pick a role and explore LearnLoop in action.</p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {DEMO_ROLES.map((d) => (
              <Link
                key={d.role}
                to={`/login?role=${d.role}`}
                className={`${d.color} ${d.push} text-white rounded-3xl px-6 py-5 font-display text-lg font-bold shadow-md hover:brightness-105 transition`}
              >
                {d.label} {d.emoji}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted mt-5">
            Demo accounts: student-demo / teacher-demo / parent-demo — password demo-password
          </p>
        </section>
      </div>
    </main>
  )
}
