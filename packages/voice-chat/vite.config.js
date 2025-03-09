import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { version } from './package.json';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths
  resolve: {
    alias: {
      // Define aliases here
      '@disruptive-spaces/shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'VoiceChat',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      external: ['react', 'react-dom', '@chakra-ui/react'],
      output: {
        // Include the semantic version from package.json
        entryFileNames: `assets/main.v${version}.js`,
        chunkFileNames: `assets/[name].v${version}.js`,
        assetFileNames: `assets/[name].v${version}.[ext]`,
        // Provide global variables to use in the UMD build
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@chakra-ui/react': 'ChakraUI'
        }
      }
    }
  },
}); 