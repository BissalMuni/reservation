import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      fontSize: {
        // 글씨 크기 조절용 CSS 변수 기반
        'dynamic-xs': 'calc(0.75rem * var(--font-scale, 1))',
        'dynamic-sm': 'calc(0.875rem * var(--font-scale, 1))',
        'dynamic-base': 'calc(1.125rem * var(--font-scale, 1))',
        'dynamic-lg': 'calc(1.25rem * var(--font-scale, 1))',
        'dynamic-xl': 'calc(1.5rem * var(--font-scale, 1))',
        'dynamic-2xl': 'calc(1.875rem * var(--font-scale, 1))',
      },
    },
  },
  plugins: [],
}
export default config
