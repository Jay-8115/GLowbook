/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#111827',
        primary: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
        },
        secondary: '#1f2937',
        accent: '#f43f5e',
        muted: '#9ca3af',
      },
    },
  },
  plugins: [],
}
