import { useAuth } from 'react-oidc-context'
import { Navigate } from 'react-router-dom'
import { useState } from 'react'

const ROLE_CARDS = [
  { role: 'student', emoji: '🎒', label: 'Siswa', desc: 'Kerjakan tugas & kumpulkan XP' },
  { role: 'teacher', emoji: '👩‍🏫', label: 'Guru', desc: 'Kelola kelas & tugas' },
  { role: 'parent', emoji: '👨‍👩‍👧', label: 'Orang tua', desc: 'Pantau progres anak' },
]

/** Landing + login entry. Signup role selection happens on Keycloak's
 *  registration page via the `role` attribute (realm-export.json). */
export default function LoginPage() {
  const auth = useAuth()
  const [picked, setPicked] = useState<string | null>(null)

  if (auth.isAuthenticated) return <Navigate to="/dashboard" replace />

  const signup = () => {
    // store picked role for Keycloak registration prefill (via query — realm reads it via theme/freemarker)
    const url = new URL(oidcAuthority() + '/registrations?client_id=learnloop-web')
    if (picked) url.searchParams.set('role', picked)
    window.location.href = url.toString()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">LearnLoop</h1>
      <p className="text-lg text-gray-600">Belajar seru, progres terpantau.</p>

      <button
        onClick={() => void auth.signinRedirect()}
        className="rounded-lg bg-blue-600 px-8 py-3 text-white text-lg font-semibold hover:bg-blue-700"
      >
        Masuk
      </button>

      <div className="w-full max-w-3xl">
        <h2 className="text-center text-xl font-semibold mb-4">Daftar sebagai</h2>
        <div className="grid grid-cols-3 gap-4">
          {ROLE_CARDS.map((c) => (
            <button
              key={c.role}
              onClick={() => setPicked(c.role)}
              className={`rounded-xl border-2 p-6 text-center transition ${
                picked === c.role ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-4xl mb-2">{c.emoji}</div>
              <div className="font-semibold">{c.label}</div>
              <div className="text-sm text-gray-500">{c.desc}</div>
            </button>
          ))}
        </div>
        <button
          onClick={signup}
          disabled={!picked}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-8 py-3 text-white font-semibold disabled:opacity-40"
        >
          Lanjut daftar{picked ? ` sebagai ${picked}` : ''}
        </button>
      </div>
    </main>
  )
}

function oidcAuthority() {
  return (import.meta.env.VITE_KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/learnloop').replace(
    /\/realms\/learnloop$/,
    '',
  )
}
