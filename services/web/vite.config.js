import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    // location.js imports functions/data/pois.json from outside the web root
    // so client and Cloud Functions share one set of coordinates.
    fs: { allow: ['..', '../..'] },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    }
  }
})
