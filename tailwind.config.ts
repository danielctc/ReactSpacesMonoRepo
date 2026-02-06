import type { Config } from 'tailwindcss';

export default {
  content: [
    './packages/*/src/**/*.{js,jsx,ts,tsx}',
    './packages/*/index.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
