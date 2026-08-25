import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Rewrites __BUILD_ID__ in service-worker.js after each build so the file's
// bytes change every deploy. The browser only re-installs a service worker
// whose contents changed; without this, the 60s update check in main.js never
// finds anything and installed PWAs keep running the old bundle forever.
const stampServiceWorker = () => ({
  name: 'stamp-service-worker',
  apply: 'build',
  closeBundle: {
    order: 'post',
    async handler() {
      const { readFile, writeFile } = await import('node:fs/promises')
      const path = new URL('./dist/service-worker.js', import.meta.url)
      const src = await readFile(path, 'utf8')
      await writeFile(path, src.replaceAll('__BUILD_ID__', `build-${Date.now()}`))
    },
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), stampServiceWorker()],
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
