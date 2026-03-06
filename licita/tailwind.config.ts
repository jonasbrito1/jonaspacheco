import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg0: '#020c1b',
        bg1: '#081526',
        bg2: '#0d1e35',
        bg3: '#112640',
        bgInput: '#06101e',
        border: '#1a3a5c',
        borderLight: '#254d6e',
        primary: '#FFDF00',
        'primary-dark': '#c9a800',
        green: '#009C3B',
        'green-dark': '#007d2f',
        red: '#EF4444',
        orange: '#F97316',
        blue: '#1E6FD9',
        text1: '#EEF2FF',
        text2: '#8BAFC8',
        text3: '#4A6B87',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
