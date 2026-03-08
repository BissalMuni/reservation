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
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#627d98',
          500: '#334e68',
          600: '#243b53',
          700: '#1e3a5f',
          800: '#153e75',
          900: '#102a43',
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#eab308',
          500: '#d69e2e',
          600: '#ca8a04',
          700: '#a16207',
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
