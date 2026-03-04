import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import deno from "@deno/vite-plugin";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 3000,
    // Ajouter le nom d'hôte du client ici
    allowedHosts: [
      "app.sor.localhost",
    ],
    hmr: {
      protocol: "wss",
      host: "app.sor.localhost",
      clientPort: 4443,
    },
  },
  plugins: [react(), deno()],
  optimizeDeps: {
    include: ["react/jsx-runtime"],
  },
})
