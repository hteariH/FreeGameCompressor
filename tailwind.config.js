/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Zinc 950
        surface: '#18181b', // Zinc 900
        'surface-elevated': '#27272a', // Zinc 800
        'surface-hover': '#3f3f46', // Zinc 700
        border: '#27272a',
        'border-light': '#3f3f46',
        primary: {
          DEFAULT: '#fafafa', // Zinc 50 for buttons
          hover: '#e4e4e7',
          glow: 'transparent'
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          purple: '#a855f7',
          amber: '#f59e0b',
          rose: '#f43f5e'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
