/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0a0f',
          dark: '#0d0d1a',
          card: '#12121f',
          border: '#1a1a2e',
          cyan: '#00f5ff',
          pink: '#ff006e',
          green: '#39ff14',
          yellow: '#ffd700',
          purple: '#9d00ff',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.4)',
        'glow-pink': '0 0 20px rgba(255, 0, 110, 0.4)',
        'glow-green': '0 0 20px rgba(57, 255, 20, 0.4)',
      },
      animation: {
        'glitch': 'glitch 2s infinite',
        'pulse-cyan': 'pulse-cyan 2s infinite',
      }
    },
  },
  plugins: [],
}
