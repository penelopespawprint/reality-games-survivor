import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_PORT = Number(process.env.PORT) || 5000;
const API_TARGET = process.env.API_TARGET || "http://localhost:5050";

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "client", "src", "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client/public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    port: DEV_PORT,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false
      },
      "/socket.io": {
        target: API_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: true,
    port: DEV_PORT
  }
}));