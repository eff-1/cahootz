import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        brand: {
          navy: '#0B1B3A', // Brand base
          blue: '#2F6BFF', // Action primary
          'blue-hover': '#2456D3',
          'blue-light': '#EAF0FF',
          surface: '#F7F6F2', // Off-white surface
          card: '#FFFFFF',
        },
        semantic: {
          green: '#2E9E6B', // Success / present / completed
          'green-light': '#EAF7F0',
          amber: '#C98410', // Warning / disputed / lobby
          'amber-light': '#FDF5E7',
          red: '#C0392B', // Destructive / cancelled / expired
          'red-light': '#FDF0EE',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;

