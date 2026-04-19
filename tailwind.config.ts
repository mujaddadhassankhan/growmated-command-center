import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // navy = Growmated indigo — used for all buttons, accents, links throughout the app
        navy: '#5254CC',
        surface:  '#141922',
        surface2: '#1C2538',
        base:     '#0D1117',
        status: {
          green:  '#22C55E',
          yellow: '#F59E0B',
          red:    '#EF4444',
        }
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
} satisfies Config
