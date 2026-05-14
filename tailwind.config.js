/** @type {import('tailwindcss').Config} */
const TRADE_COLORS = ['emerald', 'sky', 'stone', 'yellow', 'orange', 'blue', 'red', 'teal'];

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Trade-color quintet is composed dynamically from TRADES config — JIT can't see it, so safelist it.
  safelist: TRADE_COLORS.flatMap((c) => [
    `bg-${c}-50`,
    `bg-${c}-50/40`,
    `bg-${c}-100`,
    `text-${c}-600`,
    `text-${c}-700`,
    `border-${c}-200`,
  ]),
  theme: {
    extend: {
      colors: {
        // Brand: deep petrol blue, full 50-900 ramp
        primary: {
          50: '#e6f0f5',
          100: '#cce0eb',
          200: '#99c2d7',
          300: '#66a3c3',
          400: '#3385af',
          500: '#1a5276',
          600: '#15425e',
          700: '#103147',
          800: '#0a212f',
          900: '#051018',
        },
        // Semantic accents (kept lean — kalku-blue removed as it duplicates primary-500)
        kalku: {
          green: '#27ae60', // CTA color — every "Kostenlos testen", every checkmark
          orange: '#f39c12',
          red: '#e74c3c',
          purple: '#9b59b6',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      // Trade-color quintet helpers — actual classes are emerald/sky/yellow/orange/teal/red/blue/stone
      // Keep this as documentation only
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
