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


const app = createApp(App)
app.use(router)
app.use(store)
app.mount('#app')