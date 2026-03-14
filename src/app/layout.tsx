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
        <link rel="stylesheet" href="https://use.typekit.net/lmm5jjk.css" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
