import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../context/store'
import { ShoppingBag, MapPin } from 'lucide-react'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authAPI.login(data)
      const { access_token, refresh_token, user_id, role } = res.data
      login({ id: user_id, role }, access_token)
      toast.success('Login successful! 🎉')
      if (role === 'shopkeeper') navigate('/shopkeeper')
      else if (role === 'delivery') navigate('/delivery')
      else if (role === 'admin') navigate('/admin')
      else navigate('/home')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LocalKart AI</h1>
          <p className="text-gray-500 mt-1 flex items-center justify-center gap-1">
            <MapPin size={14} /> Hyperlocal Marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              {...register('phone', { required: 'Phone number required', minLength: { value: 10, message: 'Enter a valid phone number' } })}
              className="input-field"
              placeholder="9876543210"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              {...register('password', { required: 'Password required' })}
              className="input-field"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Account nahi hai?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">Register karein</Link>
        </p>
      </div>
    </div>
  )
}
