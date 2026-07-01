import { useState } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

// Colored pin icons for shop markers (green = open, red = closed).
// Hosted on a public CDN — no API key needed, works exactly like Google's
// colored markers used to.
const shopIcon = (isOpen) => new L.Icon({
  iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${isOpen ? 'green' : 'red'}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [0, -32],
  shadowSize: [36, 36],
})

export default function NearbyShopsMap({ shops, userLocation }) {
  const [selectedShop, setSelectedShop] = useState(null)

  // Sirf wahi shops dikhao jinka lat/lng DB mein hai
  const shopsWithLocation = shops?.filter(s => s.latitude && s.longitude) || []
  const shopsWithoutLocation = shops?.filter(s => !s.latitude || !s.longitude) || []

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '320px', borderRadius: '12px' }}
        >
          {/* CARTO Voyager tiles -- free forever, no API key, no billing */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* User location marker — blue dot */}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{ color: '#fff', weight: 2.5, fillColor: '#4F46E5', fillOpacity: 1 }}
          >
            <Popup>Aap yahan hain</Popup>
          </CircleMarker>

          {/* Shop markers — sirf jinke paas real lat/lng hai */}
          {shopsWithLocation.map(shop => (
            <Marker
              key={shop.id}
              position={[shop.latitude, shop.longitude]}
              icon={shopIcon(shop.is_open)}
              eventHandlers={{ click: () => setSelectedShop(shop) }}
            >
              <Popup>
                <div className="p-1 min-w-[170px]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-800 text-sm">{shop.name}</p>
                    <span className={`text-xs font-medium ml-2 ${shop.is_open ? 'text-green-600' : 'text-red-500'}`}>
                      {shop.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{shop.address}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={11} className="text-yellow-500" fill="currentColor" />
                    <span className="text-xs text-gray-600">{shop.rating?.toFixed(1)}</span>
                    {shop.category && (
                      <span className="text-xs text-gray-400 ml-1">• {shop.category}</span>
                    )}
                  </div>
                  <Link
                    to={`/shop/${shop.id}`}
                    className="block text-center bg-indigo-600 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Shop kholein →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-white rounded-lg shadow px-2 py-1.5 flex items-center gap-3 text-xs z-[1000]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Aap
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Closed
          </span>
        </div>

        {/* Count badge */}
        <div className="absolute top-3 right-3 bg-white rounded-lg shadow px-2.5 py-1 text-xs font-medium text-gray-700 z-[1000]">
          📍 {shopsWithLocation.length} shops map pe
        </div>
      </div>

      {/* Warning: jo shops map pe nahi aaye kyunki location nahi dali */}
      {shopsWithoutLocation.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <MapPin size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{shopsWithoutLocation.length} shop{shopsWithoutLocation.length > 1 ? 's' : ''}</span> map pe nahi dikh rahi kyunki unka location save nahi hua.
            Shopkeeper ko apna Dashboard → Location Update karna hoga.
          </p>
        </div>
      )}
    </div>
  )
}
