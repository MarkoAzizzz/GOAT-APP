/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        goat: {
          bg: 'rgb(var(--c-bg-base) / <alpha-value>)',
          surface: 'rgb(var(--c-bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--c-bg-elevated) / <alpha-value>)',
          input: 'rgb(var(--c-bg-input) / <alpha-value>)',
          header: 'rgb(var(--c-bg-header) / <alpha-value>)',
          text: 'rgb(var(--c-text-primary) / <alpha-value>)',
          subtext: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          overlay: 'rgb(var(--c-overlay) / <alpha-value>)',
          red: '#E11919',
          'red-soft': 'rgba(225,25,25,0.16)',
          amber: 'rgb(var(--c-chart-amber-rgb) / <alpha-value>)',
          green: 'rgb(var(--c-chart-green-rgb) / <alpha-value>)',
          blue: 'rgb(var(--c-chart-blue-rgb) / <alpha-value>)',
          purple: 'rgb(var(--c-chart-purple-rgb) / <alpha-value>)',
          teal: 'rgb(var(--c-chart-teal-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['System'],
        mono: ['Courier'],
      },
    },
  },
  plugins: [],
};
