/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Stitch Material / Core Tokens
        "surface": "#faf8ff",
        "surface-bright": "#faf8ff",
        "surface-dim": "#d2d9f4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7ff",
        "surface-container-highest": "#dae2fd",
        "surface-variant": "#dae2fd",
        "surface-tint": "#006a63",

        "on-surface": "#131b2e",
        "on-surface-variant": "#3e4947",
        "on-background": "#131b2e",
        "background": "#faf8ff",

        "primary": "#005c55",
        "primary-container": "#0f766e",
        "on-primary": "#ffffff",
        "on-primary-container": "#a3faef",
        "primary-fixed": "#9cf2e8",
        "primary-fixed-dim": "#80d5cb",
        "on-primary-fixed": "#00201d",
        "on-primary-fixed-variant": "#00504a",
        "inverse-primary": "#80d5cb",

        "secondary": "#4b41e1",
        "secondary-container": "#645efb",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "secondary-fixed": "#e2dfff",
        "secondary-fixed-dim": "#c3c0ff",
        "on-secondary-fixed": "#0f0069",
        "on-secondary-fixed-variant": "#3323cc",

        "tertiary": "#005f26",
        "tertiary-container": "#007a33",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#a1ffad",
        "tertiary-fixed": "#7ffc97",
        "tertiary-fixed-dim": "#62df7d",
        "on-tertiary-fixed": "#002109",
        "on-tertiary-fixed-variant": "#005320",

        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        "outline": "#6e7977",
        "outline-variant": "#bdc9c6",
        "inverse-surface": "#283044",
        "inverse-on-surface": "#eef0ff",

        // Helper brand & semantic swatches
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E', // Primary Emerald
          800: '#115E59', // Primary Hover
          900: '#134E4A',
        },
        app: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          textPrimary: '#0F172A',
          textSecondary: '#475569',
          textMuted: '#64748B',
        },
        fin: {
          positive: '#16A34A',
          positiveBg: '#F0FDF4',
          negative: '#DC2626',
          negativeBg: '#FEF2F2',
        }
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        "space-xs": "0.25rem", // 4px
        "space-sm": "0.5rem",  // 8px
        "space-md": "1rem",    // 16px
        "space-lg": "1.5rem",  // 24px
        "space-xl": "2rem",    // 32px
        "margin": "2rem",
        "margin-mobile": "1rem",
        "gutter": "1.5rem",
        "gutter-mobile": "1rem",
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'sans-serif'],
        geist: ['Geist', 'sans-serif'],
      },
      fontSize: {
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0em", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0em", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.005em", fontWeight: "500" }],
        "headline-sm": ["16px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.025em", fontWeight: "600" }],
        "display-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "currency-md": ["16px", { lineHeight: "24px", letterSpacing: "0em", fontWeight: "600" }],
        "currency-display": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
}
