/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#A0C201', // Apple green
          'dark': '#84A001',
          'light': '#B8D53A',
        },
        'secondary': {
          DEFAULT: '#659501', // Avocado
          'dark': '#527901',
          'light': '#7BAF1A',
        },
        'accent': {
          DEFAULT: '#FE8029', // Safety orange
          'dark': '#E56B14',
          'light': '#FF9950',
        },
        'neutral': {
          DEFAULT: '#F8F4F9', // Ghost white
          'dark': '#E1DDE2',
          'light': '#FFFFFF',
        },
        'dark': {
          DEFAULT: '#6B4B3E', // Liver
          'dark': '#5A3D32',
          'light': '#8A6550',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
} 