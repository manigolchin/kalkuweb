/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f5',
          100: '#cce0eb',
          200: '#99c2d7',
          500: '#1a5276',
          600: '#15425e',
          700: '#103147',
          900: '#051018',
        },
        kalku: {
          green: '#27ae60',
          orange: '#f39c12',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
};
