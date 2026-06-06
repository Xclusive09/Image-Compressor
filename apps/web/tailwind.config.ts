import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        leaf: "#1f8a5b",
        sun: "#f6b744",
        clay: "#d9664f"
      }
    }
  },
  plugins: []
};

export default config;
