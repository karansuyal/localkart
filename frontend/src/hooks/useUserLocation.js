import { useState, useEffect, useCallback } from 'react'

const CACHE_KEY = 'localkart_last_location'
const CACHE_MAX_AGE_MS = 30 * 60 * 1000 // 30 min -- purani cached location zyada dinon tak trust nahi karni

// Kuch major cities ke fallback coordinates -- agar GPS aur IP dono fail
// ho jaayein, toh IP se sirf city ka naam mil jaaye to bhi kaam chal jaaye.
const CITY_FALLBACKS = {
  rudrapur: { lat: 28.9855, lng: 79.4054 },
  dehradun: { lat: 30.3165, lng: 78.0322 },
  haldwani: { lat: 29.2183, lng: 79.5130 },
  nainital: { lat: 29.3919, lng: 79.4542 },
  haridwar: { lat: 29.9457, lng: 78.1642 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  bareilly: { lat: 28.3670, lng: 79.4304 },
  aligarh: { lat: 27.8974, lng: 78.0880 },
}

// Aakhri fallback jab kuch bhi detect na ho -- Rudrapur (jahan LocalKart
// abhi live hai) ke aas-paas.
const DEFAULT_LOCATION = { lat: 28.9855, lng: 79.4054, source: 'default', label: 'Rudrapur, UK' }

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.lat || !parsed?.lng) return null
    if (Date.now() - (parsed.ts || 0) > CACHE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(loc) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...loc, ts: Date.now() }))
  } catch {
    // localStorage full ya disabled -- ignore, cache sirf ek optimization hai
  }
}

// Free, no-API-key IP geolocation. Dono providers HTTPS support karte hain
// (Vercel HTTPS pe hai, isliye HTTP wale providers mixed-content error
// dete hain aur silently fail ho jaate) -- ipapi.co primary (1000 req/day
// free), ipwho.is backup (no key, HTTPS, generous free limit).
async function fetchIpLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d = await res.json()
      if (d?.latitude && d?.longitude) {
        return { lat: d.latitude, lng: d.longitude, source: 'ip', label: d.city ? `${d.city}, ${d.region_code || ''}`.trim() : null, city: d.city }
      }
    }
  } catch {
    // ipapi.co fail (rate-limit ya network) -- neeche backup try karo
  }
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d = await res.json()
      if (d?.success !== false && d?.latitude && d?.longitude) {
        return { lat: d.latitude, lng: d.longitude, source: 'ip', label: d.city ? `${d.city}, ${d.region || ''}`.trim() : null, city: d.city }
      }
    }
  } catch {
    // ye bhi fail -- caller city-fallback ya default pe chala jaayega
  }
  return null
}

function cityFallback(cityName) {
  if (!cityName) return null
  const key = cityName.trim().toLowerCase()
  const coords = CITY_FALLBACKS[key]
  if (!coords) return null
  return { ...coords, source: 'city-fallback', label: cityName }
}

/**
 * Priority order (Zomato/Blinkit-style):
 *  1. Browser GPS (navigator.geolocation) -- sabse accurate
 *  2. Cached last-known location (localStorage, 30 min tak valid) --
 *     turant dikhane ke liye jab tak GPS/IP resolve ho raha ho
 *  3. IP-based location (ipapi.co / ip-api.com) -- GPS deny/fail ho toh
 *  4. City-name se hardcoded fallback (agar IP se sirf city mila coords nahi)
 *  5. Hardcoded default (Rudrapur) -- sab fail ho jaaye tab
 *
 * Returns { location, source, isDetecting, permissionDenied, refresh }
 */
export function useUserLocation() {
  const cached = readCache()
  const [location, setLocation] = useState(cached || DEFAULT_LOCATION)
  const [isDetecting, setIsDetecting] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const detect = useCallback(() => {
    setIsDetecting(true)
    setPermissionDenied(false)

    if (!navigator.geolocation) {
      // GPS support hi nahi hai browser mein -- seedha IP pe jao
      fetchIpLocation().then(ipLoc => {
        const final = ipLoc || cityFallback(ipLoc?.city) || DEFAULT_LOCATION
        setLocation(final)
        if (final.source !== 'default') writeCache(final)
        setIsDetecting(false)
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps', label: null }
        setLocation(loc)
        writeCache(loc)
        setIsDetecting(false)
      },
      async (err) => {
        // Permission denied ya timeout -- IP-based location try karo
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true)
        const ipLoc = await fetchIpLocation()
        if (ipLoc) {
          setLocation(ipLoc)
          writeCache(ipLoc)
        } else {
          // IP bhi fail -- agar cache hai to usi pe reh jao, warna default
          setLocation(cached || DEFAULT_LOCATION)
        }
        setIsDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    detect()
  }, [detect])

  return { location, isDetecting, permissionDenied, refresh: detect }
}
