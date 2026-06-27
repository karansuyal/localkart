import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { auth } from '../firebase'
import { userAPI } from './api'

let messaging = null

export async function initFCM() {
  try {
    const { default: app } = await import('../firebase')
    messaging = getMessaging(app)
  } catch (e) {
    // getApp se lo agar already initialized
    const { getApp } = await import('firebase/app')
    const { getMessaging: gm } = await import('firebase/messaging')
    messaging = gm(getApp())
  }
  return messaging
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return null
  if (!('serviceWorker' in navigator)) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Service worker register karo
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const msg = messaging || await initFCM()
    const token = await getToken(msg, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      // Backend pe save karo
      await userAPI.update({ fcm_token: token })
      console.log('FCM token saved:', token.slice(0, 20) + '...')
    }
    return token
  } catch (err) {
    console.error('FCM setup error:', err)
    return null
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
