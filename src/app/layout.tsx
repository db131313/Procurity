import type { Metadata, Viewport } from "next";
import { SiteProviders } from "@/components/SiteProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Procurity — Find your next sign job before anyone else does",
  description:
    "Procurity shows sign makers and trade salespeople which new construction projects are ready to buy right now, who to contact, and helps them measure, quote, and get paid in one place.",
  applicationName: "Procurity",
  openGraph: {
    title: "Procurity — Find your next sign job before anyone else does",
    description:
      "See which projects are ready to buy, who to call, and go from lead to paid deposit in one place.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Procurity — Find your next sign job before anyone else does",
    description:
      "See which projects are ready to buy, who to call, and go from lead to paid deposit in one place.",
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
  themeColor: "#0B0F19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
      </head>
      <body
        className="min-h-full font-sans"
        style={{ ["--font-satoshi" as string]: "'Satoshi', ui-sans-serif, system-ui, sans-serif" }}
      >
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
