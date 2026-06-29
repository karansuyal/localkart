import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Star, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const LIBRARIES = ['places'] // Component ke bahar — warning fix

const mapContainerStyle = { width: '100%', height: '320px', borderRadius: '12px' }

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
  ]
}

export default function NearbyShopsMap({ shops, userLocation }) {
  const [selectedShop, setSelectedShop] = useState(null)
  const [map, setMap] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  })

  const onLoad = useCallback(mapInstance => setMap(mapInstance), [])
  const onUnmount = useCallback(() => setMap(null), [])

  // Sirf wahi shops dikhao jinka lat/lng DB mein hai
  const shopsWithLocation = shops?.filter(s => s.latitude && s.longitude) || []
  const shopsWithoutLocation = shops?.filter(s => !s.latitude || !s.longitude) || []

  if (loadError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-600 text-sm">
      Maps load nahi hua. API key check karo.
    </div>
  )

  if (!isLoaded) return (
    <div className="bg-gray-100 rounded-xl h-[320px] flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Map load ho raha hai...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLocation}
          zoom={14}
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* User location marker — blue pulsing dot */}
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#4F46E5',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2.5,
            }}
            title="Aap yahan hain"
            zIndex={999}
          />

          {/* Shop markers — sirf jinke paas real lat/lng hai */}
          {shopsWithLocation.map(shop => (
            <Marker
              key={shop.id}
              position={{ lat: shop.latitude, lng: shop.longitude }}
              onClick={() => setSelectedShop(shop)}
              icon={{
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: shop.is_open ? '#16A34A' : '#DC2626',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 1.5,
              }}
            />
          ))}

          {/* InfoWindow for selected shop */}
          {selectedShop && (
            <InfoWindow
              position={{ lat: selectedShop.latitude, lng: selectedShop.longitude }}
              onCloseClick={() => setSelectedShop(null)}
            >
              <div className="p-1 min-w-[170px]">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{selectedShop.name}</p>
                  <span className={`text-xs font-medium ml-2 ${selectedShop.is_open ? 'text-green-600' : 'text-red-500'}`}>
                    {selectedShop.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{selectedShop.address}</p>
                <div className="flex items-center gap-1 mb-2">
                  <Star size={11} className="text-yellow-500" fill="currentColor" />
                  <span className="text-xs text-gray-600">{selectedShop.rating?.toFixed(1)}</span>
                  {selectedShop.category && (
                    <span className="text-xs text-gray-400 ml-1">• {selectedShop.category}</span>
                  )}
                </div>
                <Link
                  to={`/shop/${selectedShop.id}`}
                  className="block text-center bg-indigo-600 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Shop kholein →
                </Link>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-white rounded-lg shadow px-2 py-1.5 flex items-center gap-3 text-xs">
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
        <div className="absolute top-3 right-3 bg-white rounded-lg shadow px-2.5 py-1 text-xs font-medium text-gray-700">
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
