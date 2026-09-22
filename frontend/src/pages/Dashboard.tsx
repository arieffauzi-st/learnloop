import { useAuth } from 'react-oidc-context'
import { Navigate } from 'react-router-dom'

/** Role-based home: sends the user straight to their role dashboard. */
export default function Dashboard() {
  const auth = useAuth()
  if (auth.isLoading) return null
  const claims = auth.user?.profile as Record<string, unknown> | undefined
  const role = (claims?.role as string) ?? 'student'
  return <Navigate to={`/${role}`} replace />
}
