/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bahnschrift", "Aptos Display", "Segoe UI", "sans-serif"],
        body: ["Aptos", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(16, 185, 129, 0.16)",
        cobalt: "0 18px 80px rgba(37, 99, 235, 0.18)",
      },
    },
  },
  plugins: [],
};
