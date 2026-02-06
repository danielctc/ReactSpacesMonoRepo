import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { version } from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Use relative paths
  resolve: {
    alias: {
      // Define aliases here
      '@disruptive-spaces/shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.tsx'),
      output: {
        // Include the semantic version from package.json and a short hash for cache busting
        entryFileNames: `assets/main.v${version}.js`,
        chunkFileNames: `assets/[name].v${version}.js`,
        assetFileNames: `assets/[name].v${version}.[ext]`
      }
    }
  },
});

