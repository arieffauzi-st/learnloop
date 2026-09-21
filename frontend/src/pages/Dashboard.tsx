import { useAuth } from 'react-oidc-context'

/** Role-based home: picks dashboard per token role (dashboards land in #6-#8). */
export default function Dashboard() {
  const auth = useAuth()
  const claims = auth.user?.profile as Record<string, unknown> | undefined
  const role = (claims?.role as string) ?? 'student'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Halo, {claims?.preferred_username as string ?? 'user'}!</h1>
      <p>Role: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{role}</span></p>
      <p className="text-gray-500">Dashboard {role} menyusul (issue #6–#8).</p>
      <button
        onClick={() => void auth.signoutRedirect()}
        className="rounded-lg border px-4 py-2 hover:bg-gray-50"
      >
        Keluar
      </button>
    </main>
  )
}
