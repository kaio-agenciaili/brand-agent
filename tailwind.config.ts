import type { Config } from "tailwindcss";

/** Paleta agência ILI: preto, cinza claro, rosa */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ili: {
          preto: "#0a0a0a",
          cinza: {
            50: "#fbfbfb",
            100: "#f0f0f0",
            200: "#e0e0e0",
            300: "#c8c8c8",
            400: "#9a9a9a",
            500: "#6b6b6b",
          },
          rosa: {
            50: "#fff5f7",
            100: "#ffe4ec",
            200: "#ffc9d7",
            300: "#ff9db5",
            400: "#f26b8d",
            500: "#e94872",
            600: "#d92f5c",
            700: "#b81f4a",
            800: "#991c3f",
            900: "#7f1a36",
          },
        },
        /** Compat: antigos `brand-*` mapeiam para rosa ILI */
        brand: {
          50: "#fff5f7",
          100: "#ffe4ec",
          200: "#ffc9d7",
          300: "#ff9db5",
          400: "#f26b8d",
          500: "#e94872",
          600: "#d92f5c",
          700: "#b81f4a",
          800: "#991c3f",
          900: "#7f1a36",
        },
      },
    },
  },
  plugins: [],
};

export default config;
