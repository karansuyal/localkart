import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderAPI } from '../../services/api'
import { useOrderTracking } from '../../hooks/useOrderTracking'
import { useOsrmRoute } from '../../hooks/useOsrmRoute'
import { ArrowLeft, Package, Clock, MapPin, IndianRupee, Wifi, WifiOff, Phone, Navigation, Share2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Colored marker icons -- green for the delivery partner, blue for the
// customer's own delivery address. No API key needed, hosted on a free CDN.
const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
const homeIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Haversine formula -- seedhi-line distance km mein
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Delivery partner ki location har 5 sec mein update hoti hai -- map ko
// dono points (partner + customer) ke hisaab se auto fit/recenter karo.
function AutoFit({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 })
    } else if (points.length === 1) {
      map.setView(points[0], 15)
    }
  }, [JSON.stringify(points)]) // eslint-disable-line react-hooks/exhaustive-deps
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

// Zomato-style average city delivery speed assumption (km/h) -- sirf
// straight-line distance se rough ETA nikalne ke liye, actual road route nahi.
const AVG_SPEED_KMH = 20

const STALE_MS = 15000 // 15 sec se zyada purani location = partner offline/no-signal maano

function DeliveryMap({ deliveryLocation, customerLocation, lastLocationUpdate, orderId }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000)
    return () => clearInterval(t)
  }, [])

  const hasCustomer = customerLocation?.lat && customerLocation?.lng
  // OSRM se actual road route + accurate ETA -- fail ho jaaye to seedhi-line
  // fallback (haversine) automatically use ho jaata hai neeche.
  const { path: roadPath, distanceKm: roadDistKm, etaMin: roadEtaMin, isRoadRoute } =
    useOsrmRoute(deliveryLocation, hasCustomer ? customerLocation : null)

  if (!deliveryLocation) return null
  const { lat, lng } = deliveryLocation
  const points = hasCustomer ? [[lat, lng], [customerLocation.lat, customerLocation.lng]] : [[lat, lng]]
  const straightDist = hasCustomer ? distanceKm(lat, lng, customerLocation.lat, customerLocation.lng) : null
  const straightEta = straightDist != null ? Math.max(1, Math.round((straightDist / AVG_SPEED_KMH) * 60)) : null

  // Road-route data available ho to use karo, warna straight-line fallback
  const dist = isRoadRoute && roadDistKm != null ? roadDistKm : straightDist
  const etaMin = isRoadRoute && roadEtaMin != null ? roadEtaMin : straightEta
  const linePath = isRoadRoute && roadPath ? roadPath : points

  const isStale = lastLocationUpdate ? (now - lastLocationUpdate) > STALE_MS : false
  const secsAgo = lastLocationUpdate ? Math.round((now - lastLocationUpdate) / 1000) : null

  const shareTracking = async () => {
    const url = `${window.location.origin}/orders#order-${orderId}`
    const text = `LocalKart: mera order live track karein 🛵 ${url}`
    if (navigator.share) {
      try { await navigator.share({ title: 'LocalKart Live Tracking', text, url }) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Tracking link copy ho gaya!')
    }
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
      <div className="bg-green-50 px-3 py-1.5 flex items-center justify-between gap-2 text-xs text-green-700 font-medium">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
          {isStale ? `Offline · ${secsAgo}s se update nahi` : 'Delivery Partner Live Location'}
        </span>
        <span className="flex items-center gap-2">
          {dist != null && (
            <span className="flex items-center gap-1 text-green-800">
              <Navigation size={11} />{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} away
            </span>
          )}
          <button onClick={shareTracking} title="Live tracking link share karein" className="text-green-700 hover:text-green-900">
            <Share2 size={13} />
          </button>
        </span>
      </div>
      <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} style={{ height: '180px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <AutoFit points={points} />
        {hasCustomer && (
          <Polyline
            positions={linePath}
            pathOptions={isRoadRoute
              ? { color: '#4F46E5', weight: 4, opacity: 0.85 }
              : { color: '#4F46E5', weight: 3, dashArray: '6 8', opacity: 0.8 }}
          />
        )}
        <Marker position={[lat, lng]} icon={deliveryIcon} opacity={isStale ? 0.5 : 1}>
          <Popup>{isStale ? `Last seen ${secsAgo}s pehle` : 'Delivery partner yahan hai 🛵'}</Popup>
        </Marker>
        {hasCustomer && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={homeIcon}>
            <Popup>Aapka delivery address 🏠</Popup>
          </Marker>
        )}
      </MapContainer>
      {etaMin != null && (
        <div className="bg-white px-3 py-1.5 text-xs text-gray-600 border-t border-gray-100 flex items-center gap-1">
          <Clock size={11} /> Lagbhag <span className="font-semibold text-gray-800">{etaMin} min</span> mein pahunch sakta hai
          {isRoadRoute && <span className="text-gray-400 ml-1">(road route)</span>}
        </div>
      )}
    </div>
  )
}

