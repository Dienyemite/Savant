import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savant — Deep Learning for Young Minds",
  description:
    "A next-generation EdTech platform that prioritizes deep learning, sustained focus, active problem-solving, and cross-disciplinary interconnection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/lmm5jjk.css" />
      </head>
      <body className="antialiased">
        {/*
          SVG filter definitions — hidden, zero-size, referenced by CSS.
          Provides the feTurbulence noise filter used for the paper grain
          texture mandated by the Endless Monochrome Notebook specification.
        */}
        <svg
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <defs>
            <filter id="paper-noise" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="4"
                stitchTiles="stitch"
                result="noise"
              />
              <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
              <feBlend in="SourceGraphic" in2="mono" mode="screen" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
