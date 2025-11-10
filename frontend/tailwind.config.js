/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { blue: "#2563eb", green: "#059669", dark: "#0f172a" }
      }
    },
  },
  plugins: [],
};

