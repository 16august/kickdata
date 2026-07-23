import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0a1f14",
        turf: "#16a34a",
      },
    },
  },
  plugins: [],
};

export default config;
