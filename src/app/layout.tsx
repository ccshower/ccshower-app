import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { PwaProvider } from "@/components/layout/pwa-provider";

import "./globals.css";

const jost = localFont({
  src: "../fonts/jost-latin.woff2",
  weight: "300 600",
  style: "normal",
  variable: "--font-body",
  display: "swap",
});

const cormorant = localFont({
  src: [
    {
      path: "../fonts/cormorant-normal-latin.woff2",
      weight: "300 600",
      style: "normal",
    },
    {
      path: "../fonts/cormorant-italic-latin.woff2",
      weight: "300 600",
      style: "italic",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CCSHOWER",
  description: "CCSHOWER operational system",
  applicationName: "CCSHOWER",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CCSHOWER",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1f2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${cormorant.variable}`}
    >
      <body className="min-h-dvh font-sans text-base font-light text-cc-ink antialiased">
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
