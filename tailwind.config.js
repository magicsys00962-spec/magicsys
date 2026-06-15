/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFFDF5',
          100: '#FFF9E6',
          200: '#F5E6B8',
          300: '#E8D59A',
          400: '#D4B86A',
          500: '#C9A84C',
          600: '#B8963A',
          700: '#9A7B2C',
          800: '#7A6020',
          900: '#5A4515',
        },
        sidebar: {
          bg: '#1A1A2E',
          hover: '#2A2A3E',
          active: '#3A3A4E',
          text: '#E8E8E8',
        },
        status: {
          paid: '#22C55E',
          pending: '#F59E0B',
          credit: '#F97316',
          overdue: '#EF4444',
          cancelled: '#6B7280',
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'gold': '0 4px 12px rgba(201, 168, 76, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
