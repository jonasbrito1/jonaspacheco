import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import { hasSession } from './lib/api'

const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Overview = lazy(() => import('./pages/Overview'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Sites = lazy(() => import('./pages/Sites'))
const Vps = lazy(() => import('./pages/Vps'))
const Projects = lazy(() => import('./pages/Projects'))
const Notes = lazy(() => import('./pages/Notes'))
const Account = lazy(() => import('./pages/Account'))

const Private = ({ children }) => (hasSession() ? children : <Navigate to="/login" replace />)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Overview />} />
            <Route path="acessos" element={<Analytics />} />
            <Route path="sites" element={<Sites />} />
            <Route path="vps" element={<Vps />} />
            <Route path="projetos" element={<Projects />} />
            <Route path="anotacoes" element={<Notes />} />
            <Route path="conta" element={<Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
