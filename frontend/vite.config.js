import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false
  },
  plugins: [
    react(),
    {
      name: 'robotcar-runtime-config-dev',
      configureServer(server) {
        server.middlewares.use('/config.js', (req, res) => {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.end('window.__ROBOTCAR_CONFIG__ = {};');
        });
      }
    }
  ]
});
