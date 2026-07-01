import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderAPI } from '../../services/api'
import { useOrderTracking } from '../../hooks/useOrderTracking'
import { ArrowLeft, Package, Clock, MapPin, IndianRupee, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Default marker icon path breaks with Vite's bundler, so point it at a CDN.
const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Delivery partner ki location websocket se live update hoti rehti hai --
// MapContainer ka `center` prop sirf mount pe kaam karta hai, isliye map ko
// har naye location update pe manually re-center karna padta hai.
function Recenter({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const STEPS = [
  { key: 'pending',   icon: '🛍️', label: 'Order Placed' },
  { key: 'confirmed', icon: '✅', label: 'Confirmed' },
  { key: 'picked_up', icon: '🛵', label: 'On The Way' },
  { key: 'delivered', icon: '🎉', label: 'Delivered' },
]

const STEP_INDEX = { pending: 0, confirmed: 1, preparing: 1, picked_up: 2, delivered: 3 }

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_MSG = {
  pending:   'Order mila, confirm ho raha hai...',
  confirmed: 'Shop se prepare ho raha hai 🏪',
  preparing: 'Shop pe taiyaar ho raha hai 🏪',
  picked_up: 'Delivery partner raaste mein hai 🛵',
  delivered: 'Delivered! Enjoy karein 😊',
  cancelled: 'Order cancel ho gaya',
}

function DeliveryMap({ deliveryLocation, deliveryAddress }) {
  if (!deliveryLocation) return null
  const { lat, lng } = deliveryLocation

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
      <div className="bg-green-50 px-3 py-1.5 flex items-center gap-2 text-xs text-green-700 font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Delivery Partner Live Location
      </div>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '160px', width: '100%' }}
      >
        {/* CARTO Voyager tiles -- free forever, no API key, no billing */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Recenter lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={deliveryIcon}>
          <Popup>Delivery partner yahan hai 🛵</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

function LiveOrderCard({ order }) {
  const { status: liveStatus, message, eta, deliveryLocation, deliveryName, connected } = useOrderTracking(order.id)
  const currentStatus = liveStatus || order.status
  const stepIdx = STEP_INDEX[currentStatus] ?? 0
  const [showOtp, setShowOtp] = useState(false)
  const isActive = !['delivered', 'cancelled'].includes(currentStatus)

  return (
    <div className={`card mb-4 ${isActive ? 'border-2 border-primary-200' : 'border border-gray-200'}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-gray-800">Order #{order.id}</span>
          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('hi-IN')}</p>
          {order.payment_mode === 'phonepe' && (
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
              order.payment_status === 'paid' ? 'bg-green-100 text-green-700'
              : order.payment_status === 'failed' ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
            }`}>
              PhonePe: {order.payment_status === 'paid' ? 'Paid ✓' : order.payment_status === 'failed' ? 'Failed' : 'Pending'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className={`flex items-center gap-1 text-xs ${connected ? 'text-green-600' : 'text-gray-400'}`}>
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? 'Live' : 'Offline'}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[currentStatus] || 'bg-gray-100 text-gray-600'}`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Live notification */}
      {(liveStatus || message) && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
          <span className="text-lg">{STEPS[stepIdx]?.icon || '🔔'}</span>
          <p className="text-sm text-primary-700 font-medium">
            {message || STATUS_MSG[currentStatus]}
            {deliveryName && <span className="text-xs text-primary-500 block">Partner: {deliveryName}</span>}
          </p>
        </div>
      )}

      {/* Progress Steps */}
      {currentStatus !== 'cancelled' && (
        <div className="flex items-center mb-4 relative">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Line */}
              {i < STEPS.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i < stepIdx ? 'bg-primary-500' : 'bg-gray-200'}`} />
              )}
              {/* Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 ${
                i <= stepIdx ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'
              } ${i === stepIdx ? 'ring-4 ring-primary-100 scale-110' : ''} transition-all`}>
                {i <= stepIdx ? step.icon : i + 1}
              </div>
              <p className={`text-xs mt-1 text-center ${i <= stepIdx ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Order details */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <IndianRupee size={13} />Total
          </span>
          <span className="font-bold text-gray-800">₹{order.total_amount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Items</span>
          <span className="text-gray-800">{order.items?.length} items</span>
        </div>
        {(eta || order.eta_minutes) && isActive && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-600"><Clock size={13} />ETA</span>
            <span className="font-bold text-primary-600">{eta || order.eta_minutes} min</span>
          </div>
        )}
        <div className="flex items-start gap-1 text-xs text-gray-500 pt-1">
          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
          <span>{order.delivery_address}</span>
        </div>
      </div>

      {/* Live Map — pickup ke baad */}
      {currentStatus === 'picked_up' && (
        <DeliveryMap deliveryLocation={deliveryLocation} deliveryAddress={order.delivery_address} />
      )}

      {/* OTP */}
      {isActive && order.otp && (
        <div className="mt-3">
          <button onClick={() => setShowOtp(!showOtp)} className="text-xs text-primary-600 underline">
            {showOtp ? 'OTP chhupao' : '🔐 Delivery OTP dekhein'}
          </button>
          {showOtp && (
            <div className="mt-2 bg-gray-900 text-white rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Delivery Partner ko ye OTP dein</p>
              <p className="text-4xl font-bold tracking-[0.3em]">{order.otp}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderAPI.mine().then(r => r.data),
    refetchInterval: 30000,
  })

  const activeOrders = orders?.filter(o => !['delivered', 'cancelled'].includes(o.status)) || []
  const pastOrders = orders?.filter(o => ['delivered', 'cancelled'].includes(o.status)) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">My Orders</h1>
          {activeOrders.length > 0 && (
            <span className="ml-auto bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeOrders.length} Active
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          [1,2].map(i => <div key={i} className="card h-40 animate-pulse bg-gray-100 mb-3" />)
        ) : orders?.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Koi order nahi abhi tak</p>
            <Link to="/home" className="btn-primary mt-4 inline-block px-6 py-2 text-sm">Shopping Karein</Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🔴 Active Orders</p>
                {activeOrders.map(order => <LiveOrderCard key={order.id} order={order} />)}
              </div>
            )}
            {pastOrders.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Past Orders</p>
                {pastOrders.map(order => <LiveOrderCard key={order.id} order={order} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
