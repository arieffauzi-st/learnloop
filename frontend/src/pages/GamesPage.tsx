import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPerangKertas } from '../games/perang-kertas/app'
import { createHangman } from '../games/hangman/app'
import { createMathQuiz } from '../games/math-quiz/app'

type GameCard = {
  id: string
  emoji: string
  title: string
  tagline: string
  gradient: string
}

const GAMES: GameCard[] = [
  {
    id: 'perang-kertas',
    emoji: '📄⚔️',
    title: 'Perang Kertas',
    tagline: 'Fold the paper, hide your soldiers, and hit the opponent stickmen! Take turns on one screen.',
    gradient: 'from-coral/80 via-sunny/70 to-teal/70',
  },
  {
    id: 'hangman',
    emoji: '🎩',
    title: 'Word Hangman 🎩',
    tagline: 'Guess the secret word letter by letter — use the hint, and keep the stickman safe! English only.',
    gradient: 'from-teal/80 via-teal/60 to-coral/70',
  },
  {
    id: 'math-quiz',
    emoji: '⚡',
    title: 'Quick Math ⚡',
    tagline: 'Beat the clock! 10 quick math questions — add, subtract, multiply. Win up to 3 stars!',
    gradient: 'from-sunny/80 via-coral/70 to-teal/70',
  },
]

/** Mount factories per game id — imperative mount with cleanup on unmount. */
const GAME_FACTORIES: Record<string, (root: HTMLElement, opts: { embedded: boolean; onHome: () => void }) => () => void> = {
  'perang-kertas': createPerangKertas,
  hangman: createHangman,
  'math-quiz': createMathQuiz,
}

/** Public kids' games hub at /games (no auth). Selecting a card mounts the
 *  game imperatively via createPerangKertas(root, opts) — cleanup on unmount. */
export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameCard | null>(null)
  const gameRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeGame || !gameRootRef.current) return
    const mount = GAME_FACTORIES[activeGame.id] ?? createPerangKertas
    const destroy = mount(gameRootRef.current, {
      embedded: true,
      onHome: () => setActiveGame(null),
    })
    return destroy
  }, [activeGame])

  return (
    <main className="min-h-screen bg-cream font-body text-ink overflow-x-hidden">
      {/* Ambient glows, matching the landing page */}
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-teal/20 blur-3xl pointer-events-none" />
      <div className="absolute top-48 -right-24 w-96 h-96 rounded-full bg-coral/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Game Zone <span className="inline-block">🎮</span>
            </h1>
            <p className="text-muted mt-1">Play while you learn — pick your favorite game!</p>
          </div>
          <Link
            to="/"
            className="btn-push-teal shrink-0 px-5 py-2.5 min-h-[44px] rounded-full bg-teal text-white font-display font-bold flex items-center gap-2"
          >
            ← Home
          </Link>
        </div>

        {activeGame ? (
          <section aria-label={activeGame.title} className="bg-white rounded-3xl shadow-lift border border-border-soft overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <span className="font-display font-bold text-lg">
                {activeGame.emoji} {activeGame.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveGame(null)}
                className="btn-push-teal px-5 py-2.5 min-h-[44px] rounded-full bg-teal text-white font-display font-bold flex items-center gap-2"
              >
                ← Games hub
              </button>
            </div>
            <div ref={gameRootRef} className="perang-kertas-host w-full" />
          </section>
        ) : (
          <section aria-label="Game list" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGame(g)}
                className={`text-left bg-gradient-to-br ${g.gradient} text-white rounded-3xl p-6 font-display shadow-lift hover:-translate-y-1.5 hover:brightness-105 transition min-h-[44px] flex flex-col gap-2`}
              >
                <span className="text-4xl" aria-hidden>
                  {g.emoji}
                </span>
                <span className="text-xl font-bold">{g.title}</span>
                <span className="text-sm font-semibold leading-relaxed opacity-95">{g.tagline}</span>
                <span className="mt-2 self-start px-4 py-2 min-h-[44px] rounded-full bg-white/25 text-sm font-bold flex items-center">
                  Play now ▶
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
