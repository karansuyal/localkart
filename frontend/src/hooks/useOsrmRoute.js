import { useState, useEffect, useRef } from 'react'

// Haversine -- OSRM call se pehle check karne ke liye ki partner itna move
// hua hai ki naya route fetch karne layak ho (fir se poori road route
// dobara maangna waste hai agar sirf 10-15m hi hila ho).
function distanceMeters(a, b) {
  const R = 6371000
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
const MIN_MOVE_M = 40      // itna move hone par hi naya route maango
const MIN_REFETCH_MS = 12000 // public OSRM demo server hai, bar-bar hit na karo

/**
 * Real road route + ETA/distance from OSRM's free public routing server.
 * from/to: { lat, lng } | null
 * Returns { path, distanceKm, etaMin, isRoadRoute, isLoading }
 *   path: array of [lat, lng] for <Polyline positions={path}>
 */
export function useOsrmRoute(from, to) {
  const [path, setPath] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [etaMin, setEtaMin] = useState(null)
  const [isRoadRoute, setIsRoadRoute] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const lastFetchRef = useRef({ point: null, time: 0 })

  useEffect(() => {
    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return

    const point = [from.lat, from.lng]
    const last = lastFetchRef.current
    const now = Date.now()
    const movedEnough = !last.point || distanceMeters(last.point, point) >= MIN_MOVE_M
    const timeOk = now - last.time >= MIN_REFETCH_MS
    if (last.point && !(movedEnough && timeOk)) return // skip -- abhi refetch ki zaroorat nahi

    let cancelled = false
    setIsLoading(true)

    fetch(`${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(6000),
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (cancelled) return
        const route = data?.routes?.[0]
        if (route) {
          lastFetchRef.current = { point, time: now }
          setPath(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
          setDistanceKm(route.distance / 1000)
          setEtaMin(Math.max(1, Math.round(route.duration / 60)))
          setIsRoadRoute(true)
        }
      })
      .catch(() => {
        // OSRM fail/timeout ho gaya -- caller ko seedhi-line fallback pe
        // switch karna chahiye (isRoadRoute false rahega)
        if (!cancelled) setIsRoadRoute(false)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [from?.lat, from?.lng, to?.lat, to?.lng])

  return { path, distanceKm, etaMin, isRoadRoute, isLoading }
}
