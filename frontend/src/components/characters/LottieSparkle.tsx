/** LottieSparkle: tiny looping sparkle micro-animation rendered via lottie-react.
 *  lottie-web is heavy (~300KB), so it is lazy-loaded in its own chunk and a
 *  static SVG star is shown until it loads. Animation data is a hand-authored
 *  lottie JSON bundled locally in src/assets/sparkle-lottie.json (no network
 *  fetch, no third-party license concerns — ~2KB star-pulse + bouncing dot,
 *  2s loop @30fps). */
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'

// lottie-react's default export breaks under production ESM interop (React #306:
// 'Element type is invalid... got object'), which unmounts the whole app. Resolve
// the actual component function defensively — the interop shape differs between
// dev (named/default) and the minified prod chunk (nested .default.default).
type LottieComponentType = ComponentType<Record<string, unknown>>
const Lottie = lazy(async (): Promise<{ default: LottieComponentType }> => {
  const m: unknown = await import('lottie-react')
  const mod = m as { default?: unknown; Lottie?: unknown }
  const candidate =
    typeof mod.Lottie === 'function'
      ? mod.Lottie
      : typeof mod.default === 'function'
        ? mod.default
        : (mod.default as { default?: unknown } | undefined)?.default
  if (typeof candidate !== 'function') {
    throw new Error('lottie-react: could not resolve component export')
  }
  return { default: candidate as LottieComponentType }
})
const sparkleDataPromise = import('../../assets/sparkle-lottie.json')

interface LottieSparkleProps {
  className?: string
  /** Loop infinitely when true (default); a fixed loop count otherwise. */
  loop?: boolean
}

/** Static stand-in while the lottie chunk loads (and for no-JS/motion-off). */
function SparkleFallback({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M50 12 L59 41 L88 50 L59 59 L50 88 L41 59 L12 50 L41 41 Z"
        fill="#FFD93D"
        stroke="#3A2E39"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LottieSparkle({ className, loop = true }: LottieSparkleProps) {
  return (
    <span data-lottie-sparkle className={`inline-flex ${className ?? ''}`}>
      <Suspense fallback={<SparkleFallback className="w-full h-full" />}>
        <LottieWithAnimationData loop={loop} />
      </Suspense>
    </span>
  )
}

function LottieWithAnimationData({ loop }: { loop: boolean }) {
  const [animationData, setAnimationData] = useState<object | null>(null)
  useEffect(() => {
    let active = true
    sparkleDataPromise.then((m) => {
      if (active) setAnimationData(m.default)
    })
    return () => {
      active = false
    }
  }, [])
  if (!animationData) return <SparkleFallback className="w-full h-full" />
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay
      aria-hidden="true"
      className="w-full h-full"
    />
  )
}
