import axios from 'axios'
import { useAuthStore } from '../context/store'

// Main Backend API
const api = axios.create({
  baseURL: 'https://localkart-i5wm.onrender.com/api/v1',
  timeout: 15000,
})

// AI Backend
const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_URL || 'https://localkart-i5wm.onrender.com',
  timeout: 15000,
})

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  // Firebase OTP login — naya add kiya
  firebaseLogin: (data) => api.post('/auth/firebase-login', data),
}

// ==================== USERS ====================
export const userAPI = {
  me: () => api.get('/users/me'),
  update: (data) => api.patch('/users/me', data),
}

// ==================== SHOPS ====================
export const shopAPI = {
  nearby: (lat, lng, radius = 5) =>
    api.get('/shops/nearby', { params: { lat, lng, radius_km: radius } }),
  get: (id) => api.get(`/shops/${id}`),
  create: (data) => api.post('/shops/', data),
  update: (id, data) => api.patch(`/shops/${id}`, data),
  myShops: () => api.get('/shops/my/shops'),
}

// ==================== PRODUCTS ====================
export const productAPI = {
  byShop: (shopId, category) =>
    api.get(`/products/shop/${shopId}`, { params: category ? { category } : {} }),
  search: (q) => api.get('/products/search', { params: { q } }),
  get: (id) => api.get(`/products/${id}`),
  create: (shopId, data) => api.post('/products/', data, { params: { shop_id: shopId } }),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (productId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/products/${productId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ==================== ORDERS ====================
export const orderAPI = {
  place: (data) => api.post('/orders/', data),
  mine: () => api.get('/orders/my'),
  shopOrders: (shopId) => api.get(`/orders/shop/${shopId}`),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) =>
    api.patch(`/orders/${id}/status`, null, { params: { status } }),
}

// ==================== REVIEWS ====================
export const reviewAPI = {
  create: (data) => api.post('/reviews/', data),
  byShop: (shopId) => api.get(`/reviews/shop/${shopId}`),
}

// ==================== DELIVERY ====================
export const deliveryAPI = {
  available: () => api.get('/deliveries/available'),
  accept: (id) => api.post(`/deliveries/${id}/accept`),
  pickup: (id) => api.post(`/deliveries/${id}/pickup`),
  deliver: (id, otp) =>
    api.post(`/deliveries/${id}/deliver`, null, { params: { otp } }),
  earnings: () => api.get('/deliveries/my/earnings'),
}

// ==================== ADMIN ====================
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
  shops: () => api.get('/admin/shops'),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
  verifyShop: (id) => api.patch(`/admin/shops/${id}/verify`),
}

// ==================== AI ====================
export const aiAPI = {
  recommend: (productId, topN = 5) =>
    aiApi.post('/recommendations/recommend', { product_id: productId, top_n: topN }),
  forecast: (data) => aiApi.post('/forecast/predict', data),
  chat: (question, history = [], shopContext = []) =>
    aiApi.post('/chatbot/ask', { question, chat_history: history, shop_context: shopContext }),
  sentiment: (text) => aiApi.post('/sentiment/analyze', { text }),
  comparePrices: (data) => aiApi.post('/price/compare', data),
}

export default api