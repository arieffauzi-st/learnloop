/** HeroIllustration: hand-crafted inline SVG meadow diorama (2D), following the
 *  Stitch landing mockups (design/stitch/landing): warm sky, soft layered
 *  hills, a cheerful big-eyed kid character in the coral/cream palette, and
 *  floating stars/leaves. Pure SVG — no images, no WebGL. */
interface HeroIllustrationProps {
  className?: string
}

export function HeroIllustration({ className }: HeroIllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 400"
      className={className}
      role="img"
      aria-label="Illustrated meadow scene with a cheerful kid character waving under a sunny sky"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF9F0" />
          <stop offset="100%" stopColor="#FFEBD6" />
        </linearGradient>
        <linearGradient id="hero-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CE0D8" />
          <stop offset="100%" stopColor="#4ECDC4" />
        </linearGradient>
        <linearGradient id="hero-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5ED9CF" />
          <stop offset="100%" stopColor="#3BB5AC" />
        </linearGradient>
      </defs>

      {/* Warm sky */}
      <rect x="0" y="0" width="480" height="400" rx="24" fill="url(#hero-sky)" />

      {/* Sun */}
      <g className="hero-float-slow" style={{ transformOrigin: '404px 70px' }}>
        <circle cx="404" cy="70" r="34" fill="#FFD93D" stroke="#3A2E39" strokeWidth="3" />
        <g stroke="#3A2E39" strokeWidth="3" strokeLinecap="round">
          <line x1="404" y1="20" x2="404" y2="10" />
          <line x1="404" y1="130" x2="404" y2="120" />
          <line x1="354" y1="70" x2="364" y2="70" />
          <line x1="444" y1="70" x2="454" y2="70" />
          <line x1="369" y1="35" x2="376" y2="42" />
          <line x1="432" y1="98" x2="439" y2="105" />
          <line x1="369" y1="105" x2="376" y2="98" />
          <line x1="432" y1="42" x2="439" y2="35" />
        </g>
      </g>

      {/* Clouds */}
      <g className="hero-float" fill="#FFFFFF" stroke="#3A2E39" strokeWidth="3" strokeLinejoin="round">
        <path d="M62 84 a20 20 0 0 1 38 -8 a16 16 0 0 1 26 8 Z" />
        <path d="M300 140 a16 16 0 0 1 30 -6 a13 13 0 0 1 22 6 Z" opacity="0.9" />
      </g>

      {/* Floating stars */}
      <g className="hero-float" style={{ transformOrigin: '96px 150px' }}>
        <path
          d="M96 138 L101 149 L113 150 L104 158 L107 170 L96 163 L85 170 L88 158 L79 150 L91 149 Z"
          fill="#FFD93D"
          stroke="#3A2E39"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
      <g className="hero-float-slow" style={{ transformOrigin: '150px 92px' }}>
        <path
          d="M150 84 L153.5 91 L161 92 L155.5 97 L157 105 L150 100.5 L143 105 L144.5 97 L139 92 L146.5 91 Z"
          fill="#FF6B6B"
          stroke="#3A2E39"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Back hills */}
      <path
        d="M0 250 Q80 170 170 235 Q260 165 350 230 Q420 185 480 235 L480 400 L0 400 Z"
        fill="url(#hero-hill-back)"
        stroke="#3A2E39"
        strokeWidth="3"
      />

      {/* Leaves drifting between hills */}
      <g className="hero-float-slow" style={{ transformOrigin: '330px 190px' }}>
        <path
          d="M330 178 q14 4 12 18 q-14 -4 -12 -18 Z"
          fill="#FFD93D"
          stroke="#3A2E39"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Front hills */}
      <path
        d="M0 300 Q120 240 240 292 Q360 240 480 296 L480 400 L0 400 Z"
        fill="url(#hero-hill-front)"
        stroke="#3A2E39"
        strokeWidth="3"
      />

      {/* Flowers + grass tufts on the front hill */}
      <g stroke="#3A2E39" strokeWidth="2.5" strokeLinecap="round">
        <line x1="70" y1="340" x2="70" y2="318" />
        <line x1="400" y1="350" x2="400" y2="328" />
        <line x1="330" y1="360" x2="330" y2="344" />
      </g>
      <g stroke="#3A2E39" strokeWidth="2.5" strokeLinejoin="round">
        <circle cx="70" cy="312" r="7" fill="#FF6B6B" />
        <circle cx="400" cy="322" r="7" fill="#FFD93D" />
        <circle cx="330" cy="338" r="6" fill="#FFF9F0" />
      </g>

      {/* Cheerful kid character (mascot) — big head, big eyes, coral shirt */}
      <g className="hero-mascot">
        {/* shadow */}
        <ellipse cx="228" cy="356" rx="62" ry="12" fill="#2D3436" opacity="0.12" />
        {/* legs */}
        <g stroke="#3A2E39" strokeWidth="3.5" strokeLinecap="round">
          <line x1="208" y1="322" x2="204" y2="352" />
          <line x1="250" y1="322" x2="254" y2="352" />
        </g>
        {/* shoes */}
        <ellipse cx="202" cy="356" rx="12" ry="7" fill="#3A2E39" />
        <ellipse cx="256" cy="356" rx="12" ry="7" fill="#3A2E39" />
        {/* waving arm */}
        <g className="hero-arm">
          <path
            d="M288 268 q28 -10 34 -34"
            fill="none"
            stroke="#3A2E39"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="324" cy="230" r="10" fill="#FBCBA4" stroke="#3A2E39" strokeWidth="3" />
        </g>
        {/* body: coral shirt */}
        <path
          d="M192 262 q-14 30 4 60 l62 0 q18 -30 4 -60 Z"
          fill="#FF6B6B"
          stroke="#3A2E39"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* other arm resting */}
        <path
          d="M190 268 q-18 16 -12 36"
          fill="none"
          stroke="#3A2E39"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* backpack strap detail */}
        <path d="M206 266 L218 320" stroke="#E05353" strokeWidth="7" strokeLinecap="round" />
        {/* head */}
        <circle cx="228" cy="212" r="58" fill="#FBCBA4" stroke="#3A2E39" strokeWidth="3.5" />
        {/* hair cap */}
        <path
          d="M172 202 a58 58 0 0 1 112 0 q-16 -14 -28 -6 q-12 -18 -30 -12 q-20 -6 -30 8 q-14 -2 -24 10 Z"
          fill="#5A4632"
          stroke="#3A2E39"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* big eyes */}
        <circle cx="208" cy="216" r="10" fill="#FFFFFF" stroke="#3A2E39" strokeWidth="2.5" />
        <circle cx="248" cy="216" r="10" fill="#FFFFFF" stroke="#3A2E39" strokeWidth="2.5" />
        <circle cx="210" cy="218" r="5" fill="#3A2E39" />
        <circle cx="250" cy="218" r="5" fill="#3A2E39" />
        <circle cx="212" cy="215" r="1.8" fill="#FFFFFF" />
        <circle cx="252" cy="215" r="1.8" fill="#FFFFFF" />
        {/* cheeks */}
        <circle cx="192" cy="232" r="6" fill="#FF6B6B" opacity="0.55" />
        <circle cx="264" cy="232" r="6" fill="#FF6B6B" opacity="0.55" />
        {/* smile */}
        <path
          d="M214 240 Q228 252 242 240"
          fill="none"
          stroke="#3A2E39"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/* Tiny paper buddy companion peeking from the hill */}
      <g className="hero-float" style={{ transformOrigin: '382px 268px' }}>
        <path
          d="M382 250 a22 22 0 0 1 22 22 l-44 0 a22 22 0 0 1 22 -22 Z"
          fill="#FFF9F0"
          stroke="#3A2E39"
          strokeWidth="3"
        />
        <circle cx="374" cy="268" r="3" fill="#3A2E39" />
        <circle cx="390" cy="268" r="3" fill="#3A2E39" />
        <path d="M376 277 Q382 282 388 277" fill="none" stroke="#3A2E39" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}
