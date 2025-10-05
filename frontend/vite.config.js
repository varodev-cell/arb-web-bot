import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
    export default defineConfig({
      plugins: [react()],
      base: '/arb-web-bot/', // важно для GitHub Pages (если репо: username/arb-
      web-bot)
      server: { port: 5173 }
})
