import { createApp } from 'vue'
import axios from 'axios'

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

axios.defaults.baseURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000/api/v1'
  : import.meta.env.VITE_API_URL;

import { onAuthStateChanged } from 'firebase/auth'
import auth from './firebase/init'

let app;

// Function to synchronously set Axios auth token on initial load from localStorage
function initializeAxiosAuthentication() {
  const vuexState = JSON.parse(localStorage.getItem('vuex'));
  if (vuexState && vuexState.user) {
    const token = localStorage.getItem('userToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      store.commit('SET_USER_TOKEN', token);
    }
  }
}

initializeAxiosAuthentication();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const token = await user.getIdToken();
      const { data } = await axios.post('/auth/google_login/', { token: token });
      store.commit('SET_USER', data.user);
      store.commit('SET_USER_TOKEN', data.token);
      localStorage.setItem('userToken', data.token);
    } catch (e) {
      console.error("Error exchanging Firebase token for backend token:", e);
      store.dispatch('logOut');
    }
  } else {
    store.commit('SET_USER', null);
    store.commit('SET_USER_TOKEN', null);
    localStorage.removeItem('userToken');
  }

  if (!app) {
    app = createApp(App)
    app.use(router)
    app.use(store)
    app.mount('#app')
  }
})