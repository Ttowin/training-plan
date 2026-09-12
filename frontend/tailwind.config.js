/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        matrix: {
          green: "#00ff41",
          "green-dim": "#00b32c",
          "green-dark": "#003b0f",
          bg: "#0d0208",
          "bg-card": "#0a1a0a",
          "bg-overlay": "rgba(0,0,0,0.85)",
          cyan: "#00ffff",
          "cyan-dim": "#00b3b3",
          red: "#ff0040",
          yellow: "#ffff00",
          "text-muted": "#3d7a3d",
          border: "#1a4a1a",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
        terminal: ["'Share Tech Mono'", "'Courier New'", "monospace"],
      },
      boxShadow: {
        matrix: "0 0 10px #00ff41, 0 0 20px #00ff4140",
        "matrix-sm": "0 0 5px #00ff41, 0 0 10px #00ff4120",
        "matrix-cyan": "0 0 10px #00ffff, 0 0 20px #00ffff40",
        "matrix-red": "0 0 10px #ff0040, 0 0 20px #ff004040",
      },
      animation: {
        "flicker": "flicker 3s infinite",
        "scan": "scan 8s linear infinite",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "type": "type 0.5s steps(1) infinite",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
          "75%": { opacity: "0.95" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 5px #00ff41, 0 0 10px #00ff4120" },
          "50%": { boxShadow: "0 0 15px #00ff41, 0 0 30px #00ff4140" },
        },
        type: {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "#00ff41" },
        },
      },
    },
  },
  plugins: [],
};
