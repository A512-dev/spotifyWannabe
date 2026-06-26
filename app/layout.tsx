import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoundWave",
  description: "Phase 1 frontend foundation for a Spotify-like streaming app."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

