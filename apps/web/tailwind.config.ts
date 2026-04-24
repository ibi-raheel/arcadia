import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Midnight Scriptorium palette + font families. Values mirror
// `design/kit/colors_and_type.css` (source of truth) and the inlined
// :root block in `app/globals.css`. Keep the three in sync — if a
// token is added to the design kit, add it to globals.css and here.

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Night
        night: '#050208',
        'night-2': '#0c0612',
        'night-deep': '#000000',

        // Desk (stained oak)
        desk: '#3a2614',
        'desk-warm': '#4a2f18',
        'desk-lit': '#6a421f',
        'desk-edge': '#1e1208',

        // Paper (vellum / parchment)
        vellum: '#e8d5a5',
        'vellum-2': '#d9c38a',
        'vellum-3': '#c4a971',
        'vellum-shadow': '#a98a52',
        parchment: '#d9bf88',
        'parchment-2': '#c8ac72',
        scroll: '#e3ce98',
        ledger: '#d4b984',

        // Lantern (hero warmth)
        lantern: '#ffb84a',
        'lantern-2': '#e69a2a',
        'lantern-core': '#ffde9b',
        flame: '#fff3c8',

        // Bronze (primary metal)
        bronze: '#8a6a3a',
        'bronze-hi': '#b88c52',
        'bronze-bright': '#d4a868',
        'bronze-deep': '#5a3f22',
        'bronze-dark': '#3e2a14',
        verdigris: '#5a7a5c',
        'verdigris-2': '#3e5c44',

        // Wax (blood / crimson)
        wax: '#8f2530',
        'wax-deep': '#5a1820',
        crimson: '#a8364a',
        oxblood: '#6d1a24',

        // Ink & gilt
        ink: '#140a05',
        'ink-soft': '#3a2418',
        'ink-faint': '#6e5544',
        'ink-quiet': '#8f7b68',
        'ink-blue': '#1f3147',
        'ink-red': '#8a2838',
        gilt: '#c9a14a',
        'gilt-hi': '#e8c876',
        'gilt-deep': '#8e6e28',

        // Leather
        leather: '#3a1c10',
        'leather-dark': '#1a0a06',
        cord: '#6a4a28',
      },
      fontFamily: {
        display: ['var(--font-display)', '"IM Fell English"', 'serif'],
        caps: ['var(--font-caps)', '"IM Fell English SC"', 'serif'],
        body: ['var(--font-body)', '"EB Garamond"', 'Georgia', 'serif'],
        script: ['var(--font-script)', '"Cormorant Garamond"', 'serif'],
        hand: ['var(--font-hand)', 'Caveat', 'cursive'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        hair: '2px',
        card: '3px',
        soft: '8px',
        pill: '30px',
      },
      boxShadow: {
        page: '0 18px 36px rgba(0, 0, 0, 0.55)',
        lift: '0 24px 46px rgba(0, 0, 0, 0.62)',
        float: '0 14px 26px rgba(0, 0, 0, 0.55)',
        sunk: 'inset 0 0 60px rgba(140, 100, 40, 0.22)',
        press: 'inset 0 -4px 10px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [typography],
};
export default config;
