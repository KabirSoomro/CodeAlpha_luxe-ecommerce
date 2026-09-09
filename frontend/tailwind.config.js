/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        luxe: {
          bg: 'var(--bg-color)',
          surface: 'var(--surface-color)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          accent: 'var(--accent-glow)',
          glassBg: 'var(--glass-bg)',
          glassBorder: 'var(--glass-border)',
        },
      },
      boxShadow: {
        glow: '0 0 20px var(--accent-glow)',
        luxeCard: '0 10px 30px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        fadeInStaggered: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        badgePulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 240, 255, 0)' },
          '50%': { transform: 'scale(1.08)', boxShadow: '0 0 14px var(--accent-glow)' },
        },
      },
      animation: {
        fadeInStaggered: 'fadeInStaggered 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        badgePulse: 'badgePulse 1s ease-in-out',
      },
    },
  },
  plugins: [],
};
