import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import './index.css'
import { AuthProviderWrapper, RequireRole } from './auth/AuthProvider'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ParentDashboard from './pages/ParentDashboard'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import NotFound from './pages/NotFound'

// "/" langsung mengarah ke tujuan yang berguna: sudah login -> dashboard,
// belum -> halaman login (landing page tersedia di /welcome? tidak - dihapus dari rute default).
function RootRedirect() {
  const auth = useAuth()
  if (auth.isLoading) return null
  return auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
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
