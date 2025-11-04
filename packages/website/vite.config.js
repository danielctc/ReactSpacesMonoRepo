import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { version } from './package.json';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@disruptive-spaces/shared': resolve(__dirname, '../shared'),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.jsx'), // Specify your main entry file
      output: {
        // Include the semantic version from package.json and a short hash for cache busting
        entryFileNames: `assets/main.v${version}.js`,
        chunkFileNames: `assets/[name].v${version}.js`,
        assetFileNames: `assets/[name].v${version}.[ext]`
      }
    }
  },
  server: {
    port: 3001, // Different from the main app port
    open: true,
    proxy: {
      // Proxy Firebase Storage requests to bypass CORS
      '/firebase-proxy': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firebase-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            
          });
        },
      }
    }
  }
}); 