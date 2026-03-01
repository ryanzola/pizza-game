import { createApp } from 'vue'


import App from './App.vue'
import router from './router'
import store from './store/store'

import './index.css'
import './style.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
    console.log('Service Worker registered with scope:', registration.scope);
  }).catch(function (error) {
    console.log('Service Worker registration failed:', error);
  });
}

import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './firebase/init'
import { doc, getDoc, setDoc } from 'firebase/firestore'

let app;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData;
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      } else {
        // Create a new user profile document
        userData = {
          email: user.email,
          name: user.displayName,
          picture: user.photoURL,
          bank_amount: 0,
          savings_amount: 0,
        };
        await setDoc(userDocRef, userData);
      }

      // Add uid to the payload for easier reference
      store.dispatch('fetchUser', { ...userData, uid: user.uid });
    } catch (e) {
      console.error("Error fetching or creating user profile:", e);
      store.dispatch('logOut');
    }
  } else {
    store.dispatch('fetchUser', null);
  }

  if (!app) {
    app = createApp(App)
    app.use(router)
    app.use(store)
    app.mount('#app')
  }
})