import type { Metadata, Viewport } from "next";
import { SiteProviders } from "@/components/SiteProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Procurity.Pro — Find the next job before they need you",
  description:
    "Construction project intelligence for signage sales. Live permit activity scored into Buy Scores, maps, and pipeline — mobile-first.",
  applicationName: "Procurity",
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
