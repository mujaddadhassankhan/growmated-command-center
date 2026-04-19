import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1E2A3A',
        status: {
          green: '#22C55E',
          yellow: '#F59E0B',
          red: '#EF4444',
        }
      }
    },
  },
  plugins: [],
} satisfies Config
