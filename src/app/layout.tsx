import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { SiteProviders } from "@/components/SiteProviders";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Procurity — Find your next job before anyone else does",
  description:
    "See which new construction projects are ready to buy, who to contact, and go from lead to paid deposit in one place. Built for sales teams that sell to new construction.",
  applicationName: "Procurity",
  openGraph: {
    title: "Procurity — Find your next job before anyone else does",
    description:
      "See which new construction projects are ready to buy, who to contact, and go from lead to paid deposit in one place.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Procurity — Find your next job before anyone else does",
    description:
      "See which new construction projects are ready to buy, who to contact, and go from lead to paid deposit in one place.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Procurity",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF7F0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${GeistSans.variable} ${instrument.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
      </head>
      <body
        className={`${GeistSans.className} min-h-full`}
        style={
          {
            ["--font-geist-sans" as string]: "var(--font-geist-sans)",
          } as React.CSSProperties
        }
      >
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
