import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { version } from './package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Vite plugin that injects CSS into the JS bundle as a runtime <style> tag.
 * This is needed because our micro-frontends are loaded via <script type="module">
 * tags — there's no HTML file to add <link> tags to, so the JS must
 * inject its own CSS.
 */
function cssInjectionPlugin() {
  return {
    name: 'css-injection',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssFiles = [];
      const jsEntries = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css')) {
          cssFiles.push({ fileName, source: chunk.source });
        }
        if (chunk.type === 'chunk' && chunk.isEntry) {
          jsEntries.push(fileName);
        }
      }

      if (cssFiles.length === 0 || jsEntries.length === 0) return;

      // Combine all CSS and escape for JS string
      const allCss = cssFiles.map((f) => f.source).join('\n');
      const escapedCss = allCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

      const injectionCode = `\n;(function(){try{var s=document.createElement("style");s.textContent=\`${escapedCss}\`;document.head.appendChild(s)}catch(e){console.error("CSS injection failed:",e)}})();\n`;

      // Prepend CSS injection to the entry JS file
      for (const entryName of jsEntries) {
        const entry = bundle[entryName];
        entry.code = injectionCode + entry.code;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cssInjectionPlugin()],
  base: './', // Use relative paths
  resolve: {
    alias: {
      // Define aliases here
      '@disruptive-spaces/shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.tsx'),
      output: {
        // Include the semantic version from package.json and a short hash for cache busting
        entryFileNames: `assets/main.v${version}.js`,
        chunkFileNames: `assets/[name].v${version}.js`,
        assetFileNames: `assets/[name].v${version}.[ext]`,
      },
    },
  },
});