// Delivery partner ka naam + call button -- picked_up hone ke baad dikhta hai
function DeliveryPartnerCard({ name, phone }) {
  if (!name) return null
  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-500">Delivery Partner</p>
        </div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Phone size={13} /> Call
        </a>
      )}
    </div>
  )
}

function LiveOrderCard({ order }) {
  // Past orders don't need a live socket at all -- see useOrderTracking's
  // `enabled` param. This is what was causing 5-10s slow loads: every
  // order (including old delivered ones) used to open its own WebSocket.
  const wasActive = !['delivered', 'cancelled'].includes(order.status)
  const { status: liveStatus, message, eta, deliveryLocation, lastLocationUpdate, deliveryName, deliveryPhone, connected } = useOrderTracking(order.id, wasActive)
  const currentStatus = liveStatus || order.status
  const stepIdx = STEP_INDEX[currentStatus] ?? 0
  const [showOtp, setShowOtp] = useState(false)
  const isActive = !['delivered', 'cancelled'].includes(currentStatus)

  // Live websocket value ko priority do, warna REST se saved value fallback ke taur pe
  const partnerName = deliveryName || order.delivery_partner_name
  const partnerPhone = deliveryPhone || order.delivery_partner_phone
  const customerLocation = order.delivery_lat && order.delivery_lng
    ? { lat: order.delivery_lat, lng: order.delivery_lng } : null

  return (
    <div id={`order-${order.id}`} className={`card mb-4 ${isActive ? 'border-2 border-primary-200' : 'border border-gray-200'}`}>

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

      {/* Delivery partner ka naam + call button — accept hote hi dikh jaata hai */}
      {isActive && currentStatus !== 'pending' && (
        <DeliveryPartnerCard name={partnerName} phone={partnerPhone} />
      )}

      {/* Live Map — pickup ke baad, route line + live distance ke saath */}
      {currentStatus === 'picked_up' && (
        <DeliveryMap
          deliveryLocation={deliveryLocation}
          customerLocation={customerLocation}
          lastLocationUpdate={lastLocationUpdate}
          orderId={order.id}
        />
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
  const { data: orders, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderAPI.mine().then(r => r.data),
    refetchInterval: 30000,
  })

  // orders undefined ho sakta hai (query abhi settle nahi hui, ya error ke
  // baad bhi data undefined reh jaata hai) -- isliye hamesha Array.isArray
  // check karo, warna "orders?.length === 0" false ban jaata hai jab orders
  // undefined ho, aur na hi empty-state dikhta hai na list -- bas white page.
  const ordersList = Array.isArray(orders) ? orders : []
  const activeOrders = ordersList.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const pastOrders = ordersList.filter(o => ['delivered', 'cancelled'].includes(o.status))

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
        ) : isError ? (
          <div className="text-center py-12">
            <WifiOff size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">Orders load nahi ho paaye</p>
            <p className="text-xs text-gray-400 mb-4">{error?.response?.data?.detail || error?.message || 'Network error'}</p>
            <button onClick={() => refetch()} className="btn-primary px-6 py-2 text-sm">Dobara try karein</button>
          </div>
        ) : ordersList.length === 0 ? (
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
