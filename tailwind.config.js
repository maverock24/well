/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Two-typeface system (UI principle: ≤2 typefaces).
        // Fraunces — warm humanist serif, optical sizing → display only.
        // Inter   — geometric/humanist sans → all UI, body, controls.
        serif: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // 4-pt spacing grid is Tailwind's default (1 = 4px). We add a few
      // odd half-steps to hit 44pt minimum touch targets without
      // arbitrary-value classes everywhere.
      spacing: {
        11: '44px',
        13: '52px',
        15: '60px',
        18: '72px',
      },
      // Modular type scale 1.25 (Major Third). Body anchored at 16px.
      fontSize: {
        'display-2xl': ['56px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-xl': ['44px', { lineHeight: '1.1', letterSpacing: '-0.018em' }],
        'display-lg': ['32px', { lineHeight: '1.15', letterSpacing: '-0.014em' }],
        'display-md': ['24px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['20px', { lineHeight: '1.25', letterSpacing: '-0.006em' }],
        body: ['16px', { lineHeight: '1.55' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
        meta: ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        eyebrow: ['11px', { lineHeight: '1', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        none: '0',
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '24px',
        full: '9999px',
      },
      colors: {
        // Neutral tokens are CSS variables — see global.css.
        // Light + dark values flip via NativeWind colorScheme.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-2': 'rgb(var(--paper-2) / <alpha-value>)',
        'paper-3': 'rgb(var(--paper-3) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--muted-2) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        'rule-2': 'rgb(var(--rule-2) / <alpha-value>)',
        focus: 'rgb(var(--focus) / <alpha-value>)',

        // Brand accents — restrained palette, balanced chroma.
        terracotta: '#c2603f',
        ochre: '#d4a24c',
        sage: '#819772',
        teal: '#3b7a7a',
        plum: '#885175',
        slate: '#556776',
        rose: '#b05661',
        accent: '#9c633b',

        // Semantic states — system feedback only, never decoration.
        success: '#3a7d5b',
        warning: '#a06a18',
        danger: '#b3402f',
        info: '#3b6e9e',
      },
      boxShadow: {
        // Tinted (warm) shadows, not pure black — surface-relative.
        e1: '0 1px 2px rgba(60, 40, 20, 0.06), 0 1px 1px rgba(60, 40, 20, 0.04)',
        e2: '0 2px 6px rgba(60, 40, 20, 0.08), 0 1px 2px rgba(60, 40, 20, 0.05)',
        e3: '0 8px 24px rgba(60, 40, 20, 0.12), 0 2px 6px rgba(60, 40, 20, 0.06)',
      },
    },
  },
  plugins: [],
};
