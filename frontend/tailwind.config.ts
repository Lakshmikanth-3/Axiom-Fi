import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['Space Grotesk', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        'bg-base':     '#050810',
        'bg-surface':  '#080d1a',
        'bg-elevated': '#0d1425',
        'border-dim':  '#1a2440',
        'border-acc':  '#1e3a6e',
        'blue-primary':'#2563eb',
        'blue-bright': '#3b82f6',
        'blue-glow':   '#60a5fa',
        'blue-dim':    '#1d4ed8',
        'txt-primary': '#f0f4ff',
        'txt-second':  '#8ba3cc',
        'txt-muted':   '#4a6088',
        'txt-mono':    '#7dd3fc',
        'rep-bronze':  '#cd7f32',
        'rep-silver':  '#94a3b8',
        'rep-gold':    '#f59e0b',
        'rep-axiom':   '#60a5fa',
      },
      animation: {
        'mesh-shift':   'meshShift 8s ease-in-out infinite alternate',
        'pulse-border': 'activePulse 2s ease-in-out infinite',
        'axiom-glow':   'axiomGlow 3s ease-in-out infinite',
        'feed-in':      'feedIn 0.3s ease-out',
        'fade-up':      'fadeUp 0.5s ease-out',
        'cursor-blink': 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
}

export default config
