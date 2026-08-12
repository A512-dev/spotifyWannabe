import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/providers/AppProviders";
import { PwaRegistration } from "@/components/PwaRegistration";
import "@fontsource-variable/manrope";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpotifyWannaBe",
  description: "Full-stack Spotify-like streaming service built with Next.js and Django REST Framework.",
  applicationName: "SpotifyWannaBe",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpotifyWannaBe"
  }
};

export const viewport: Viewport = {
  themeColor: "#121212"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="ltr" lang="en" suppressHydrationWarning>
      <body>
        <PwaRegistration />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
