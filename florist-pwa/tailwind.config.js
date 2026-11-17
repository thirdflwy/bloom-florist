/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF8F5',
        blush: '#FDF2F4',
        sageTint: '#EEF1EA',
        botanical: {
          DEFAULT: '#1E3528',
          light: '#2F4538',
        },
        rose: {
          DEFAULT: '#D45D79',
          dark: '#B84763',
        },
        olive: {
          DEFAULT: '#6B7F59',
          dark: '#576947',
        },
        borderSoft: '#EAE6DF',
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        editorial: '0 10px 30px -10px rgba(30, 53, 40, 0.08)',
      },
    },
  },
  plugins: [],
};
