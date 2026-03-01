importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDuA1-gF45FSpuc4VbxJWqoGEccJ3TR6K8",
  projectId: "pizzamango-376923",
  messagingSenderId: "778990538357",
  appId: "1:778990538357:web:4cdf9eb1392cc4a621f23c",
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
