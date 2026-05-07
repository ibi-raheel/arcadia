import type { Metadata } from 'next';
import {
  Caveat,
  Cormorant_Garamond,
  EB_Garamond,
  IM_Fell_English,
  IM_Fell_English_SC,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';
import './scriptorium.css';

import { AmbientMusic } from '@/components/audio/AmbientMusic';
import { SimulationPill } from '@/components/scriptorium/simulation';

// Midnight Scriptorium — six faces. Each binds to its --font-* CSS variable
// consumed by globals.css + Tailwind utilities (`font-display`, etc). Weights
// minimal — we mostly italicize / letter-space the Regular cut. See
// design/kit/colors_and_type.css for the canonical list.
const imFellDisplay = IM_Fell_English({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});
const imFellCaps = IM_Fell_English_SC({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-caps',
  display: 'swap',
});
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-script',
  display: 'swap',
});
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hand',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arcadia',
  description: '2.5D isometric virtual world for creators and their communities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    imFellDisplay.variable,
    imFellCaps.variable,
    ebGaramond.variable,
    cormorant.variable,
    caveat.variable,
    jetbrainsMono.variable,
  ].join(' ');

  return (
    <html lang="en">
      <body className={`${fontVars} antialiased`}>
        {children}
        {/* Sibling-of-children placement so the audio element survives
            every client-side navigation (root layout doesn't unmount).
            The component itself paths-gates: silent on /login, /signup,
            /onboarding/*; plays elsewhere. */}
        <AmbientMusic />
        {/* Simulation toggle pill — fixed bottom-left, always-visible
            on post-auth routes. Path-gates internally to skip /login,
            /signup, /onboarding/*. Flipping it spawns / despawns the
            demo NPC swarm in every Phaser scene, plus drives the
            existing dashboard fixture-vs-real fork. */}
        <SimulationPill />
      </body>
    </html>
  );
}
