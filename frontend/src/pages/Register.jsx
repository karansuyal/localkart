import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../context/store'
import { getErrorMessage } from '../utils/errorMessage'
import { ShoppingBag } from 'lucide-react'

const ROLES = [
  { value: 'customer', label: '🛍️ Customer', desc: 'Shop from local stores' },
  { value: 'shopkeeper', label: '🏪 Shopkeeper', desc: 'Sell your products online' },
  { value: 'delivery', label: '🚴 Delivery Partner', desc: 'Deliver and earn' },
]

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role: 'customer' } })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const selectedRole = watch('role')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // Same normalization as Login: always +91 plus exactly 10 digits.
      const cleanPhone = `+91${data.phone.replace(/\D/g, '').slice(-10)}`
      const res = await authAPI.register({ ...data, phone: cleanPhone })
      const { access_token, user_id, role } = res.data
      login({ id: user_id, role }, access_token)
      toast.success('Registration successful! Welcome to LocalKart 🎉')
      if (role === 'shopkeeper') navigate('/shopkeeper')
      else if (role === 'delivery') navigate('/delivery')
      else navigate('/home')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-3">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join LocalKart AI</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input {...register('name', { required: 'Name required' })} className="input-field" placeholder="Aapka naam" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-600 font-medium text-sm select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                {...register('phone', {
                  required: 'Phone number required',
                  pattern: { value: /^\d{10}$/, message: 'Enter exactly 10 digits, no spaces or symbols' }
                })}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)
                }}
                className="input-field rounded-l-none flex-1"
                placeholder="9876543210"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" {...register('password', { required: true, minLength: { value: 6, message: 'Min 6 chars' } })} className="input-field" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <label key={r.value} className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${selectedRole === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" {...register('role')} value={r.value} className="sr-only" />
                  <div className="text-2xl mb-1">{r.label.split(' ')[0]}</div>
                  <div className="text-xs font-medium text-gray-700">{r.label.split(' ').slice(1).join(' ')}</div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
