import { createApp } from 'vue'
import axios from 'axios'

import App from './App.vue'
import router from './router'
import store from './store/store'

import './index.css'
import './style.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
    console.log('Service Worker registered with scope:', registration.scope);
  }).catch(function(error) {
    console.log('Service Worker registration failed:', error);
  });
}

axios.defaults.baseURL = process.env.NODE_ENV === 'development' 
                         ? 'http://localhost:8000/api/v1' 
                         : import.meta.env.VITE_API_URL;

// Function to set the auth token for Axios
function initializeAxiosAuthentication() {
  console.log("Initializing Axios Authentication...")
  const store = JSON.parse(localStorage.getItem('vuex'));
  if (store && store.user) {
    const token = localStorage.getItem('userToken');

    if (token) {
      console.log("Setting Axios Authorization header...")
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
      console.log("No token found")
    }
  }
}

initializeAxiosAuthentication();


const app = createApp(App)
app.use(router)
app.use(store)
app.mount('#app')