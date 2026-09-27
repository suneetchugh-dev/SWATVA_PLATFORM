/** @type {import('tailwindcss').Config} */

// Obsidian & Porcelain Neo-Glass — the Sahnirmaan design system, carried over.
// One accent (amber #F59E0B); everything else is achromatic.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    // Full replacement of the default palette, deliberately. The design
    // system's top-priority rule is a permanent ban on blue, green, cyan, teal
    // and slate-blue anywhere in the product. Omitting those families means a
    // banned class such as `bg-blue-500` simply does not exist, so the rule is
    // enforced by the build rather than by reviewer vigilance.
    // `neutral` is the only permitted grey family — it is 100% achromatic,
    // unlike `slate`, whose blue channel is always above its red channel.
    colors: {
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: '#000000',
      white: '#FFFFFF',
      neutral: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0A0A0A',
      },
      amber: {
        50: '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#F59E0B',
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
      },
      // Danger / Destructive semantic tokens (Sign out, error banners, delete)
      red: {
        50: '#FEF2F2',
        100: '#FEE2E2',
        200: '#FECACA',
        300: '#FCA5A5',
        400: '#F87171',
        500: '#EF4444',
        600: '#DC2626',
        700: '#B91C1C',
        800: '#991B1B',
        900: '#7F1D1D',
      },
      rose: {
        50: '#FFF1F2',
        100: '#FFE4E6',
        200: '#FECDD3',
        300: '#FDA4AF',
        400: '#FB7185',
        500: '#F43F5E',
        600: '#E11D48',
        700: '#BE123C',
        800: '#9F1239',
        900: '#881337',
      },
      // Verification / Success semantic tokens (Verified citizen, active schemes)
      emerald: {
        50: '#ECFDF5',
        100: '#D1FAE5',
        200: '#A7F3D0',
        300: '#6EE7B7',
        400: '#34D399',
        500: '#10B981',
        600: '#059669',
        700: '#047857',
        800: '#065F46',
        900: '#064E3B',
      },
      // Canonical canvas tokens from the design system.
      porcelain: '#FCFDFD',
      obsidian: '#080808',
    },
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
