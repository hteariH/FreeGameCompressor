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
        background: '#0a0d14',
        surface: '#111726',
        'surface-elevated': '#182035',
        'surface-hover': '#1e2942',
        border: '#263352',
        'border-light': '#36466b',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          glow: 'rgba(59, 130, 246, 0.4)'
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
