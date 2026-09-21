import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProviderWrapper } from './auth/AuthProvider'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProviderWrapper>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </AuthProviderWrapper>
    </BrowserRouter>
  </StrictMode>,
)
