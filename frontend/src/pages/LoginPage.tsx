import { useAuth } from 'react-oidc-context'
import { Navigate } from 'react-router-dom'
import { useState } from 'react'

const ROLES = [
  { role: 'student', emoji: '🎒', label: 'Student' },
  { role: 'parent', emoji: '🏡', label: 'Parent' },
  { role: 'teacher', emoji: '📚', label: 'Teacher' },
]

/** Login page (Stitch design: design/stitch/login). Real authentication is
 *  delegated to Keycloak via OIDC redirect; the role picker pre-selects the
 *  registration role for the signup flow. */
export default function LoginPage() {
  const auth = useAuth()
  const [picked, setPicked] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  if (auth.isAuthenticated) return <Navigate to="/dashboard" replace />

  const signup = () => {
    // Realm-scoped registration endpoint (issue #73): the Keycloak realm admin
    // console path is not user-facing; the correct client-initiated registration
    // redirect is {issuer}/protocol/openid-connect/registrations.
    const issuer =
      import.meta.env.VITE_KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/learnloop'
    const url = new URL(issuer + '/protocol/openid-connect/registrations')
    url.searchParams.set('client_id', 'learnloop-web')
    url.searchParams.set('redirect_uri', window.location.origin + '/login')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid')
    if (picked) url.searchParams.set('ui_locales', 'en')
    window.location.href = url.toString()
  }

  return (
    <main className="min-h-screen bg-cream font-body text-ink flex items-center justify-center overflow-hidden">
      {/* Ambient decorative glows */}
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-teal/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-coral/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-sunny/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col items-center relative z-10 p-4 md:p-6">
        {/* Branding header */}
        <header className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-3 mb-1">
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
          <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <span className="text-xs font-semibold text-muted flex items-center gap-1">
              Homework that feels like play <span className="text-sunny">✨</span>
            </span>
          </div>
        </header>

        {/* Mode pill switcher */}
        <nav
          aria-label="Authentication mode"
          className="w-full max-w-sm mb-6 bg-warm p-1 rounded-full flex shadow-sm border border-border-soft"
        >
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 px-4 rounded-full font-display text-sm font-bold text-center transition-all ${
              mode === 'signin' ? 'bg-white text-coral shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Sign in 🎒
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 px-4 rounded-full font-display text-sm font-bold text-center transition-all ${
              mode === 'signup' ? 'bg-white text-coral shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Create account 🌱
          </button>
        </nav>

        {/* Auth card */}
        <div className="w-full bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-border-soft">
          <div className="mb-6 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal/15 text-teal-dark font-display text-xs font-bold mb-1">
              <span>🌟</span> Adventure awaits!
            </div>
            <h1 className="font-display text-3xl font-bold text-ink">
              Welcome back! <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-muted mt-1">
              {mode === 'signin'
                ? 'Sign in to continue your learning adventure today.'
                : 'Create your account and join the fun.'}
            </p>
          </div>

          {/* Role selector */}
          <div className="flex items-center gap-2 mb-6 bg-warm p-1.5 rounded-2xl border border-border-soft">
            <span className="text-xs font-semibold text-muted pl-2">I am a:</span>
            <div className="flex-1 flex gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setPicked(r.role)}
                  aria-pressed={picked === r.role}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-1 transition-all ${
                    picked === r.role
                      ? 'bg-white text-coral shadow-sm'
                      : 'text-muted hover:bg-white/60'
                  }`}
                >
                  <span>{r.emoji}</span> {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => (mode === 'signin' ? void auth.signinRedirect() : signup())}
            disabled={!picked && mode === 'signup'}
            className="btn-push-coral w-full h-12 rounded-full bg-coral text-white font-display text-base font-bold disabled:opacity-40 disabled:shadow-none"
          >
            {mode === 'signin'
              ? 'Let’s go! 🚀'
              : picked
                ? `Continue as ${picked.toLowerCase()} →`
                : 'Pick a role to continue'}
          </button>

          <p className="text-xs text-muted text-center mt-4">
            You’ll be redirected to our secure sign-in page.
          </p>
        </div>
      </div>
    </main>
  )
}
