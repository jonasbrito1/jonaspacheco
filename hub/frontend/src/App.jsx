import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Projects = lazy(() => import('./pages/Projects'))
const Finance = lazy(() => import('./pages/Finance'))
const Monitor = lazy(() => import('./pages/Monitor'))
const Tickets = lazy(() => import('./pages/Tickets'))
const Users = lazy(() => import('./pages/Users'))
const TaskFlow = lazy(() => import('./pages/TaskFlow'))
const Board = lazy(() => import('./pages/Board'))

const BlogPosts = lazy(() => import('./pages/blog/BlogPosts'))
const BlogEditor = lazy(() => import('./pages/blog/BlogEditor'))
const BlogCategories = lazy(() => import('./pages/blog/BlogCategories'))
const BlogTags = lazy(() => import('./pages/blog/BlogTags'))

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

function withLazy(element, label = 'Carregando modulo...') {
  return <Suspense fallback={<LoadingScreen label={label} />}>{element}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={withLazy(<Login />, 'Carregando login...')} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<RoleRoute roles={['admin', 'dev']}>{withLazy(<Dashboard />, 'Carregando dashboard...')}</RoleRoute>} />
          <Route path="projects" element={<RoleRoute roles={['admin', 'dev']}>{withLazy(<Projects />, 'Carregando projetos...')}</RoleRoute>} />
          <Route path="finance" element={<RoleRoute roles={['admin', 'dev']}>{withLazy(<Finance />, 'Carregando financeiro...')}</RoleRoute>} />
          <Route path="monitor" element={<RoleRoute roles={['admin', 'dev']}>{withLazy(<Monitor />, 'Carregando monitor...')}</RoleRoute>} />
          <Route path="tickets" element={<RoleRoute roles={['admin', 'dev', 'colaborador']}>{withLazy(<Tickets />, 'Carregando tickets...')}</RoleRoute>} />
          <Route path="users" element={<AdminRoute>{withLazy(<Users />, 'Carregando usuarios...')}</AdminRoute>} />
          <Route path="taskflow" element={<RoleRoute roles={['admin', 'dev', 'colaborador']}>{withLazy(<TaskFlow />, 'Carregando TaskFlow...')}</RoleRoute>} />
          <Route path="taskflow/:id" element={<RoleRoute roles={['admin', 'dev', 'colaborador']}>{withLazy(<Board />, 'Carregando board...')}</RoleRoute>} />
          <Route path="blog" element={<AdminRoute>{withLazy(<BlogPosts />, 'Carregando Blog...')}</AdminRoute>} />
          <Route path="blog/new" element={<AdminRoute>{withLazy(<BlogEditor />, 'Carregando editor...')}</AdminRoute>} />
          <Route path="blog/:id" element={<AdminRoute>{withLazy(<BlogEditor />, 'Carregando editor...')}</AdminRoute>} />
          <Route path="blog/categories" element={<AdminRoute>{withLazy(<BlogCategories />, 'Carregando categorias...')}</AdminRoute>} />
          <Route path="blog/tags" element={<AdminRoute>{withLazy(<BlogTags />, 'Carregando tags...')}</AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
