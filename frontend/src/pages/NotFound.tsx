import { Link } from 'react-router-dom'

/** 404 page (issue #53). Fun but calm, per the Playful Warmth design tone. */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream font-body text-ink flex items-center justify-center p-4 relative overflow-hidden">
      <div className="relative overflow-hidden w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-border-soft text-center">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-12 w-44 h-44 bg-coral/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-warm flex items-center justify-center text-4xl shadow-inner mb-5">
            🧭
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Lost on the playground?</h1>
          <p className="text-muted mt-3 leading-relaxed">
            This page isn't part of the adventure. No worries — your quests are safe and sound.
          </p>
          <Link
            to="/dashboard"
            className="btn-push-teal mt-7 px-8 py-3 rounded-full bg-teal text-white font-display font-bold"
          >
            Back to my dashboard 🏠
          </Link>
        </div>
      </div>
    </main>
  )
}
