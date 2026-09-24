import axios from 'axios'

const TOKEN = 'hub_token'
const USER = 'hub_user'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const onAuthPage = /^\/(login|redefinir-senha)/.test(window.location.pathname)
    if ((err.response?.status === 401 || err.response?.status === 403) && !onAuthPage) {
      clearSession()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN, token)
  localStorage.setItem(USER, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN)
  localStorage.removeItem(USER)
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN))
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER) || '{}') } catch { return {} }
}

export function errorMessage(err, fallback = 'Algo deu errado') {
  return err?.response?.data?.error || fallback
}

export default api
