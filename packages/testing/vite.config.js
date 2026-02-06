import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { version } from './package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Use relative paths
  resolve: {
    alias: {
      // CRITICAL: Force single React instance across all packages
      'react': path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(rootDir, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(rootDir, 'node_modules/react/jsx-dev-runtime'),
      // Shared package alias
      '@disruptive-spaces/shared': path.resolve(__dirname, '../shared')
    },
    // Dedupe React - ensures single copy
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    // Pre-bundle these to avoid duplicate resolution
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    // Force re-optimization
    force: true
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.tsx'), // Specify your main entry file
      output: {
        // Include the semantic version from package.json and a short hash for cache busting
        entryFileNames: `assets/main.v${version}.js`,
        chunkFileNames: `assets/[name].v${version}.js`,
        assetFileNames: `assets/[name].v${version}.[ext]`
      }
    }
  },
});

