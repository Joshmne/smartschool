/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { poppins: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        primary:  { DEFAULT: '#4B5563', hover: '#374151', light: '#E5E7EB', foreground: '#FFFFFF' },
        trust:    { DEFAULT: '#0047AB', light: '#EBF0FF', foreground: '#FFFFFF' },
        accent:   { DEFAULT: '#F4A261', light: '#FFF3E8', foreground: '#FFFFFF' },
        success:  { DEFAULT: '#00A651', light: '#EBF9F2', foreground: '#FFFFFF' },
        danger:   { DEFAULT: '#EF4444', light: '#FEF2F2', foreground: '#FFFFFF' },
        warning:  { DEFAULT: '#F59E0B', light: '#FFFBEB', foreground: '#1F2937' },
        surface:  '#F8F9FA',
        border:   '#E5E7EB',
        muted:    '#6B7280',
        ink:      '#1F2937',
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem', '3xl': '1.5rem' },
      animation: {
        'slide-up':   'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.25s ease',
        'pulse-glow': 'pulseGlow 2s ease infinite',
        'num-tick':   'numTick 0.4s ease',
        'check-pop':  'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'confetti':   'confettiFall 0.9s ease forwards',
        'bar-grow':   'barGrow 1.2s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        slideUp:      { from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        pulseGlow:    { '0%,100%': { boxShadow: '0 0 0 0 rgba(0,166,81,.35)' }, '70%': { boxShadow: '0 0 0 12px rgba(0,166,81,0)' } },
        numTick:      { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        checkPop:     { '0%': { transform: 'scale(0)' }, '60%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
        confettiFall: { '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: 1 }, '100%': { transform: 'translateY(80px) rotate(400deg)', opacity: 0 } },
        barGrow:      { from: { width: '0%' }, to: { width: 'var(--target-width)' } },
      },
      boxShadow: {
        card:   '0 2px 12px rgba(0,0,0,.06)',
        modal:  '0 20px 60px rgba(0,0,0,.18)',
        glow:   '0 6px 24px rgba(0,166,81,.30)',
        trust:  '0 6px 24px rgba(0,71,171,.25)',
      },
    },
  },
  plugins: [],
};
