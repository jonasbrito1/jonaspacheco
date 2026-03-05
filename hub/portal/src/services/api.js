import axios from 'axios'

const api = axios.create({ baseURL: '/api/portal' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('portal_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('portal_token')
      localStorage.removeItem('portal_user')
    }
    return Promise.reject(err)
  }
)

export default api
