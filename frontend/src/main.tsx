import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import './index.css'
import { AuthProviderWrapper, RequireRole } from './auth/AuthProvider'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ParentDashboard from './pages/ParentDashboard'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import NotFound from './pages/NotFound'

// "/": anonymous -> public landing page; authenticated -> role dashboard.
function RootRedirect() {
  const auth = useAuth()
  if (auth.isLoading) return null
  if (!auth.isAuthenticated) return <LandingPage />
  const claims = auth.user?.profile as Record<string, unknown> | undefined
  const role = claims?.role as string | undefined
  if (role === 'teacher') return <Navigate to="/teacher" replace />
  if (role === 'parent') return <Navigate to="/parent" replace />
  if (role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/dashboard" replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProviderWrapper>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teacher" element={<RequireRole role="teacher"><TeacherDashboard /></RequireRole>} />
          <Route path="/student" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
          <Route path="/parent" element={<RequireRole role="parent"><ParentDashboard /></RequireRole>} />
          {/* Unknown routes: friendly 404 instead of a blank page (issue #53). */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProviderWrapper>
    </BrowserRouter>
  </StrictMode>,
)
