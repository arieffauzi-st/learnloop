/** Hand-drawn-style inline SVG character accents for the landing page.
 *  Pure SVG, no image assets — cheap to render, crisp on every DPR. */

interface BuddyProps {
  className?: string
}

/** Folded-paper blob buddy with eyes (used as the 3D scene fallback + accents). */
export function PaperBuddySvg({ className }: BuddyProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Paper buddy character">
      {/* body */}
      <path
        d="M60 12 C88 12 104 34 104 60 C104 90 86 106 60 106 C34 106 16 90 16 60 C16 34 32 12 60 12 Z"
        fill="#FFD93D"
        stroke="#3A2E39"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* paper fold */}
      <path d="M40 84 L60 96 L80 84 L60 72 Z" fill="#FF6B6B" stroke="#3A2E39" strokeWidth="3" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="45" cy="48" r="6" fill="#3A2E39" />
      <circle cx="75" cy="48" r="6" fill="#3A2E39" />
      {/* cheeks */}
      <circle cx="32" cy="62" r="4.5" fill="#FF6B6B" opacity="0.7" />
      <circle cx="88" cy="62" r="4.5" fill="#FF6B6B" opacity="0.7" />
    </svg>
  )
}

/** Star buddy with a happy face (features-strip accent). */
export function StarBuddySvg({ className }: BuddyProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Star buddy character">
      <path
        d="M60 8 L74 42 L110 46 L83 70 L91 106 L60 87 L29 106 L37 70 L10 46 L46 42 Z"
        fill="#FF6B6B"
        stroke="#3A2E39"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="54" r="4.5" fill="#3A2E39" />
      <circle cx="70" cy="54" r="4.5" fill="#3A2E39" />
      <path d="M50 66 Q60 76 70 66" fill="none" stroke="#3A2E39" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

/** Small round rocket buddy (demo-CTA accent). */
export function RocketBuddySvg({ className }: BuddyProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Rocket buddy character">
      <path
        d="M60 10 C80 26 86 52 82 78 L38 78 C34 52 40 26 60 10 Z"
        fill="#4ECDC4"
        stroke="#3A2E39"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="44" r="10" fill="#FFF9F0" stroke="#3A2E39" strokeWidth="3.5" />
      <path d="M38 66 L22 86 L40 84 Z" fill="#FF6B6B" stroke="#3A2E39" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M82 66 L98 86 L80 84 Z" fill="#FF6B6B" stroke="#3A2E39" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M52 86 Q60 100 68 86 Z" fill="#FFD93D" stroke="#3A2E39" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}
