importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAt-LEsMNIq5bKsRTPLz5qfoi416mGxTug",
  authDomain: "pizzamango-376923.firebaseapp.com",
  projectId: "pizzamango-376923",
  storageBucket: "pizzamango-376923.firebasestorage.app",
  messagingSenderId: "778990538357",
  appId: "1:778990538357:web:524e0af35328155921f23c",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || "New VIP Order!";
  const notificationOptions = {
    body: payload.notification?.body || "A High-Value VIP order just dropped nearby!",
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
