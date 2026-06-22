import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shopAPI } from '../../services/api'
import { Store, MapPin, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_OPTIONS = ['Grocery', 'Dairy', 'Snacks', 'Beverages', 'Vegetables', 'Personal Care', 'Household', 'Electronics']

// Shown on the shopkeeper dashboard when this shopkeeper hasn't created a
// shop yet. Without this, there is nothing to PATCH a location onto --
// that's why "Location Update Karo" used to fail with "Shop load nahi hui".
export default function SetupShopCard() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '', category: CATEGORY_OPTIONS[0], address: '', phone: '',
    latitude: null, longitude: null
  })
  const [locating, setLocating] = useState(false)

  const createMutation = useMutation({
    mutationFn: (data) => shopAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shops'] })
      toast.success('Shop ban gayi! Ab location aur products add karo.')
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail
      toast.error(detail || 'Shop create nahi hui, dobara try karo')
    }
  })

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Browser location support nahi karta')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        setLocating(false)
        toast.success('Location mil gayi')
      },
      () => {
        setLocating(false)
        toast.error('Location permission do ya manually try karo')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Shop ka naam daalo')
    if (!form.address.trim()) return toast.error('Address daalo')
    if (!form.phone.trim()) return toast.error('Phone number daalo — customers WhatsApp pe order bhejte hain isi number pe')
    if (form.latitude == null || form.longitude == null) return toast.error('Pehle location detect karo')

    createMutation.mutate({
      name: form.name.trim(),
      category: form.category,
      address: form.address.trim(),
      phone: form.phone.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
    })
  }

  return (
    <div className="card border-2 border-primary-200 bg-primary-50">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <Store size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Apni Shop Setup Karo</h3>
          <p className="text-xs text-gray-500">Pehle ek shop banao, fir orders aane lagenge</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Shop ka naam (jaise: Sharma General Store)"
          className="input-field text-sm"
        />

        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="input-field text-sm"
        >
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          placeholder="Pura address"
          className="input-field text-sm"
        />

        <input
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="Phone number (WhatsApp orders ke liye zaroori)"
          className="input-field text-sm"
        />

        <button
          type="button"
          onClick={detectLocation}
          disabled={locating}
          className={`w-full text-sm font-medium px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            form.latitude != null ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          } disabled:opacity-60`}
        >
          {locating
            ? <><Loader2 size={14} className="animate-spin" /> Detect ho raha hai...</>
            : form.latitude != null
              ? <><MapPin size={14} /> Location mil gayi ✓ ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})</>
              : <><MapPin size={14} /> Current Location Detect Karo</>
          }
        </button>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="btn-primary w-full text-sm disabled:opacity-60"
        >
          {createMutation.isPending ? 'Ban rahi hai...' : 'Shop Banao'}
        </button>
      </form>
    </div>
  )
}
