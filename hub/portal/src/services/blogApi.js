import axios from 'axios'

const blogApi = axios.create({ baseURL: '/api/blog' })

export default blogApi
