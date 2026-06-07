import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
