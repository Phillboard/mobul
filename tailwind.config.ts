import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        '5xl': ['3rem', { lineHeight: '1', fontWeight: '800' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "builder-sidebar": "hsl(var(--builder-sidebar))",
        "builder-canvas": "hsl(var(--builder-canvas))",
        "builder-tool-active": "hsl(var(--builder-tool-active))",
        "builder-tool-hover": "hsl(var(--builder-tool-hover))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Neon accents for Web3 feel
        'neon-cyan': {
          DEFAULT: 'hsl(189, 94%, 55%)',
          glow: 'hsl(189, 94%, 55% / 0.3)',
        },
        'neon-purple': {
          DEFAULT: 'hsl(282, 85%, 65%)',
          glow: 'hsl(282, 85%, 65% / 0.3)',
        },
        'neon-green': {
          DEFAULT: 'hsl(142, 76%, 52%)',
          glow: 'hsl(142, 76%, 52% / 0.3)',
        },
        'neon-pink': {
          DEFAULT: 'hsl(330, 100%, 65%)',
          glow: 'hsl(330, 100%, 65% / 0.3)',
        },
        // AI-themed colors (kept for compatibility)
        "ai-purple": {
          50: "hsl(270, 100%, 98%)",
          100: "hsl(269, 100%, 95%)",
          200: "hsl(269, 100%, 92%)",
          300: "hsl(269, 97%, 85%)",
          400: "hsl(270, 95%, 75%)",
          500: "hsl(271, 91%, 65%)",
          600: "hsl(271, 81%, 56%)",
          700: "hsl(272, 72%, 47%)",
          800: "hsl(273, 67%, 39%)",
          900: "hsl(274, 66%, 32%)",
          950: "hsl(276, 80%, 21%)",
        },
        "ai-cyan": {
          50: "hsl(180, 100%, 97%)",
          100: "hsl(185, 96%, 90%)",
          200: "hsl(186, 94%, 82%)",
          300: "hsl(187, 92%, 69%)",
          400: "hsl(188, 86%, 53%)",
          500: "hsl(189, 94%, 43%)",
          600: "hsl(190, 90%, 36%)",
          700: "hsl(191, 82%, 30%)",
          800: "hsl(192, 69%, 25%)",
          900: "hsl(193, 58%, 21%)",
          950: "hsl(195, 80%, 13%)",
        },
        "ai-pink": {
          50: "hsl(330, 100%, 98%)",
          100: "hsl(331, 100%, 95%)",
          200: "hsl(332, 100%, 91%)",
          300: "hsl(333, 100%, 83%)",
          400: "hsl(334, 100%, 72%)",
          500: "hsl(335, 100%, 62%)",
          600: "hsl(336, 84%, 50%)",
          700: "hsl(337, 86%, 42%)",
          800: "hsl(338, 79%, 35%)",
          900: "hsl(339, 72%, 29%)",
          950: "hsl(341, 87%, 16%)",
        },
        "neon-blue": "hsl(189, 100%, 50%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -5px hsl(var(--primary) / 0.5)",
        "glow-md": "0 0 40px -10px hsl(var(--primary) / 0.4), 0 0 20px -5px hsl(var(--primary) / 0.3)",
        "glow-lg": "0 0 60px -15px hsl(var(--primary) / 0.5), 0 0 40px -10px hsl(var(--primary) / 0.3), 0 0 20px -5px hsl(var(--primary) / 0.2)",
        "glow-cyan": "0 0 20px -5px hsl(189, 100%, 50% / 0.5), 0 0 40px -10px hsl(189, 100%, 50% / 0.3)",
        "glow-purple": "0 0 20px -5px hsl(282, 85%, 51% / 0.5), 0 0 40px -10px hsl(282, 85%, 51% / 0.3)",
        "glow-pink": "0 0 20px -5px hsl(333, 100%, 50% / 0.5), 0 0 40px -10px hsl(333, 100%, 50% / 0.3)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float-gentle": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px -5px hsl(var(--primary) / 0.5)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 30px -5px hsl(var(--primary) / 0.7)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "scale-in-center": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.9" },
        },
        "gradient-xy": {
          "0%, 100%": { 
            backgroundPosition: "0% 50%",
            backgroundSize: "200% 200%" 
          },
          "50%": { 
            backgroundPosition: "100% 50%",
            backgroundSize: "200% 200%" 
          },
        },
        "shimmer-slide": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-shift": "gradient-shift 15s ease infinite",
        "float-gentle": "float-gentle 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "scale-in-center": "scale-in-center 0.3s ease-out",
        "fade-slide-up": "fade-slide-up 0.5s ease-out",
        "pulse-scale": "pulse-scale 3s ease-in-out infinite",
        "gradient-xy": "gradient-xy 15s ease infinite",
        "shimmer-slide": "shimmer-slide 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
