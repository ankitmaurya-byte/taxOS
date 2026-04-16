import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['sohne-var', 'SF Pro Display', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['SourceCodePro', 'SFMono-Regular', 'ui-monospace', 'monospace'],
      },
      colors: {
        // DESIGN.md tokens
        stripe: {
          purple: '#533afd',
          'purple-hover': '#4434d4',
          'purple-deep': '#2e2b8c',
          'purple-light': '#b9b9f9',
          'purple-mid': '#665efd',
        },
        heading: '#061b31',
        label: '#273951',
        body: '#64748d',
        'brand-dark': '#1c1e54',
        'dark-navy': '#0d253d',
        ruby: '#ea2261',
        magenta: '#f96bee',
        'magenta-light': '#ffd7ef',
        success: '#15be53',
        'success-text': '#108c3d',
        lemon: '#9b6829',
        border: '#e5edf5',
        'border-purple': '#b9b9f9',
        'border-soft-purple': '#d6d9fc',

        // Legacy compat (keeps existing code working during migration)
        primary: {
          DEFAULT: '#533afd',
          50: '#f5f3ff',
          100: '#ede9fd',
          200: '#d6d9fc',
          300: '#b9b9f9',
          400: '#665efd',
          500: '#533afd',
          600: '#4434d4',
          700: '#2e2b8c',
          800: '#1c1e54',
          900: '#0d253d',
        },
        inkle: {
          purple: '#533afd',
          'purple-light': '#ede9fd',
          'purple-dark': '#4434d4',
          green: '#15be53',
          'green-light': '#d1fae5',
          red: '#ea2261',
          'red-light': '#fee2e2',
          amber: '#9b6829',
          'amber-light': '#fef3c7',
          blue: '#3b82f6',
          'blue-light': '#dbeafe',
        },
      },
      borderRadius: {
        lg: '6px',
        md: '5px',
        sm: '4px',
        xs: '1px',
      },
      boxShadow: {
        'ambient-sm': 'rgba(23,23,23,0.06) 0px 3px 6px',
        standard: 'rgba(23,23,23,0.08) 0px 15px 35px',
        elevated: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
        deep: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
