import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Finance from './pages/Finance'
import Monitor from './pages/Monitor'
import Tickets from './pages/Tickets'
import Users from './pages/Users'
import TaskFlow from './pages/TaskFlow'
import Board from './pages/Board'

const PrivateRoute = ({ children }) => {
  return localStorage.getItem('hub_token') ? children : <Navigate to="/login" />
}

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('hub_user') || '{}')
  if (!localStorage.getItem('hub_token')) return <Navigate to="/login" />
  return user.role === 'admin' ? children : <Navigate to="/" />
}

const RoleRoute = ({ children, roles }) => {
  const user = JSON.parse(localStorage.getItem('hub_user') || '{}')
  if (!localStorage.getItem('hub_token')) return <Navigate to="/login" />
  return roles.includes(user.role) ? children : <Navigate to="/" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<RoleRoute roles={['admin', 'dev']}><Dashboard /></RoleRoute>} />
          <Route path="projects" element={<RoleRoute roles={['admin', 'dev']}><Projects /></RoleRoute>} />
          <Route path="finance"  element={<RoleRoute roles={['admin', 'dev']}><Finance /></RoleRoute>} />
          <Route path="monitor"  element={<RoleRoute roles={['admin', 'dev']}><Monitor /></RoleRoute>} />
          <Route path="tickets"  element={<RoleRoute roles={['admin', 'dev', 'colaborador']}><Tickets /></RoleRoute>} />
          <Route path="users"       element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="taskflow"    element={<RoleRoute roles={['admin', 'dev', 'colaborador']}><TaskFlow /></RoleRoute>} />
          <Route path="taskflow/:id" element={<RoleRoute roles={['admin', 'dev', 'colaborador']}><Board /></RoleRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
