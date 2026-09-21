import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProviderWrapper, RequireRole } from './auth/AuthProvider'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ParentDashboard from './pages/ParentDashboard'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProviderWrapper>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teacher" element={<RequireRole role="teacher"><TeacherDashboard /></RequireRole>} />
          <Route path="/student" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
          <Route path="/parent" element={<RequireRole role="parent"><ParentDashboard /></RequireRole>} />
        </Routes>
      </AuthProviderWrapper>
    </BrowserRouter>
  </StrictMode>,
)
