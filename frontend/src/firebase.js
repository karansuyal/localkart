import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

// Messaging setup
let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  console.log('Messaging not supported')
}

export { messaging }

// FCM Token lo aur backend ko bhejo
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return null
    }

    if (!messaging) return null

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })

    if (token) {
      console.log('FCM Token:', token)
      // Backend ko token bhejo
      const { userAPI } = await import('./services/api')
      await userAPI.update({ fcm_token: token })
      return token
    }
  } catch (err) {
    console.error('FCM setup error:', err)
  }
  return null
}

// Foreground notifications handle karo
export const onForegroundMessage = (callback) => {
  if (!messaging) return
  return onMessage(messaging, (payload) => {
    console.log('Foreground message:', payload)
    callback(payload)
  })
}

// Service worker ko config bhejo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.active?.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseConfig
    })
  })
}

export default app