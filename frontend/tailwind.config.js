/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

/*
 * Tokens de identidad visual de la Municipalidad de Tres de Febrero.
 * Fuente: docs/IDENTIDAD_VISUAL.md y docs/pdfs/MANUAL DE MARCA (Manual de Identidad Visual).
 *
 * - municipal-500 (#175588) y municipal-800 (#00365B) son los azules de marca.
 * - Las escalas 50-400 y 600-700 son tonos derivados para fondos, bordes y estados.
 * - marca-naranja y marca-amarillo son acentos: NO usarlos como color de texto sobre fondos claros
 *   (contraste 2,36:1 y 1,78:1 sobre blanco).
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        municipal: {
          50: '#EEF4F9',
          100: '#D9E7F3',
          200: '#B3CFE7',
          300: '#7FAED6',
          400: '#4E8CBF',
          500: '#175588',
          600: '#144A77',
          700: '#103F66',
          800: '#00365B',
          900: '#00253F',
        },
        marca: {
          naranja: '#E4992B',
          amarillo: '#EEBB31',
        },
      },
      fontFamily: {
        sans: ['Quicksand', ...defaultTheme.fontFamily.sans],
        display: ['Montserrat', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
