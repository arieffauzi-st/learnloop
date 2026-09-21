import { AuthProvider, useAuth } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

const oidcConfig = {
  authority: import.meta.env.VITE_KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/learnloop',
  client_id: 'learnloop-web',
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  scope: 'openid profile email',
  response_type: 'code',
  code_challenge_method: 'S256',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
}

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>
}

/** Route guard: requires login, optionally a specific role. */
export function RequireRole({ role, children }: { role?: string; children: ReactNode }) {
  const auth = useAuth()
  if (auth.isLoading) return <div>Loading…</div>
  if (!auth.isAuthenticated) {
    void auth.signinRedirect()
    return null
  }
  if (role) {
    const claims = auth.user?.profile as Record<string, unknown> | undefined
    const userRole = (claims?.role as string) ?? 'student'
    if (userRole !== role) return <Navigate to="/" replace />
  }
  return <>{children}</>
}
