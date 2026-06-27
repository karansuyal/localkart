import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './context/store'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import CustomerHome from './pages/customer/Home'
import ShopPage from './pages/customer/ShopPage'
import CartPage from './pages/customer/CartPage'
import OrdersPage from './pages/customer/OrdersPage'
import ChatbotPage from './pages/customer/ChatbotPage'
import ShopkeeperDashboard from './pages/shopkeeper/Dashboard'
import InventoryPage from './pages/shopkeeper/Inventory'
import ShopOrdersPage from './pages/shopkeeper/Orders'
import AnalyticsPage from './pages/shopkeeper/Analytics'
import DeliveryDashboard from './pages/delivery/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, role } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { role, isAuthenticated } = useAuthStore()

  // FCM setup — login ke baad
  useEffect(() => {
    if (!isAuthenticated) return
    import('./services/fcm').then(({ requestNotificationPermission, onForegroundMessage }) => {
      requestNotificationPermission()
      // Foreground mein aane wali notifications ko toast se dikhao
      onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'LocalKart'
        const body = payload.notification?.body || ''
        toast(body, {
          icon: title.includes('Order') ? '🛍️' : title.includes('Delivery') ? '🛵' : '🔔',
          duration: 5000,
        })
      })
    })
  }, [isAuthenticated])

  // Delivery partners ko topic pe subscribe karo
  useEffect(() => {
    if (role === 'delivery') {
      // Delivery partners automatically "delivery_partners" topic pe hote hain
      // FCM token save hone ke baad backend pe subscribe hoga
    }
  }, [role])

  const getHome = () => {
    if (!isAuthenticated) return '/login'
    if (role === 'shopkeeper') return '/shopkeeper'
    if (role === 'delivery') return '/delivery'
    if (role === 'admin') return '/admin'
    return '/home'
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Navigate to={getHome()} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer */}
        <Route path="/home" element={<ProtectedRoute roles={['customer']}><CustomerHome /></ProtectedRoute>} />
        <Route path="/shop/:id" element={<ProtectedRoute roles={['customer']}><ShopPage /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute roles={['customer']}><CartPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute roles={['customer']}><OrdersPage /></ProtectedRoute>} />
        <Route path="/chatbot" element={<ProtectedRoute roles={['customer']}><ChatbotPage /></ProtectedRoute>} />

        {/* Shopkeeper */}
        <Route path="/shopkeeper" element={<ProtectedRoute roles={['shopkeeper']}><ShopkeeperDashboard /></ProtectedRoute>} />
        <Route path="/shopkeeper/inventory" element={<ProtectedRoute roles={['shopkeeper']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/shopkeeper/orders" element={<ProtectedRoute roles={['shopkeeper']}><ShopOrdersPage /></ProtectedRoute>} />
        <Route path="/shopkeeper/analytics" element={<ProtectedRoute roles={['shopkeeper']}><AnalyticsPage /></ProtectedRoute>} />

        {/* Delivery */}
        <Route path="/delivery" element={<ProtectedRoute roles={['delivery']}><DeliveryDashboard /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
