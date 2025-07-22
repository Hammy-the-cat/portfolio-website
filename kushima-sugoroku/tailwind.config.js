/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'retro-green': '#4ade80',
        'retro-blue': '#3b82f6', 
        'retro-yellow': '#facc15',
        'retro-red': '#ef4444',
        'gold': {
          '400': '#facc15',
          '500': '#eab308',
          '600': '#ca8a04'
        },
        'dragon-quest': {
          50: '#f0f9ff',
          100: '#e0f2fe', 
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e'
        }
      },
      fontFamily: {
        'pixel': ['Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}