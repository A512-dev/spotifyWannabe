import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

// Static metadata is emitted by Next.js for every route in this application.
export const metadata: Metadata = {
  title: "SpotifyWannaBe",
  description: "Phase 1 frontend foundation for a Spotify-like streaming app."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* All pages share settings, authentication, and player context. */}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
