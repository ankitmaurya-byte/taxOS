import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          50: '#F5F3FF',
          100: '#EDE9FD',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#6C5CE7',
          600: '#5B4BD5',
          700: '#4C3EC0',
          800: '#3B2F99',
          900: '#2E2472',
        },
        inkle: {
          purple: '#6C5CE7',
          'purple-light': '#EDE9FD',
          'purple-dark': '#5B4BD5',
          green: '#10B981',
          'green-light': '#D1FAE5',
          red: '#EF4444',
          'red-light': '#FEE2E2',
          amber: '#F59E0B',
          'amber-light': '#FEF3C7',
          blue: '#3B82F6',
          'blue-light': '#DBEAFE',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
