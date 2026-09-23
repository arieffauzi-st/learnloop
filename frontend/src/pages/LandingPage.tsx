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
    <main className="min-h-screen bg-cream font-body text-ink overflow-hidden relative">
      {/* Ambient decorative glows (mock: layered overlapping blobs) */}
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-teal/20 blur-3xl pointer-events-none" />
      <div className="absolute top-48 -right-24 w-96 h-96 rounded-full bg-coral/30 blur-3xl pointer-events-none" />
      <div className="absolute top-[48rem] left-1/3 w-80 h-80 rounded-full bg-lilac/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-sunny/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center text-center">
        {/* Hero */}
        <header className="flex flex-col items-center w-full">
          <nav aria-label="Main navigation" className="w-full flex justify-end mb-2">
            <Link
              to="/games"
              className="btn-push-coral px-5 py-2.5 min-h-[44px] rounded-full bg-coral text-white font-display font-bold flex items-center gap-2 shadow-md"
            >
              <span aria-hidden>🎮</span> Games
            </Link>
          </nav>
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
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Homework that feels like <span className="text-coral">play</span> <span className="inline-block">✨</span>
          </h1>
          <p className="text-muted mt-4 max-w-xl text-lg leading-relaxed">
            Missions, rewards and happy loops — the school hub where kids want to
            do their homework, and teachers and parents can see it all at a glance.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-6 w-full sm:w-auto">
            <Link
              to="/login"
              className="btn-push-coral px-8 py-3 min-h-[44px] rounded-full bg-coral text-white font-display font-bold flex items-center justify-center gap-2"
            >
              Sign in <span>🎒</span>
            </Link>
            <Link
              to="/login"
              className="btn-push-teal px-8 py-3 min-h-[44px] rounded-full bg-teal text-white font-display font-bold flex items-center justify-center gap-2"
            >
              Create account <span>🌱</span>
            </Link>
          </div>
          {/* Social proof cluster (mock: overlapping emoji avatars) */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex -space-x-2">
              <div className="w-9 h-9 rounded-full bg-teal/80 flex items-center justify-center text-sm shadow-md">🎒</div>
              <div className="w-9 h-9 rounded-full bg-sunny/80 flex items-center justify-center text-sm shadow-md">🌟</div>
              <div className="w-9 h-9 rounded-full bg-coral/60 flex items-center justify-center text-sm shadow-md">🚀</div>
            </div>
            <span className="font-display text-2xl font-bold text-coral -rotate-3 inline-block">✨</span>
          </div>
        </header>

        {/* Main Game teaser (above the fold, first section after the hero) */}
        <section
          aria-label="Play games"
          className="w-full max-w-3xl mt-10 md:mt-12"
        >
          <Link
            to="/games"
            className="group block bg-gradient-to-br from-coral via-sunny to-teal rounded-[2rem] p-8 md:p-12 shadow-lift text-white text-center sm:text-left hover:-translate-y-1.5 hover:brightness-105 transition"
          >
            <div className="flex flex-col sm:flex-row items-center gap-5 md:gap-7">
              <span
                className="text-7xl md:text-8xl drop-shadow-lg group-hover:scale-110 transition-transform"
                aria-hidden
              >
                📄⚔️
              </span>
              <div className="flex-1">
                <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight drop-shadow-sm">
                  New Game Zone! <span aria-hidden>🎉</span>
                </h2>
                <p className="font-semibold text-white/95 mt-2 text-lg md:text-xl leading-relaxed">
                  Fold it, hide your army, and strike — play{' '}
                  <strong>Paper War</strong> and more, right in your browser.
                </p>
              </div>
              <span className="shrink-0 px-8 py-4 min-h-[52px] rounded-full bg-coral text-white font-display text-xl font-bold shadow-lift flex items-center gap-2 ring-4 ring-white/60 group-hover:brightness-110 transition">
                Play now <span aria-hidden>▶</span>
              </span>
            </div>
          </Link>
        </section>

        {/* Hero gamified visual mockup (mock: floating quest card with sticker) */}
        <section aria-label="Product preview" className="relative w-full max-w-md mt-12">
          <div className="absolute -top-4 -right-2 sm:-right-4 px-4 py-1.5 rounded-full bg-sunny text-ink font-display text-xs font-bold shadow-md rotate-6 z-10">
            ⭐ Lv 5 Explorer
          </div>
          <div className="shadow-float rounded-3xl bg-white p-5 text-left border border-border-soft">
            <div className="flex items-center gap-3 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-warm flex items-center justify-center text-2xl shadow-inner">
                🧒
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold">Explorer</span>
                <span className="text-xs font-semibold text-teal-dark flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal inline-block" /> on an adventure
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sunny/30 text-amber-warm text-xs font-bold shadow-inner">
                🔥 7-day streak!
              </div>
            </div>
            <div className="bg-warm/70 rounded-2xl p-3 mb-4">
              <div className="flex justify-between items-center text-xs font-semibold text-muted mb-1.5">
                <span>Next milestone</span>
                <span className="text-coral font-bold">425 / 500 XP</span>
              </div>
              <div className="w-full h-4 bg-warm rounded-full overflow-hidden p-0.5 shadow-inner">
                <div className="h-full bg-gradient-to-r from-sunny to-coral rounded-full w-[85%]" />
              </div>
            </div>
            <div className="bg-cream rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center text-lg">🪐</div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold">Quest complete!</span>
                  <span className="text-xs text-muted">+25 XP earned ⭐</span>
                </div>
                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-teal/15 text-teal-dark">✓ Done</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features strip */}
        <section aria-label="Features" className="grid md:grid-cols-3 gap-4 w-full mt-12">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-6 text-left shadow-lift border border-border-soft hover:-translate-y-1.5 transition-transform duration-300"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-sm ${
                  ['bg-teal/20', 'bg-coral/15', 'bg-sunny/30'][i % 3]
                } ${i % 2 === 1 ? 'rotate-2' : '-rotate-2'}`}
              >
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {DEMO_ROLES.map((d) => (
              <Link
                key={d.role}
                to={`/login?role=${d.role}`}
                className={`${d.color} ${d.push} text-white rounded-3xl px-6 py-5 font-display text-lg font-bold shadow-lift hover:brightness-105 hover:-translate-y-1 transition flex items-center justify-between`}
              >
                <span>{d.label}</span>
                <span className="text-2xl -rotate-6 inline-block">{d.emoji}</span>
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
