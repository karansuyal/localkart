importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Ye config frontend ke .env se match karna chahiye
// Service worker mein import.meta.env nahi chalta, isliye hardcode karo
// Ya firebase-config.js file se load karo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const config = event.data.config
    firebase.initializeApp(config)
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {}
      self.registration.showNotification(title || 'LocalKart', {
        body: body || 'Naya update!',
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
        data: payload.data,
        actions: [{ action: 'open', title: 'Open App' }],
      })
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
