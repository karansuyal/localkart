/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFFBEB',
          100: '#FFF3C4',
          200: '#FFE587',
          300: '#FFD43B',
          400: '#FFC400',
          500: '#F5B400',
          600: '#E0A300',
          700: '#B37F00',
          800: '#8A6200',
          900: '#5C4200',
        },
        ink: {
          50:  '#F4F4F8',
          100: '#E5E5ED',
          400: '#6E6E85',
          600: '#3A3A52',
          800: '#22223A',
          900: '#1A1A2E',
        },
        fresh: {
          50:  '#E6FAEE',
          500: '#00C853',
          600: '#00A844',
        },
        urgent: {
          50:  '#FFEAEC',
          500: '#FF3D57',
          600: '#E8273F',
        },
      },
      fontFamily: {
        display: ['"Lexend"', '"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce': 'bounce 1s infinite',
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
