/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "Poppins", "sans-serif"],
      },
      colors: {
        aether: {
          blue: {
            50: "#f0f6ff",
            100: "#e0edff",
            200: "#c7deff",
            300: "#9ec4ff",
            400: "#6ba1ff",
            500: "#3b82f6",
            600: "#2563eb",
            700: "#1d4ed8",
            800: "#1e40af",
            900: "#1e3a8a",
            950: "#0f172a",
          },
          dark: "#0F172A",
          card: "#FFFFFF",
          bg: "#F8FAFC",
          bgTint: "#EFF6FF",
        }
      },
      boxShadow: {
        card: "0 8px 30px rgba(37,99,235,0.10)",
        cardHover: "0 18px 45px rgba(37,99,235,0.18)",
        button: "0 8px 25px rgba(59,130,246,0.25)",
      },
      borderRadius: {
        card: "18px",
        image: "20px",
      }
    },
  },
  plugins: [],
}
