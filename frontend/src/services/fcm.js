import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { firebaseConfig } from '../firebase'
import { userAPI } from './api'

let messaging = null
let swRegistration = null

// Registers the Firebase messaging service worker (if not already done)
// and immediately hands it the Firebase config via postMessage on the
// SAME registration object we just got back -- not via
// navigator.serviceWorker.ready, which can resolve before/after this
// registration in a way that silently drops the message. This is what
// was causing notifications to work in some sessions but never show up
// on phones: the service worker was active but never actually
// initialized with Firebase, so it had nothing to show in the background.
async function ensureServiceWorker() {
  if (swRegistration) return swRegistration
  if (!('serviceWorker' in navigator)) return null

  swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  // Make sure it's actually activated before we try to message it.
  if (swRegistration.installing || swRegistration.waiting) {
    await new Promise(resolve => {
      const sw = swRegistration.installing || swRegistration.waiting
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve()
      })
    })
  }
  swRegistration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
  return swRegistration
}

export async function initFCM() {
  if (messaging) return messaging
  const { getApp } = await import('firebase/app')
  messaging = getMessaging(getApp())
  return messaging
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return null
  if (!('serviceWorker' in navigator)) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const registration = await ensureServiceWorker()
    if (!registration) return null

    const msg = await initFCM()
    const token = await getToken(msg, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      await userAPI.update({ fcm_token: token })
    }
    return token
  } catch (err) {
    console.error('FCM setup error:', err)
    return null
  }
}

export async function onForegroundMessage(callback) {
  const msg = await initFCM()
  return onMessage(msg, (payload) => callback(payload))
}